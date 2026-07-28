import type { Client, ClientDetail, DashboardData } from '@/types/commercial'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { AnalyticsResult, ImportStats } from '@/services/cteAnalytics'
import { parseAndAnalyzeInWorker } from '@/services/importRunner'

const STORAGE_KEY = 'raca_comercial_analytics_v3'
const SEED_JSON_URL = '/data/analytics-seed.json'
const SEED_XLSX_URL = '/data/base-fat-raca.xlsx'

interface PersistedPayload {
  version: 2
  stats: ImportStats
  clients: Client[]
  dashboard: DashboardData
  clientDetails: Record<string, ClientDetail>
}

function loadPersisted (): PersistedPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as PersistedPayload
    if (data?.version !== 2 || !data.dashboard || !data.clients?.length) return null
    return data
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

function applyResult (
  result: AnalyticsResult,
  setters: {
    clients: { value: Client[] }
    dashboard: { value: DashboardData | null }
    stats: { value: ImportStats | null }
    clientDetails: { value: Record<string, ClientDetail> }
    ready: { value: boolean }
  },
) {
  setters.clients.value = result.clients
  setters.dashboard.value = result.dashboard
  setters.stats.value = result.stats
  setters.clientDetails.value = result.clientDetails
  setters.ready.value = true
  persist({
    version: 2,
    stats: result.stats,
    clients: result.clients,
    dashboard: result.dashboard,
    clientDetails: result.clientDetails,
  })
}

export const useCommercialStore = defineStore('commercial', () => {
  const clients = ref<Client[]>([])
  const dashboard = ref<DashboardData | null>(null)
  const stats = ref<ImportStats | null>(null)
  const clientDetails = shallowRef<Record<string, ClientDetail>>({})
  const loading = ref(false)
  const importing = ref(false)
  const error = ref<string | null>(null)
  const progress = ref('')
  const ready = ref(false)

  let loadPromise: Promise<void> | null = null

  const hasData = computed(() => !!dashboard.value && clients.value.length > 0)

  async function loadSeedJson (): Promise<boolean> {
    progress.value = 'Carregando indicadores...'
    const response = await fetch(SEED_JSON_URL)
    if (!response.ok) return false
    const data = await response.json() as PersistedPayload
    if (!data?.dashboard || !data.clients?.length) return false

    clients.value = data.clients
    dashboard.value = data.dashboard
    stats.value = data.stats
    clientDetails.value = data.clientDetails || {}
    ready.value = true
    persist({
      version: 2,
      stats: data.stats,
      clients: data.clients,
      dashboard: data.dashboard,
      clientDetails: data.clientDetails || {},
    })
    return true
  }

  async function loadSeedXlsx () {
    progress.value = 'Processando planilha seed...'
    const response = await fetch(SEED_XLSX_URL)
    if (!response.ok) throw new Error(`Falha ao carregar planilha (${response.status})`)
    const buffer = await response.arrayBuffer()
    const result = await parseAndAnalyzeInWorker(buffer, 'base-fat-raca.xlsx (seed)')
    applyResult(result, { clients, dashboard, stats, clientDetails, ready })
  }

  async function ensureLoaded () {
    if (ready.value && hasData.value) return
    if (loadPromise) return loadPromise

    loadPromise = (async () => {
      loading.value = true
      error.value = null
      try {
        const cached = loadPersisted()
        if (cached) {
          clients.value = cached.clients
          dashboard.value = cached.dashboard
          stats.value = cached.stats
          clientDetails.value = cached.clientDetails || {}
          ready.value = true
          return
        }

        const fromJson = await loadSeedJson().catch(() => false)
        if (fromJson) return

        await loadSeedXlsx()
      } catch (error_) {
        error.value = error_ instanceof Error ? error_.message : 'Erro ao carregar base'
      } finally {
        loading.value = false
        progress.value = ''
        loadPromise = null
      }
    })()

    return loadPromise
  }

  async function importFromUrl (url: string, sourceName: string) {
    importing.value = true
    error.value = null
    progress.value = 'Lendo planilha...'
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Falha ao carregar planilha (${response.status})`)
      progress.value = 'Processando em segundo plano...'
      const buffer = await response.arrayBuffer()
      const result = await parseAndAnalyzeInWorker(buffer, sourceName)
      applyResult(result, { clients, dashboard, stats, clientDetails, ready })
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
      const buffer = await file.arrayBuffer()
      progress.value = 'Processando em segundo plano...'
      const result = await parseAndAnalyzeInWorker(buffer, file.name)
      applyResult(result, { clients, dashboard, stats, clientDetails, ready })
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
    const cached = clientDetails.value[id]
    if (cached) return cached

    const client = clients.value.find(c => c.id === id)
    if (!client || !dashboard.value) return undefined

    return {
      ...client,
      historicoFaturamento: [],
      produtos: [client.segmento],
      rotas: [],
      destinatarios: 0,
      embarquesMes: client.frequenciaEmbarques,
      movimentacoes: [],
      insights: [{
        id: `ins-${id}-basic`,
        titulo: 'Resumo do cliente',
        descricao: `Health ${client.healthScore} · risco ${(client.probabilidadePerda * 100).toFixed(0)}% · ${client.diasSemEmbarque} dias sem embarque.`,
        tipo: 'explicacao',
        clienteId: id,
        createdAt: new Date().toISOString(),
      }],
      recomendacoes: dashboard.value.recomendacoes.filter(r => r.clienteId === id),
    }
  }

  function clearCache () {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('raca_comercial_analytics_v1')
    localStorage.removeItem('raca_comercial_analytics_v2')
    clients.value = []
    dashboard.value = null
    stats.value = null
    clientDetails.value = {}
    ready.value = false
  }

  return {
    clients,
    dashboard,
    stats,
    clientDetails,
    loading,
    importing,
    error,
    progress,
    ready,
    hasData,
    ensureLoaded,
    importFromFile,
    importFromUrl,
    getDashboard,
    getClients,
    getClientDetail,
    clearCache,
  }
})
