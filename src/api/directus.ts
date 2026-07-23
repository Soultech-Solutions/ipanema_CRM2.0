import type {
  Alert,
  Client,
  ClientDetail,
  DashboardData,
  Recommendation,
  Seller,
} from '@/types/commercial'
import axios from 'axios'
import {
  alerts,
  clients,
  getClientDetail,
  mockDashboard,
  recommendations,
  sellers,
} from '@/data/mock'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'
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

export async function fetchDashboard (): Promise<DashboardData> {
  if (useMock) {
    await delay(300)
    return structuredClone(mockDashboard)
  }

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

export async function fetchClients (): Promise<Client[]> {
  if (useMock) {
    await delay(200)
    return structuredClone(clients)
  }
  return fromDirectus<Client>('clientes')
}

export async function fetchClientById (id: string): Promise<ClientDetail | undefined> {
  if (useMock) {
    await delay(250)
    return getClientDetail(id)
  }
  const { data } = await directus.get(`/items/clientes/${id}`, {
    params: {
      fields: ['*', 'historico_faturamento.*', 'movimentacoes.*', 'insights.*', 'recomendacoes.*'],
    },
  })
  return data.data as ClientDetail
}

export async function fetchSellers (): Promise<Seller[]> {
  if (useMock) {
    await delay(200)
    return structuredClone(sellers)
  }
  return fromDirectus<Seller>('vendedores')
}

export async function fetchAlerts (): Promise<Alert[]> {
  if (useMock) {
    await delay(150)
    return structuredClone(alerts)
  }
  return fromDirectus<Alert>('alertas')
}

export async function fetchRecommendations (): Promise<Recommendation[]> {
  if (useMock) {
    await delay(150)
    return structuredClone(recommendations)
  }
  return fromDirectus<Recommendation>('recomendacoes')
}

function delay (ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
