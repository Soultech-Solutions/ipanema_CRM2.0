import type { Client, ClientDetail, DashboardData } from '@/types/commercial'
import type { CteDocument } from '@/types/cte'
import { directus } from '@/api/directusClient'
import type { AnalyticsResult, ImportStats } from '@/services/cteAnalytics'

const BATCH_SIZE = 150

export type SyncProgress = (message: string) => void

export function cteChave (cte: Pick<CteDocument, 'filial' | 'serie' | 'codigo'>): string {
  return `${cte.filial || ''}|${cte.serie || ''}|${cte.codigo}`
}

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
    frequenciaEmbarques: client.frequenciaEmbarques,
    yieldMedio: client.yieldMedio,
    devolucoes: client.devolucoes,
    reentregas: client.reentregas,
    ctesAbertos: client.ctesAbertos,
    diasSemEmbarque: client.diasSemEmbarque,
    status: client.status,
    destinatarios: detail?.destinatarios ?? 0,
    embarquesMes: detail?.embarquesMes ?? client.frequenciaEmbarques,
    produtos: detail?.produtos ?? [client.segmento],
    rotas: detail?.rotas ?? [],
  }
}

function mapCte (cte: CteDocument): Record<string, unknown> {
  return {
    chave: cteChave(cte),
    tipoDocumento: cte.tipoDocumento,
    filial: cte.filial,
    serie: cte.serie,
    codigo: cte.codigo,
    tipoCte: cte.tipoCte,
    dtCadastro: cte.dtCadastro,
    filFatura: cte.filFatura,
    numFatura: cte.numFatura,
    dtVencimento: cte.dtVencimento,
    codUnn: cte.codUnn,
    codCus: cte.codCus,
    clienteCodigo: cte.clienteCodigo,
    grupoCliente: cte.grupoCliente,
    codItinerario: cte.codItinerario,
    valor: cte.valor,
    impostos: cte.impostos,
    munOrigem: cte.munOrigem,
    ufOrigem: cte.ufOrigem,
    munDestino: cte.munDestino,
    ufDestino: cte.ufDestino,
    codRegiao: cte.codRegiao,
    regiao: cte.regiao,
    unidadeNegocio: cte.unidadeNegocio,
    centroCusto: cte.centroCusto,
    centroGasto: cte.centroGasto,
    classificacao: cte.classificacao,
    tipoTabela: cte.tipoTabela,
    tabelaFrete: cte.tabelaFrete,
    remetente: cte.remetente,
    destinatario: cte.destinatario,
    pesoKg: cte.pesoKg,
    pesoCalc: cte.pesoCalc,
    valorPedagio: cte.valorPedagio,
    valorMercadoria: cte.valorMercadoria,
    dtEntrega: cte.dtEntrega,
    fretePeso: cte.fretePeso,
    observacoes: cte.observacoes,
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
  ctes: CteDocument[]
  result: AnalyticsResult
}

export interface SyncImportResult {
  stats: ImportStats
  clientesCriados: number
  ctesCriados: number
}

/**
 * Full replace of analytical + transactional layers in Directus after a LOG FALA import.
 */
export async function syncImportToDirectus (
  input: SyncImportInput,
  onProgress?: SyncProgress,
): Promise<SyncImportResult> {
  const { ctes, result } = input
  const { clients, dashboard, clientDetails, stats } = result

  const replaceOrder = [
    'historico_faturamento',
    'movimentacoes',
    'insights',
    'recomendacoes',
    'alertas',
    'ai_modules',
    'ctes',
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

  const globalInsights = dashboard.insights.map(ins => ({
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
    dashboard.recomendacoes.map(r => ({
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
    dashboard.alertas.map(a => ({
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
    dashboard.aiModules.map(m => ({
      titulo: m.titulo,
      descricao: m.descricao,
      icon: m.icon,
      status: m.status,
    })),
    onProgress,
    'Enviando módulos IA',
  )

  const ctePayloads = ctes.map(mapCte)
  const createdCtes = await createBatch('ctes', ctePayloads, onProgress, 'Enviando CT-es')

  await upsertDashboardKpis(dashboard, onProgress)

  onProgress?.('Registrando importação...')
  await directus.post('/items/importacoes', {
    source_name: stats.sourceName,
    imported_at: stats.importedAt,
    total_ctes: stats.totalCtes,
    total_clientes: stats.totalClientes,
    total_valor: stats.totalValor,
    status: 'ok',
    error_message: null,
  })

  onProgress?.('Sincronização concluída')

  return {
    stats,
    clientesCriados: createdClients.length,
    ctesCriados: createdCtes.length,
  }
}

export function isDirectusSyncEnabled (): boolean {
  return import.meta.env.VITE_USE_MOCK === 'false'
}
