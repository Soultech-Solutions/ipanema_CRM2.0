import type { Client, ClientDetail, DashboardData, Insight, Recommendation, Alert, AiModule } from '@/types/commercial'
import type { ClienteComercialRow } from '@/types/base-comercial'
import { directus } from '@/api/directusClient'
import type { AnalyticsResult, ImportStats } from '@/services/baseComercialAnalytics'

const BATCH_SIZE = 150

export type SyncProgress = (message: string) => void

function chunk<T> (items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

async function listIds (collection: string): Promise<string[]> {
  const ids: string[] = []
  let page = 1
  const limit = 500

  for (;;) {
    const { data } = await directus.get(`/items/${collection}`, {
      params: {
        fields: ['id'],
        limit,
        page,
      },
    })
    const rows = (data.data || []) as { id: string }[]
    if (!rows.length) break
    ids.push(...rows.map(r => r.id))
    if (rows.length < limit) break
    page += 1
  }

  return ids
}

async function clearCollection (collection: string, onProgress?: SyncProgress) {
  const ids = await listIds(collection)
  if (!ids.length) return

  const batches = chunk(ids, BATCH_SIZE)
  for (let i = 0; i < batches.length; i++) {
    onProgress?.(`Apagando ${collection} (${i + 1}/${batches.length})...`)
    await directus.delete(`/items/${collection}`, { data: batches[i] })
  }
}

async function createBatch (
  collection: string,
  items: Record<string, unknown>[],
  onProgress?: SyncProgress,
  label?: string,
): Promise<Record<string, unknown>[]> {
  if (!items.length) return []

  const created: Record<string, unknown>[] = []
  const batches = chunk(items, BATCH_SIZE)

  for (let i = 0; i < batches.length; i++) {
    onProgress?.(
      label
        ? `${label} (${i + 1}/${batches.length})...`
        : `Enviando ${collection} (${i + 1}/${batches.length})...`,
    )
    const { data } = await directus.post(`/items/${collection}`, batches[i])
    const rows = Array.isArray(data.data) ? data.data : [data.data]
    created.push(...(rows as Record<string, unknown>[]))
  }

  return created
}

function mapClient (client: Client, detail?: ClientDetail): Record<string, unknown> {
  return {
    codigo: client.id,
    nome: client.nome,
    documento: client.documento,
    segmento: client.segmento,
    grupoCliente: client.grupoCliente ?? null,
    vendedorNome: client.vendedorNome,
    healthScore: client.healthScore,
    receitaAnual: client.receitaAnual,
    probabilidadePerda: client.probabilidadePerda,
    receitaEmRisco: client.receitaEmRisco,
    receitaPotencial: client.receitaPotencial,
    ticketMedio: client.ticketMedio,
    taxaConversao: client.taxaConversao,
    frequenciaCompra: client.frequenciaCompra,
    diasSemCompra: client.diasSemCompra,
    status: client.status,
    destinatarios: detail?.destinatarios ?? 0,
    embarquesMes: detail?.embarquesMes ?? client.frequenciaCompra,
    produtos: detail?.produtos ?? [client.segmento],
    rotas: detail?.rotas ?? [],
  }
}

/**
 * Envia a linha bruta do cliente (equivalente ao antigo mapCte, mas para o
 * grain de 1-linha-por-cliente da Base Teste, não 1-linha-por-CT-e).
 */
function mapClienteRow (row: ClienteComercialRow): Record<string, unknown> {
  return {
    codCliente: row.codCliente,
    razaoSocial: row.razaoSocial,
    segmento: row.segmento,
    vendedor: row.vendedor,
    representante: row.representante,
    ultimaCompra: row.ultimaCompra,
    dataCadastro: row.dataCadastro,
    status: row.status,
    cidade: row.cidade,
    uf: row.uf,
    tipoEstabelecimento: row.tipoEstabelecimento,
    origemCliente: row.origemCliente,
    // Directus não aceita bem objetos aninhados dinâmicos em campo simples —
    // grava como JSON. Se preferir colunas separadas por mês/ano, isso vira
    // uma collection própria (linhas_comerciais_mensal) — falar com o Marcos.
    mensal: JSON.stringify(row.mensal),
    anual: JSON.stringify(row.anual),
  }
}

async function upsertDashboardKpis (dashboard: DashboardData, onProgress?: SyncProgress) {
  onProgress?.('Atualizando KPIs executivos...')
  const payload = {
    saude_carteira: dashboard.kpis.saudeCarteira,
    receita_em_risco: dashboard.kpis.receitaEmRisco,
    receita_potencial: dashboard.kpis.receitaPotencial,
    eficiencia_comercial: dashboard.kpis.eficienciaComercial,
    crescimento_sustentavel: dashboard.kpis.crescimentoSustentavel,
    cii: dashboard.kpis.cii,
  }

  try {
    await directus.patch('/items/dashboard_kpis', payload)
  } catch {
    await directus.post('/items/dashboard_kpis', payload)
  }
}

export interface SyncImportInput {
  rows: ClienteComercialRow[]
  result: AnalyticsResult
}

export interface SyncImportResult {
  stats: ImportStats
  clientesCriados: number
  linhasCriadas: number
}

/**
 * Full replace of analytical + transactional layers in Directus after a
 * Base Teste import.
 */
export async function syncImportToDirectus (
  input: SyncImportInput,
  onProgress?: SyncProgress,
): Promise<SyncImportResult> {
  const { rows, result } = input
  const { clients, dashboard, clientDetails, stats } = result

  const replaceOrder = [
    'historico_faturamento',
    'movimentacoes',
    'insights',
    'recomendacoes',
    'alertas',
    'ai_modules',
    'linhas_comerciais',
    'clientes',
  ]

  for (const collection of replaceOrder) {
    await clearCollection(collection, onProgress)
  }

  onProgress?.('Enviando clientes...')
  const createdClients = await createBatch(
    'clientes',
    clients.map(c => mapClient(c, clientDetails[c.id])),
    onProgress,
    'Enviando clientes',
  )

  const codigoToUuid = new Map<string, string>()
  for (const row of createdClients) {
    const codigo = String(row.codigo || '')
    const id = String(row.id || '')
    if (codigo && id) codigoToUuid.set(codigo, id)
  }

  const historico: Record<string, unknown>[] = []
  const movimentacoes: Record<string, unknown>[] = []
  const clientInsights: Record<string, unknown>[] = []

  for (const client of clients) {
    const uuid = codigoToUuid.get(client.id)
    if (!uuid) continue
    const detail = clientDetails[client.id]
    if (!detail) continue

    for (const h of detail.historicoFaturamento) {
      historico.push({
        clienteId: uuid,
        mes: h.mes,
        valor: h.valor,
        meta: h.meta ?? null,
      })
    }

    for (const m of detail.movimentacoes) {
      movimentacoes.push({
        clienteId: uuid,
        data: m.data,
        titulo: m.titulo,
        descricao: m.descricao,
        tipo: m.tipo,
      })
    }

    for (const ins of detail.insights) {
      clientInsights.push({
        titulo: ins.titulo,
        descricao: ins.descricao,
        tipo: ins.tipo,
        clienteId: uuid,
        createdAt: ins.createdAt,
      })
    }
  }

  await createBatch('historico_faturamento', historico, onProgress, 'Enviando histórico')
  await createBatch('movimentacoes', movimentacoes, onProgress, 'Enviando movimentações')

  const globalInsights = dashboard.insights.map((ins: Insight) => ({
    titulo: ins.titulo,
    descricao: ins.descricao,
    tipo: ins.tipo,
    clienteId: ins.clienteId ? codigoToUuid.get(ins.clienteId) ?? null : null,
    createdAt: ins.createdAt,
  }))

  await createBatch(
    'insights',
    [...globalInsights, ...clientInsights],
    onProgress,
    'Enviando insights',
  )

  await createBatch(
    'recomendacoes',
    dashboard.recomendacoes.map((r: Recommendation) => ({
      titulo: r.titulo,
      descricao: r.descricao,
      prioridade: r.prioridade,
      status: r.status,
      clienteId: r.clienteId ? codigoToUuid.get(r.clienteId) ?? null : null,
      clienteNome: r.clienteNome ?? null,
      acao: r.acao,
      impactoEstimado: r.impactoEstimado ?? null,
      createdAt: r.createdAt,
    })),
    onProgress,
    'Enviando recomendações',
  )

  await createBatch(
    'alertas',
    dashboard.alertas.map((a: Alert) => ({
      titulo: a.titulo,
      descricao: a.descricao,
      severidade: a.severidade,
      clienteId: a.clienteId ? codigoToUuid.get(a.clienteId) ?? null : null,
      clienteNome: a.clienteNome ?? null,
      lido: a.lido,
      createdAt: a.createdAt,
    })),
    onProgress,
    'Enviando alertas',
  )

  await createBatch(
    'ai_modules',
    dashboard.aiModules.map((m: AiModule) => ({
      titulo: m.titulo,
      descricao: m.descricao,
      icon: m.icon,
      status: m.status,
    })),
    onProgress,
    'Enviando módulos IA',
  )

  const linhaPayloads = rows.map(mapClienteRow)
  const createdLinhas = await createBatch('linhas_comerciais', linhaPayloads, onProgress, 'Enviando base de clientes')

  await upsertDashboardKpis(dashboard, onProgress)

  onProgress?.('Registrando importação...')
  await directus.post('/items/importacoes', {
    source_name: stats.sourceName,
    imported_at: stats.importedAt,
    total_clientes: stats.totalClientes,
    total_realizado: stats.totalRealizado,
    total_cotado: stats.totalCotado,
    status: 'ok',
    error_message: null,
  })

  onProgress?.('Sincronização concluída')

  return {
    stats,
    clientesCriados: createdClients.length,
    linhasCriadas: createdLinhas.length,
  }
}

export function isDirectusSyncEnabled (): boolean {
  return import.meta.env.VITE_USE_MOCK === 'false'
}