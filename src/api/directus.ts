import type {
  Alert,
  Client,
  ClientDetail,
  DashboardData,
  Recommendation,
  Seller,
} from '@/types/commercial'
import { sellers as mockSellers } from '@/data/mock'
import { useCommercialStore } from '@/stores/commercial'
import { directus } from '@/api/directusClient'

export { directus }

const useDirectus = import.meta.env.VITE_USE_MOCK === 'false'

async function fromDirectus<T> (collection: string, params?: Record<string, unknown>): Promise<T[]> {
  const { data } = await directus.get(`/items/${collection}`, { params })
  return data.data as T[]
}

/** Clona dados plain (evita falha do structuredClone em Proxy do Vue/Pinia). */
function cloneData<T> (value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

async function withLocalData<T> (fn: (store: ReturnType<typeof useCommercialStore>) => T | Promise<T>): Promise<T> {
  const store = useCommercialStore()
  await store.ensureLoaded()
  return fn(store)
}

interface DirectusCliente extends Omit<Client, 'id'> {
  id: string
  codigo?: string
}

function mapCliente (row: DirectusCliente): Client {
  return {
    ...row,
    id: row.codigo || row.id,
  }
}

function mapClienteDetail (row: DirectusCliente & Record<string, unknown>): ClientDetail {
  const base = mapCliente(row)
  const historico = (row.historicoFaturamento
    || row.historico_faturamento
    || []) as ClientDetail['historicoFaturamento']
  const movimentacoes = (row.movimentacoes || []) as ClientDetail['movimentacoes']
  const insights = ((row.insights || []) as ClientDetail['insights']).map(ins => ({
    ...ins,
    clienteId: ins.clienteId ? base.id : undefined,
  }))
  const recomendacoes = ((row.recomendacoes || []) as ClientDetail['recomendacoes']).map(rec => ({
    ...rec,
    clienteId: rec.clienteId ? base.id : undefined,
  }))

  return {
    ...base,
    historicoFaturamento: historico,
    movimentacoes,
    insights,
    recomendacoes,
    produtos: (row.produtos as string[]) || [],
    rotas: (row.rotas as string[]) || [],
    destinatarios: Number(row.destinatarios || 0),
    embarquesMes: Number(row.embarquesMes || base.frequenciaEmbarques),
  }
}

export async function fetchDashboard (): Promise<DashboardData> {
  if (useDirectus) {
    const kpisRows = await fromDirectus<{
      saude_carteira: number
      receita_em_risco: number
      receita_potencial: number
      eficiencia_comercial: number
      crescimento_sustentavel: number
      cii: number
    }>('dashboard_kpis')

    const kpis = Array.isArray(kpisRows) ? kpisRows[0] : kpisRows
    if (!kpis) {
      throw new Error('dashboard_kpis vazio — importe uma planilha LOG FALA em Base de Dados')
    }

    const [insights, recomendacoes, alertas, clientesRisco, aiModules] = await Promise.all([
      fromDirectus('insights', { filter: { clienteId: { _null: true } } }),
      fromDirectus('recomendacoes'),
      fromDirectus('alertas'),
      fromDirectus<DirectusCliente>('clientes', {
        filter: { status: { _in: ['risco', 'inativo'] } },
        limit: 12,
        sort: ['-receitaEmRisco'],
      }),
      fromDirectus('ai_modules'),
    ])

    return {
      kpis: {
        saudeCarteira: kpis.saude_carteira,
        receitaEmRisco: kpis.receita_em_risco,
        receitaPotencial: kpis.receita_potencial,
        eficienciaComercial: kpis.eficiencia_comercial,
        crescimentoSustentavel: kpis.crescimento_sustentavel,
        cii: kpis.cii,
      },
      insights: insights as DashboardData['insights'],
      recomendacoes: recomendacoes as Recommendation[],
      alertas: alertas as Alert[],
      clientesRisco: clientesRisco.map(mapCliente),
      aiModules: aiModules as DashboardData['aiModules'],
    }
  }

  return withLocalData(store => {
    const data = store.getDashboard()
    if (!data) throw new Error('Base comercial ainda não carregada')
    return cloneData(data)
  })
}

export async function fetchClients (): Promise<Client[]> {
  if (useDirectus) {
    const rows = await fromDirectus<DirectusCliente>('clientes', {
      limit: -1,
      sort: ['-receitaAnual'],
    })
    return rows.map(mapCliente)
  }
  return withLocalData(store => cloneData(store.getClients()))
}

export async function fetchClientById (id: string): Promise<ClientDetail | undefined> {
  if (useDirectus) {
    // Prefer lookup by business codigo; fall back to Directus UUID
    const { data: byCodigo } = await directus.get('/items/clientes', {
      params: {
        filter: { codigo: { _eq: id } },
        fields: ['*', 'historico_faturamento.*', 'movimentacoes.*', 'insights.*', 'recomendacoes.*'],
        limit: 1,
      },
    })
    const fromCodigo = (byCodigo.data as DirectusCliente[] | undefined)?.[0]
    if (fromCodigo) return mapClienteDetail(fromCodigo as DirectusCliente & Record<string, unknown>)

    try {
      const { data } = await directus.get(`/items/clientes/${id}`, {
        params: {
          fields: ['*', 'historico_faturamento.*', 'movimentacoes.*', 'insights.*', 'recomendacoes.*'],
        },
      })
      if (!data.data) return undefined
      return mapClienteDetail(data.data as DirectusCliente & Record<string, unknown>)
    } catch {
      return undefined
    }
  }

  return withLocalData(async store => {
    if (!store.ctes.length) await store.hydrateCtesFromSeed()
    const detail = store.getClientDetail(id)
    return detail ? cloneData(detail) : undefined
  })
}

export async function fetchSellers (): Promise<Seller[]> {
  if (useDirectus) return fromDirectus<Seller>('vendedores')
  // Base LOG FALA não possui vendedor — placeholder até fonte complementar
  return cloneData(mockSellers)
}

export async function fetchAlerts (): Promise<Alert[]> {
  if (useDirectus) return fromDirectus<Alert>('alertas')
  return withLocalData(store => cloneData(store.getDashboard()?.alertas ?? []))
}

export async function fetchRecommendations (): Promise<Recommendation[]> {
  if (useDirectus) return fromDirectus<Recommendation>('recomendacoes')
  return withLocalData(store => cloneData(store.getDashboard()?.recomendacoes ?? []))
}

export function isDirectusMode (): boolean {
  return useDirectus
}
