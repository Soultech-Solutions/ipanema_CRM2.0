import type {
  Alert,
  AiModule,
  Client,
  ClientDetail,
  DashboardData,
  ExecutiveKpis,
  Insight,
  MonthlyMetric,
  Recommendation,
  Seller,
} from '@/types/commercial'
import type { ClienteComercialRow, PeriodoComercial } from '@/types/base-comercial'
import { isAtivo, taxaConversao as calcTaxaConversao } from '@/types/base-comercial'

export interface ImportStats {
  totalClientes: number
  totalCotado: number
  totalRealizado: number
  clientesAtivos: number
  clientesInativos: number
  importedAt: string
  sourceName: string
}

export interface AnalyticsResult {
  stats: ImportStats
  clients: Client[]
  dashboard: DashboardData
  clientDetails: Record<string, ClientDetail>
  sellers: Seller[]
}

const aiModules: AiModule[] = [
  {
    id: 1,
    titulo: 'Faturamento vs Meta & Histórico',
    descricao: 'Realizado acumulado por cliente/vendedor e desvio vs cotado.',
    icon: 'mdi-chart-line',
    status: 'ok',
  },
  {
    id: 2,
    titulo: 'Concentração & Risco da Carteira',
    descricao: 'Top clientes por receita em risco e dependência de receita.',
    icon: 'mdi-chart-donut',
    status: 'atencao',
  },
  {
    id: 3,
    titulo: 'Taxa de Conversão (Cotado → Realizado)',
    descricao: 'Percentual de orçamentos efetivamente convertidos em venda.',
    icon: 'mdi-percent',
    status: 'ok',
  },
  {
    id: 4,
    titulo: 'Clientes Inativos / Sem Compra Recente',
    descricao: 'Derivado de STATUS e dias desde a Última Compra.',
    icon: 'mdi-account-alert',
    status: 'atencao',
  },
  {
    id: 5,
    titulo: 'Ranking de Vendedores',
    descricao: 'Realizado, conversão e carteira ativa por vendedor.',
    icon: 'mdi-trophy-outline',
    status: 'ok',
  },
]

function clamp (n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function daysBetween (fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / 86_400_000))
}

function slug (s: string): string {
  return (s || 'na').trim().toLowerCase().replace(/\s+/g, '-')
}

function monthLabel (key: string): string {
  const [, m] = key.split('-')
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return labels[Number(m) - 1] ?? key
}

/** Ano mais recente presente nas colunas mensais da base (ex.: '2026') */
function anoCorrente (clientes: ClienteComercialRow[]): string {
  let max = ''
  for (const c of clientes) {
    for (const key of Object.keys(c.mensal)) {
      const ano = key.split('-')[0]
      if (ano > max) max = ano
    }
  }
  return max || String(new Date().getFullYear())
}

function computeHealth (params: {
  ativo: boolean
  diasSemCompra: number
  taxaConversao: number
  frequenciaCompra: number
}): number {
  let score = 90
  if (!params.ativo) score -= 25
  score -= Math.min(35, params.diasSemCompra * 0.3)
  score += (params.taxaConversao - 0.5) * 30
  if (params.frequenciaCompra < 2) score -= 10
  else if (params.frequenciaCompra >= 5) score += 5
  return Math.round(clamp(score, 15, 99))
}

function computeChurnProb (params: { diasSemCompra: number; healthScore: number; ativo: boolean }): number {
  let p = 0.1
  p += Math.min(0.5, params.diasSemCompra / 180)
  p += (100 - params.healthScore) / 200
  if (!params.ativo) p += 0.15
  return clamp(p, 0.03, 0.95)
}

function rowToClient (row: ClienteComercialRow, ano: string, now: number): Client {
  const anualCorrente: PeriodoComercial = row.anual[ano] ?? { cotado: 0, realizado: 0 }
  const mesesCorrente = Object.entries(row.mensal).filter(([k]) => k.startsWith(ano))
  const mesesComVenda = mesesCorrente.filter(([, p]) => p.realizado > 0).length
  const conv = calcTaxaConversao(anualCorrente)
  const ativo = isAtivo(row)

  const ultimaCompraMs = row.ultimaCompra ? Date.parse(row.ultimaCompra) : Number.NaN
  const diasSemCompra = Number.isNaN(ultimaCompraMs) ? 999 : daysBetween(ultimaCompraMs, now)

  const healthScore = computeHealth({
    ativo,
    diasSemCompra,
    taxaConversao: conv,
    frequenciaCompra: mesesComVenda,
  })
  const probabilidadePerda = computeChurnProb({ diasSemCompra, healthScore, ativo })

  const receitaAnual = anualCorrente.realizado
  const ticketMedio = mesesComVenda > 0 ? receitaAnual / mesesComVenda : 0
  const receitaEmRisco = receitaAnual * probabilidadePerda
  // Potencial = gap entre cotado e realizado no ano corrente (orçamento que não virou venda)
  const receitaPotencial = Math.max(0, anualCorrente.cotado - anualCorrente.realizado)

  let status: Client['status'] = 'ativo'
  if (!ativo || diasSemCompra >= 180) status = 'inativo'
  else if (healthScore < 70 || probabilidadePerda >= 0.4 || diasSemCompra >= 60) status = 'risco'

  return {
    id: `cli-${slug(row.codCliente || row.razaoSocial)}`,
    nome: row.razaoSocial || row.codCliente,
    documento: row.codCliente,
    segmento: row.segmento,
    grupoCliente: row.origemCliente || undefined,
    regiao: row.uf ? `${row.cidade || '—'}/${row.uf}` : undefined,
    vendedorId: `ven-${slug(row.vendedor)}`,
    vendedorNome: row.vendedor,
    healthScore,
    receitaAnual,
    probabilidadePerda,
    receitaEmRisco,
    receitaPotencial,
    ticketMedio,
    // Campos novos — ver nota sobre extensão de src/types/commercial.ts
    taxaConversao: conv,
    frequenciaCompra: mesesComVenda,
    diasSemCompra,
    status,
  } as Client
}

function buildKpis (clients: Client[], stats: ImportStats): ExecutiveKpis {
  const avgHealth = clients.length
    ? clients.reduce((s, c) => s + c.healthScore, 0) / clients.length
    : 0
  const receitaEmRisco = clients.reduce((s, c) => s + c.receitaEmRisco, 0)
  const receitaPotencial = clients.reduce((s, c) => s + c.receitaPotencial, 0)
  const convRate = stats.totalCotado ? stats.totalRealizado / stats.totalCotado : 0
  const inativoRate = stats.totalClientes ? stats.clientesInativos / stats.totalClientes : 0

  const eficienciaComercial = Math.round(clamp(convRate * 100, 20, 98))
  const crescimentoSustentavel = Math.round(clamp(90 - inativoRate * 80, 40, 97))
  const saudeCarteira = Math.round(avgHealth)

  const riscoScore = clamp(100 - (receitaEmRisco / Math.max(stats.totalRealizado, 1)) * 100, 0, 100)
  const potencialScore = clamp((receitaPotencial / Math.max(stats.totalCotado, 1)) * 80, 0, 100)

  const cii = Math.round(
    saudeCarteira * 0.25
    + riscoScore * 0.2
    + potencialScore * 0.2
    + crescimentoSustentavel * 0.15
    + eficienciaComercial * 0.15
    + 75 * 0.05,
  )

  return {
    saudeCarteira,
    receitaEmRisco,
    receitaPotencial,
    eficienciaComercial,
    crescimentoSustentavel,
    cii: clamp(Math.round(cii), 20, 99),
  }
}

function buildSellers (clients: Client[]): Seller[] {
  const map = new Map<string, Seller>()

  for (const c of clients) {
    let s = map.get(c.vendedorId)
    if (!s) {
      s = {
        id: c.vendedorId,
        nome: c.vendedorNome,
        email: '',
        clientesAtivos: 0,
        faturamentoMes: 0,
        metaMes: 0,
        eficiencia: 0,
        visitas: 0,
        propostas: 0,
        conversao: 0,
      }
      map.set(c.vendedorId, s)
    }
    if (c.status !== 'inativo') s.clientesAtivos += 1
    s.faturamentoMes += c.receitaAnual
  }

  const sellers = [...map.values()]
  // Conversão média ponderada por receita, aproximada via taxaConversao dos clientes
  for (const s of sellers) {
    const own = clients.filter(c => c.vendedorId === s.id)
    const pesoTotal = own.reduce((sum, c) => sum + c.receitaAnual, 0) || 1
    const convPonderada = own.reduce((sum, c) => sum + ((c as Client & { taxaConversao: number }).taxaConversao * c.receitaAnual), 0) / pesoTotal
    s.conversao = Math.round(clamp(convPonderada * 100, 0, 100))
    s.eficiencia = s.conversao
  }

  return sellers.sort((a, b) => b.faturamentoMes - a.faturamentoMes)
}

function buildInsights (clients: Client[], stats: ImportStats, kpis: ExecutiveKpis): Insight[] {
  const risco = [...clients].sort((a, b) => b.receitaEmRisco - a.receitaEmRisco).slice(0, 5)
  const topShare = stats.totalRealizado
    ? risco.reduce((s, c) => s + c.receitaAnual, 0) / stats.totalRealizado
    : 0

  return [
    {
      id: 'ins-1',
      titulo: 'CII a partir da base comercial',
      descricao: `Índice ${kpis.cii}/100 com base em ${stats.totalClientes} clientes (${stats.clientesAtivos} ativos, ${stats.clientesInativos} inativos).`,
      tipo: 'explicacao',
      createdAt: stats.importedAt,
    },
    {
      id: 'ins-2',
      titulo: 'Receita em risco concentrada',
      descricao: `Os 5 clientes com maior risco concentram ${(topShare * 100).toFixed(0)}% do realizado da base. Priorize visitas e renegociação.`,
      tipo: 'risco',
      createdAt: stats.importedAt,
    },
    {
      id: 'ins-3',
      titulo: 'Orçamentos não convertidos',
      descricao: `Gap total entre cotado e realizado no ano corrente: R$ ${(stats.totalCotado - stats.totalRealizado).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} em potencial não capturado.`,
      tipo: 'oportunidade',
      createdAt: stats.importedAt,
    },
  ]
}

function buildRecommendations (clients: Client[], importedAt: string): Recommendation[] {
  const sorted = [...clients].sort((a, b) => b.receitaEmRisco - a.receitaEmRisco)
  const recs: Recommendation[] = []

  for (const c of sorted.slice(0, 4)) {
    recs.push({
      id: `rec-${c.id}-visita`,
      titulo: c.status === 'inativo' ? 'Recuperar cliente inativo' : 'Agendar visita estratégica',
      descricao: `${c.nome}: Health ${c.healthScore}, risco de ${(c.probabilidadePerda * 100).toFixed(0)}%, vendedor ${c.vendedorNome}.`,
      prioridade: c.healthScore < 70 ? 'alta' : 'media',
      status: 'pendente',
      clienteId: c.id,
      clienteNome: c.nome,
      regiao: c.regiao,
      acao: c.status === 'inativo' ? 'Recuperar cliente' : 'Agendar visita',
      impactoEstimado: c.receitaEmRisco,
      createdAt: importedAt,
    })
  }

  const maiorPotencial = [...clients].sort((a, b) => b.receitaPotencial - a.receitaPotencial)[0]
  if (maiorPotencial) {
    recs.push({
      id: `rec-${maiorPotencial.id}-potencial`,
      titulo: 'Fechar orçamento pendente',
      descricao: `${maiorPotencial.nome} tem R$ ${maiorPotencial.receitaPotencial.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} cotados e ainda não convertidos.`,
      prioridade: 'media',
      status: 'pendente',
      clienteId: maiorPotencial.id,
      clienteNome: maiorPotencial.nome,
      regiao: maiorPotencial.regiao,
      acao: 'Follow-up de proposta',
      impactoEstimado: maiorPotencial.receitaPotencial,
      createdAt: importedAt,
    })
  }

  return recs
}

function buildAlerts (clients: Client[], stats: ImportStats): Alert[] {
  const alerts: Alert[] = []
  const now = stats.importedAt

  for (const c of clients.filter(x => x.status === 'inativo').slice(0, 8)) {
    alerts.push({
      id: `alt-inativo-${c.id}`,
      titulo: 'Cliente inativo',
      descricao: `${c.nome} está inativo/sem compra recente.`,
      severidade: 'warning',
      clienteId: c.id,
      clienteNome: c.nome,
      lido: false,
      createdAt: now,
    })
  }

  for (const c of clients.filter(x => x.healthScore < 60).sort((a, b) => a.healthScore - b.healthScore).slice(0, 5)) {
    alerts.push({
      id: `alt-hs-${c.id}`,
      titulo: 'Health Score baixo',
      descricao: `${c.nome}: score ${c.healthScore}.`,
      severidade: c.healthScore < 45 ? 'critical' : 'warning',
      clienteId: c.id,
      clienteNome: c.nome,
      lido: false,
      createdAt: now,
    })
  }

  return alerts
}

function detailFromRow (client: Client, row: ClienteComercialRow, dashboard: DashboardData): ClientDetail {
  const historicoFaturamento: MonthlyMetric[] = Object.entries(row.mensal)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, valor]) => ({ mes: monthLabel(key), valor: valor.realizado, meta: valor.cotado }))

  return {
    ...client,
    historicoFaturamento,
    produtos: [],
    rotas: [],
    destinatarios: 0,
    embarquesMes: 0,
    movimentacoes: [],
    insights: [
      {
        id: `ins-${client.id}-1`,
        titulo: 'Health Score do cliente',
        descricao: `Score ${client.healthScore}, status ${client.status}, ${client.diasSemCompra ?? '—'} dias desde a última compra.`,
        tipo: 'explicacao',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `ins-${client.id}-2`,
        titulo: 'Receita em risco',
        descricao: `Probabilidade de perda ${(client.probabilidadePerda * 100).toFixed(0)}% sobre realizado de R$ ${client.receitaAnual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.`,
        tipo: 'risco',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `ins-${client.id}-3`,
        titulo: 'Potencial não convertido',
        descricao: `R$ ${client.receitaPotencial.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} cotados e ainda não realizados este ano.`,
        tipo: 'oportunidade',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
    ],
    recomendacoes: dashboard.recomendacoes.filter(r => r.clienteId === client.id),
  }
}

export function buildClientDetail (
  client: Client,
  rows: ClienteComercialRow[],
  dashboard: DashboardData,
): ClientDetail {
  const row = rows.find(r => r.codCliente === client.documento)
  if (!row) {
    return {
      ...client,
      historicoFaturamento: [],
      produtos: [],
      rotas: [],
      destinatarios: 0,
      embarquesMes: 0,
      movimentacoes: [],
      insights: [],
      recomendacoes: dashboard.recomendacoes.filter(r => r.clienteId === client.id),
    }
  }
  return detailFromRow(client, row, dashboard)
}

export function analyzeBaseComercial (rows: ClienteComercialRow[], sourceName = 'upload'): AnalyticsResult {
  const now = Date.now()
  const importedAt = new Date().toISOString()
  const ano = anoCorrente(rows)

  const clients = rows.map(r => rowToClient(r, ano, now)).sort((a, b) => b.receitaAnual - a.receitaAnual)

  const totalCotado = rows.reduce((s, r) => s + (r.anual[ano]?.cotado ?? 0), 0)
  const totalRealizado = rows.reduce((s, r) => s + (r.anual[ano]?.realizado ?? 0), 0)
  const clientesAtivos = clients.filter(c => c.status !== 'inativo').length

  const stats: ImportStats = {
    totalClientes: rows.length,
    totalCotado,
    totalRealizado,
    clientesAtivos,
    clientesInativos: rows.length - clientesAtivos,
    importedAt,
    sourceName,
  }

  const kpis = buildKpis(clients, stats)
  const insights = buildInsights(clients, stats, kpis)
  const recomendacoes = buildRecommendations(clients, importedAt)
  const alertas = buildAlerts(clients, stats)
  const sellers = buildSellers(clients)

  const dashboard: DashboardData = {
    kpis,
    insights,
    recomendacoes,
    alertas,
    clientesRisco: clients.filter(c => c.status === 'risco' || c.status === 'inativo').slice(0, 12),
    aiModules,
  }

  const clientDetails: Record<string, ClientDetail> = {}
  rows.forEach((row, i) => {
    const client = clients.find(c => c.documento === row.codCliente)
    if (client) clientDetails[client.id] = detailFromRow(client, row, dashboard)
  })

  return { stats, clients, dashboard, clientDetails, sellers }
}