export type SourceType = 'cliente' | 'kpi' | 'alerta' | 'recomendacao' | 'cte' | 'outro'

export interface AnalystSource {
  type: SourceType
  id?: string
  label: string
}

export interface AnalystSuggestedAction {
  label: string
  route?: string
  prioridade?: 'alta' | 'media' | 'baixa'
}

export interface AskInput {
  question: string
  conversationId?: string
  context?: {
    clienteId?: string
  }
  userId: string
}

export interface AskOutput {
  answer: string
  conversationId: string
  sources: AnalystSource[]
  suggestedActions: AnalystSuggestedAction[]
  model: string
  latencyMs?: number
}

export interface BaselineKpis {
  saudeCarteira: number
  receitaEmRisco: number
  receitaPotencial: number
  eficienciaComercial: number
  crescimentoSustentavel: number
  cii: number
}

export interface BaselineClientSummary {
  id: string
  nome: string
  regiao?: string
  healthScore?: number
  receitaEmRisco?: number
  receitaPotencial?: number
  probabilidadePerda?: number
  diasSemEmbarque?: number
  status?: string
}

export interface BaselineContext {
  generatedAt: string
  kpis: BaselineKpis | null
  stats: { totalCtes: number, totalClientes: number } | null
  topRisco: BaselineClientSummary[]
  topPotencial: BaselineClientSummary[]
  alertasAbertos: Array<{ id: string, titulo: string, severidade: string }>
  scopedClient?: Record<string, unknown> | null
  notes?: string[]
}

export interface ChatMessageRow {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}
