/** Contrato do endpoint custom Directus: Analista Comercial */

export interface AnalystSource {
  type: 'cliente' | 'kpi' | 'alerta' | 'recomendacao' | 'cte' | 'outro'
  id?: string
  label: string
}

export interface AnalystSuggestedAction {
  label: string
  /** Rota interna do front, ex.: /clientes/cli-xxx */
  route?: string
  prioridade?: 'alta' | 'media' | 'baixa'
}

export interface AnalystAskRequest {
  question: string
  conversationId?: string
  context?: {
    clienteId?: string
  }
}

export interface AnalystAskResponse {
  answer: string
  conversationId: string
  sources?: AnalystSource[]
  suggestedActions?: AnalystSuggestedAction[]
  /** Metadados do motor (Claude/GPT) — opcional */
  model?: string
  latencyMs?: number
}

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  sources?: AnalystSource[]
  suggestedActions?: AnalystSuggestedAction[]
  pending?: boolean
  error?: boolean
}
