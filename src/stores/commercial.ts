import type { Client, ClientDetail, DashboardData } from '@/types/commercial'
import type { CteDocument } from '@/types/cte'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { analyzeCtes, buildClientDetail, type ImportStats } from '@/services/cteAnalytics'
import { fetchAndParseCteUrl, parseCteFile } from '@/services/cteParser'
import { isDirectusSyncEnabled, syncImportToDirectus } from '@/services/directusSync'

const STORAGE_KEY = 'raca_comercial_analytics_v3'
const SEED_URL = `${import.meta.env.BASE_URL}data/base-fat-raca.xlsx`

interface PersistedPayload {
  stats: ImportStats
  clients: Client[]
  dashboard: DashboardData
}

function loadPersisted (): PersistedPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedPayload
  } catch {
    return null
  }
}

function persist (payload: PersistedPayload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // quota — keep in memory only
  }
}

export const useCommercialStore = defineStore('commercial', () => {
  const ctes = shallowRef<CteDocument[]>([])
  const clients = ref<Client[]>([])
  const dashboard = ref<DashboardData | null>(null)
  const stats = ref<ImportStats | null>(null)
  const loading = ref(false)
  const importing = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)
  const progress = ref('')
  const ready = ref(false)
  const lastSyncAt = ref<string | null>(null)

  const hasData = computed(() => !!dashboard.value && clients.value.length > 0)
  const syncToDirectus = computed(() => isDirectusSyncEnabled())

  async function applyAnalytics (list: CteDocument[], sourceName: string) {
    progress.value = 'Calculando indicadores...'
    const result = analyzeCtes(list, sourceName)
    ctes.value = list
    clients.value = result.clients
    dashboard.value = result.dashboard
    stats.value = result.stats
    persist({
      stats: result.stats,
      clients: result.clients,
      dashboard: result.dashboard,
    })
    ready.value = true

    if (syncToDirectus.value) {
      syncing.value = true
      try {
        await syncImportToDirectus(
          { ctes: list, result },
          message => {
            progress.value = message
          },
        )
        lastSyncAt.value = new Date().toISOString()
      } catch (error_) {
        const message = error_ instanceof Error ? error_.message : 'Falha ao sincronizar com Directus'
        error.value = message
        throw error_
      } finally {
        syncing.value = false
      }
    }

    progress.value = ''
  }

  async function ensureLoaded () {
    if (ready.value && hasData.value) return
    loading.value = true
    error.value = null

    try {
      // Em modo Directus, a fonte da verdade é a API — não força seed local
      if (syncToDirectus.value) {
        ready.value = true
        return
      }

      const cached = loadPersisted()
      if (cached?.dashboard && cached.clients?.length) {
        clients.value = cached.clients
        dashboard.value = cached.dashboard
        stats.value = cached.stats
        ready.value = true
        void hydrateCtesFromSeed()
        return
      }

      await importFromUrl(SEED_URL, 'base-fat-raca.xlsx (seed)')
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'Erro ao carregar base'
    } finally {
      loading.value = false
    }
  }

  async function hydrateCtesFromSeed () {
    if (ctes.value.length) return
    try {
      progress.value = 'Carregando CT-es para detalhe...'
      const list = await fetchAndParseCteUrl(SEED_URL)
      ctes.value = list
    } catch {
      // detail will be limited without raw CT-es
    } finally {
      progress.value = ''
    }
  }

  async function importFromUrl (url: string, sourceName: string) {
    importing.value = true
    error.value = null
    progress.value = 'Lendo planilha...'
    try {
      const list = await fetchAndParseCteUrl(url)
      if (!list.length) throw new Error('Nenhum CT-e encontrado na planilha')
      await applyAnalytics(list, sourceName)
    } finally {
      importing.value = false
      progress.value = ''
    }
  }

  async function importFromFile (file: File) {
    importing.value = true
    error.value = null
    progress.value = `Importando ${file.name}...`
    try {
      const list = await parseCteFile(file)
      if (!list.length) {
        throw new Error('Nenhum CT-e válido encontrado. Verifique o layout LOG FALA.')
      }
      await applyAnalytics(list, file.name)
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'Falha no import'
      throw error_
    } finally {
      importing.value = false
      progress.value = ''
    }
  }

  function getDashboard (): DashboardData | null {
    return dashboard.value
  }

  function getClients (): Client[] {
    return clients.value
  }

  function getClientDetail (id: string): ClientDetail | undefined {
    const client = clients.value.find(c => c.id === id)
    if (!client || !dashboard.value) return undefined
    if (!ctes.value.length) {
      return {
        ...client,
        historicoFaturamento: [],
        produtos: [client.segmento],
        rotas: [],
        destinatarios: 0,
        embarquesMes: client.frequenciaEmbarques,
        movimentacoes: [],
        insights: [{
          id: `ins-${id}-loading`,
          titulo: 'Carregando histórico',
          descricao: 'Os CT-es ainda estão sendo hidratados. Reabra o cliente em instantes.',
          tipo: 'explicacao',
          clienteId: id,
          createdAt: new Date().toISOString(),
        }],
        recomendacoes: dashboard.value.recomendacoes.filter(r => r.clienteId === id),
      }
    }
    return buildClientDetail(client, ctes.value, dashboard.value)
  }

  function clearCache () {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('raca_comercial_analytics_v1')
    localStorage.removeItem('raca_comercial_analytics_v2')
    ctes.value = []
    clients.value = []
    dashboard.value = null
    stats.value = null
    ready.value = false
    lastSyncAt.value = null
  }

  return {
    ctes,
    clients,
    dashboard,
    stats,
    loading,
    importing,
    syncing,
    error,
    progress,
    ready,
    hasData,
    syncToDirectus,
    lastSyncAt,
    ensureLoaded,
    importFromFile,
    importFromUrl,
    getDashboard,
    getClients,
    getClientDetail,
    clearCache,
    hydrateCtesFromSeed,
  }
})
