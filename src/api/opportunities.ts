import type {
  InboxEmail,
  InboxEmailStatus,
  InboxSyncSummary,
  Opportunity,
  OpportunityItem,
  OpportunityListItem,
  OpportunityStage,
  Product,
  ProductImportResult,
} from '@/types/opportunity'
import { directus } from '@/api/directusClient'

/** Oportunidades, emails e produtos só existem no Directus (sem mock local). */
export const opportunitiesEnabled = import.meta.env.VITE_USE_MOCK === 'false'

const EXT = '/email-oportunidades'
const PRODUCT_FIELDS = 'id,codigo,codigo_sap,descricao,marca,unidade,preco,custo,icms,pis_cofins,estoque,fonte,atualizado_em'

async function items<T> (collection: string, params: Record<string, unknown>): Promise<T[]> {
  const { data } = await directus.get(`/items/${collection}`, { params })
  return data.data as T[]
}

export async function fetchOpportunities (): Promise<OpportunityListItem[]> {
  return items<OpportunityListItem>('oportunidades', {
    fields: 'id,titulo,cliente_nome,etapa,origem,valor_estimado,prazo_entrega,confianca,created_at,updated_at,itens.status_match',
    sort: '-created_at',
    limit: 500,
  })
}

export async function fetchOpportunity (id: string): Promise<Opportunity> {
  const { data } = await directus.get(`/items/oportunidades/${id}`, {
    params: {
      fields: [
        '*',
        'cliente.id',
        'cliente.codigo',
        'cliente.nome',
        'vendedor.id',
        'vendedor.nome',
        'email.*',
        'itens.*',
        ...PRODUCT_FIELDS.split(',').map(f => `itens.produto.${f}`),
      ].join(','),
      deep: JSON.stringify({ itens: { _sort: ['ordem'] } }),
    },
  })
  return data.data as Opportunity
}

export async function updateOpportunity (id: string, patch: Partial<Pick<Opportunity, 'etapa' | 'valor_estimado' | 'observacoes' | 'prazo_entrega'>>) {
  await directus.patch(`/items/oportunidades/${id}`, patch)
}

export async function updateOpportunityStage (id: string, etapa: OpportunityStage) {
  await updateOpportunity(id, { etapa })
}

export async function updateOpportunityItem (
  id: string,
  patch: Partial<Pick<OpportunityItem, 'quantidade' | 'preco_unitario' | 'subtotal' | 'confianca' | 'status_match'>> & { produto?: string | null },
): Promise<void> {
  await directus.patch(`/items/oportunidade_itens/${id}`, patch)
}

export async function fetchInboxEmails (): Promise<InboxEmail[]> {
  return items<InboxEmail>('emails_recebidos', {
    fields: '*',
    sort: '-recebido_em,-created_at',
    limit: 200,
  })
}

export async function updateInboxEmailStatus (id: string, status: InboxEmailStatus) {
  await directus.patch(`/items/emails_recebidos/${id}`, { status })
}

export async function syncInbox (): Promise<InboxSyncSummary> {
  const { data } = await directus.post<InboxSyncSummary>(`${EXT}/sync`)
  return data
}

export interface IngestHealth {
  pollingEnabled: boolean
  provider: 'imap' | 'o365'
  cron: string
  missingConfig: string[]
  priceMarkupPct?: number
  running: boolean
  lastRun: InboxSyncSummary | null
}

export async function fetchIngestHealth (): Promise<IngestHealth> {
  const { data } = await directus.get<IngestHealth>(`${EXT}/health`)
  return data
}

export async function reprocessEmail (emailId: string) {
  const { data } = await directus.post<{ status: string, opportunityId: string | null, itens: number }>(
    `${EXT}/emails/${emailId}/reprocess`,
  )
  return data
}

/** Mesmo critério do backend: `NK45/20`, `nk 45-20` e `NK 45/20` casam pelo código normalizado. */
function productSearchFilter (q: string) {
  const code = q.normalize('NFD').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return {
    _or: [
      { codigo: { _icontains: q } },
      { descricao: { _icontains: q } },
      { marca: { _icontains: q } },
      { codigo_sap: { _starts_with: q } },
      ...(code.length >= 2 ? [{ codigo_normalizado: { _contains: code } }] : []),
    ],
  }
}

export async function searchProducts (query: string, limit = 20): Promise<Product[]> {
  const q = query.trim()
  return items<Product>('produtos', {
    fields: PRODUCT_FIELDS,
    sort: 'codigo',
    limit,
    ...(q ? { filter: JSON.stringify(productSearchFilter(q)) } : {}),
  })
}

export async function countProducts (): Promise<number> {
  const { data } = await directus.get('/items/produtos', { params: { 'aggregate[count]': '*' } })
  return Number(data.data?.[0]?.count ?? 0)
}

/** Envia em lotes para respeitar o limite de payload do Directus. */
export async function importProducts (
  rows: Record<string, unknown>[],
  fonte: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ProductImportResult> {
  const total: ProductImportResult = { recebidos: 0, criados: 0, atualizados: 0, ignorados: 0, mapeamento: {}, colunasExtras: [] }
  const chunkSize = 500
  for (let i = 0; i < rows.length; i += chunkSize) {
    const { data } = await directus.post<ProductImportResult>(`${EXT}/produtos/import`, {
      rows: rows.slice(i, i + chunkSize),
      fonte,
    })
    total.recebidos += data.recebidos
    total.criados += data.criados
    total.atualizados += data.atualizados
    total.ignorados += data.ignorados
    total.mapeamento = data.mapeamento
    total.colunasExtras = data.colunasExtras
    onProgress?.(Math.min(i + chunkSize, rows.length), rows.length)
  }
  return total
}

/** URL para abrir um anexo salvo em directus_files. */
export function assetUrl (fileId: string, download = true): string {
  const base = (import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')
  const token = localStorage.getItem('directus_token') || import.meta.env.VITE_DIRECTUS_TOKEN || ''
  const params = new URLSearchParams()
  if (token) {
    params.set('access_token', token)
  }
  if (download) {
    params.set('download', '')
  }
  const qs = params.toString()
  return `${base}/assets/${fileId}${qs ? `?${qs}` : ''}`
}

export function apiErrorMessage (error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { errors?: { message?: string }[] } }, message?: string }
  return e?.response?.data?.errors?.[0]?.message || e?.message || fallback
}
