export interface MailAttachment {
  filename: string
  contentType: string
  size: number
  content: Buffer
}

export interface IncomingMail {
  /** Id no provedor (UID IMAP / id Graph) — usado para marcar como lido/mover */
  providerId: string
  messageId: string
  from: string
  fromName: string | null
  to: string[]
  subject: string
  text: string
  receivedAt: Date | null
  attachments: MailAttachment[]
}

export interface ProductSummary {
  id: string
  codigo: string
  codigo_sap?: string | null
  descricao: string | null
  marca: string | null
  unidade: string | null
  preco: number | null
  custo?: number | null
  estoque: number | null
  atributos?: Record<string, unknown> | null
}

export interface ProductSearchInput {
  query?: string
  codigo?: string
  marca?: string
  limit?: number
}

export interface ClientSummary {
  id: string
  codigo: string | null
  nome: string
  vendedorId: string | null
  vendedorNome: string | null
}

export interface ClientSearchInput {
  email_domain?: string
  nome?: string
}

export interface ProductRepository {
  search: (input: ProductSearchInput) => Promise<ProductSummary[]>
  getByIds: (ids: string[]) => Promise<ProductSummary[]>
}

export interface ClientRepository {
  find: (input: ClientSearchInput) => Promise<ClientSummary[]>
}

export type MatchStatus = 'encontrado' | 'ambiguo' | 'nao_encontrado'

export interface StoredAttachment {
  nome: string
  tipo: string
  tamanho: number
  arquivo: string | null
}
