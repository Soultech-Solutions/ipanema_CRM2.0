/** Coleções criadas pela extension email-oportunidades (ver docs/EMAIL_OPORTUNIDADES.md) */

export type OpportunityStage = 'novo' | 'preparando' | 'pronto' | 'aguardando' | 'followup'
export type MatchStatus = 'encontrado' | 'ambiguo' | 'nao_encontrado'
export type InboxEmailStatus = 'novo' | 'processando' | 'processado' | 'ignorado' | 'erro'

export const OPPORTUNITY_STAGES: { id: OpportunityStage, titulo: string }[] = [
  { id: 'novo', titulo: 'Novo pedido' },
  { id: 'preparando', titulo: 'Preparando cotação' },
  { id: 'pronto', titulo: 'Pronto para enviar' },
  { id: 'aguardando', titulo: 'Aguardando cliente' },
  { id: 'followup', titulo: 'Follow-up' },
]

export interface Product {
  id: string
  codigo: string
  codigo_sap?: string | null
  descricao: string | null
  marca: string | null
  unidade: string | null
  preco: number | null
  /** Último preço de compra (referência para formar o preço de venda) */
  custo?: number | null
  icms: number | null
  pis_cofins: number | null
  estoque: number | null
  fonte: string | null
  atualizado_em?: string | null
}

export interface ProductAlternative {
  id: string
  codigo: string
  descricao: string | null
  preco: number | null
}

export interface OpportunityItem {
  id: string
  oportunidade: string
  produto: Product | null
  texto_original: string | null
  quantidade: number
  unidade: string | null
  preco_unitario: number | null
  subtotal: number | null
  confianca: number | null
  status_match: MatchStatus
  alternativas: ProductAlternative[] | null
  ordem: number | null
}

export interface EmailAttachment {
  nome: string
  tipo: string
  tamanho: number
  arquivo: string | null
}

export interface EmailExtraction {
  is_quote_request: boolean
  motivo: string
  cliente: { id: string | null, nome: string | null }
  contato: { nome: string | null, email: string | null }
  prazo_entrega: string | null
  itens: { texto_original: string, quantidade: number, produto_id: string | null, confianca: number }[]
  observacoes: string | null
  modelo?: string
  anexos_ignorados?: string[]
}

export interface InboxEmail {
  id: string
  message_id: string
  provider: 'imap' | 'o365' | 'fixture'
  remetente: string
  remetente_nome: string | null
  assunto: string | null
  corpo_texto: string | null
  recebido_em: string | null
  anexos: EmailAttachment[] | null
  status: InboxEmailStatus
  classificacao: string | null
  erro: string | null
  extracao: EmailExtraction | null
  oportunidade: string | null
  created_at: string | null
}

export interface OpportunityListItem {
  id: string
  titulo: string
  cliente_nome: string | null
  etapa: OpportunityStage
  origem: 'email' | 'manual'
  valor_estimado: number | null
  prazo_entrega: string | null
  confianca: number | null
  created_at: string | null
  updated_at: string | null
  itens: { status_match: MatchStatus }[]
}

export interface Opportunity extends Omit<OpportunityListItem, 'itens'> {
  cliente: { id: string, codigo: string | null, nome: string } | null
  contato_nome: string | null
  contato_email: string | null
  email: InboxEmail | null
  vendedor: { id: string, nome: string } | null
  observacoes: string | null
  itens: OpportunityItem[]
}

export interface InboxSyncSummary {
  trigger: 'cron' | 'manual'
  startedAt: string
  finishedAt: string | null
  lidos: number
  processados: number
  ignorados: number
  duplicados: number
  erros: number
  skipped?: 'locked' | 'not_configured'
  error?: string
}

export interface ProductImportResult {
  recebidos: number
  criados: number
  atualizados: number
  ignorados: number
  mapeamento: Record<string, string>
  colunasExtras: string[]
}
