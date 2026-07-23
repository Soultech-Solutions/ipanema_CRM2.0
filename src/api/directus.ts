import type {
  Alert,
  Client,
  ClientDetail,
  DashboardData,
  Recommendation,
  Seller,
} from '@/types/commercial'
import axios from 'axios'
import { sellers as mockSellers } from '@/data/mock'
import { useCommercialStore } from '@/stores/commercial'

const useDirectus = import.meta.env.VITE_USE_MOCK === 'false'
const baseURL = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8055'

export const directus = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

directus.interceptors.request.use(config => {
  const token = localStorage.getItem('directus_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

async function fromDirectus<T> (collection: string, params?: Record<string, unknown>): Promise<T[]> {
  const { data } = await directus.get(`/items/${collection}`, { params })
  return data.data as T[]
}

/** Cópia leve — evita JSON.parse/stringify pesado no caminho crítico. */
function cloneData<T> (value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      // Proxy Vue — fallback
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}

async function withLocalData<T> (fn: (store: ReturnType<typeof useCommercialStore>) => T | Promise<T>): Promise<T> {
  const store = useCommercialStore()
  await store.ensureLoaded()
  return fn(store)
}

export async function fetchDashboard (): Promise<DashboardData> {
  if (useDirectus) {
    const [kpis] = await fromDirectus<{
      saude_carteira: number
      receita_em_risco: number
      receita_potencial: number
      eficiencia_comercial: number
      crescimento_sustentavel: number
      cii: number
    }>('dashboard_kpis')

    const [insights, recomendacoes, alertas, clientesRisco, aiModules] = await Promise.all([
      fromDirectus('insights'),
      fromDirectus('recomendacoes'),
      fromDirectus('alertas'),
      fromDirectus('clientes', { filter: { status: { _eq: 'risco' } } }),
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
      clientesRisco: clientesRisco as Client[],
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
  if (useDirectus) return fromDirectus<Client>('clientes')
  return withLocalData(store => cloneData(store.getClients()))
}

export async function fetchClientById (id: string): Promise<ClientDetail | undefined> {
  if (useDirectus) {
    const { data } = await directus.get(`/items/clientes/${id}`, {
      params: {
        fields: ['*', 'historico_faturamento.*', 'movimentacoes.*', 'insights.*', 'recomendacoes.*'],
      },
    })
    return data.data as ClientDetail
  }

  return withLocalData(async store => {
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
