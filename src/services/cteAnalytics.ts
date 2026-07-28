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
  TimelineEvent,
} from '@/types/commercial'
import type { CteDocument } from '@/types/cte'
import {
  TIPOS_CTE_DEVOLUCAO,
  TIPOS_CTE_REENTREGA,
  calcYieldRsTon,
  isCteAberto,
} from '@/types/cte'

export interface ImportStats {
  totalCtes: number
  totalClientes: number
  totalValor: number
  ctesAbertos: number
  devolucoes: number
  reentregas: number
  importedAt: string
  sourceName: string
}

export interface AnalyticsResult {
  stats: ImportStats
  clients: Client[]
  dashboard: DashboardData
  /** Detalhes pré-calculados — evita reprocessar 65k CT-es na UI */
  clientDetails: Record<string, ClientDetail>
}

interface ClientAgg {
  id: string
  nome: string
  grupoCliente: string
  classificacoes: Map<string, number>
  regioes: Map<string, number>
  valorTotal: number
  count: number
  devolucoes: number
  reentregas: number
  ctesAbertos: number
  yieldSum: number
  yieldCount: number
  destinatarios: Set<string>
  rotas: Map<string, number>
  produtos: Map<string, number>
  lastDate: number
  firstDate: number
  monthly: Map<string, number>
  recent: CteDocument[]
}

const aiModules: AiModule[] = [
  {
    id: 1,
    titulo: 'Faturamento vs Meta & Histórico',
    descricao: 'Receita acumulada a partir dos CT-es e alertas de desvio.',
    icon: 'mdi-chart-line',
    status: 'ok',
  },
  {
    id: 2,
    titulo: 'Concentração & Risco da Carteira',
    descricao: 'Top clientes, dependência de receita e churn operacional.',
    icon: 'mdi-chart-donut',
    status: 'atencao',
  },
  {
    id: 3,
    titulo: 'Yield Comercial (R$/ton)',
    descricao: 'Análise por rota e cliente com base em VALOR / PESO.',
    icon: 'mdi-currency-usd',
    status: 'ok',
  },
  {
    id: 4,
    titulo: 'Devoluções & Reentregas',
    descricao: 'Derivado de TIPO CTE (DEVOLUÇÃO / REENTREGA).',
    icon: 'mdi-map-marker-alert',
    status: 'critico',
  },
  {
    id: 5,
    titulo: 'Giro dos CT-es em Aberto',
    descricao: 'CT-es sem NÚM. FATURA — documentos não faturados.',
    icon: 'mdi-file-document-outline',
    status: 'atencao',
  },
]

function clientIdFromCodigo (codigo: string): string {
  return `cli-${codigo.replace(/\s+/g, '-').toLowerCase()}`
}

function isDevolucao (tipo: string): boolean {
  return (TIPOS_CTE_DEVOLUCAO as readonly string[]).includes(tipo)
}

function isReentrega (tipo: string): boolean {
  return (TIPOS_CTE_REENTREGA as readonly string[]).includes(tipo)
}

function clamp (n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function daysBetween (fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / 86_400_000))
}

function monthKey (iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthLabel (key: string): string {
  const [, m] = key.split('-')
  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const idx = Number(m) - 1
  return labels[idx] ?? key
}

function topKey (map: Map<string, number>, fallback = '—'): string {
  let best = fallback
  let max = -1
  for (const [k, v] of map) {
    if (v > max) {
      max = v
      best = k
    }
  }
  return best
}

function computeHealth (params: {
  diasSemEmbarque: number
  devolucaoRate: number
  reentregaRate: number
  abertoRate: number
  frequencia: number
}): number {
  let score = 92
  score -= Math.min(40, params.diasSemEmbarque * 0.9)
  score -= params.devolucaoRate * 120
  score -= params.reentregaRate * 80
  score -= params.abertoRate * 40
  if (params.frequencia < 5) score -= 12
  else if (params.frequencia > 40) score += 4
  return Math.round(clamp(score, 25, 99))
}

function computeChurnProb (params: {
  diasSemEmbarque: number
  devolucaoRate: number
  healthScore: number
}): number {
  let p = 0.08
  p += Math.min(0.55, params.diasSemEmbarque / 80)
  p += params.devolucaoRate * 1.2
  p += (100 - params.healthScore) / 220
  return clamp(p, 0.03, 0.92)
}

function buildAggs (ctes: CteDocument[]): {
  map: Map<string, ClientAgg>
  totalValor: number
  ctesAbertos: number
  devolucoes: number
  reentregas: number
} {
  const map = new Map<string, ClientAgg>()
  let totalValor = 0
  let ctesAbertos = 0
  let devolucoes = 0
  let reentregas = 0

  for (const cte of ctes) {
    totalValor += cte.valor
    const devolucao = isDevolucao(cte.tipoCte)
    const reentrega = isReentrega(cte.tipoCte)
    const aberto = isCteAberto(cte)
    if (devolucao) devolucoes += 1
    if (reentrega) reentregas += 1
    if (aberto) ctesAbertos += 1

    const id = clientIdFromCodigo(cte.clienteCodigo)
    let agg = map.get(id)
    if (!agg) {
      agg = {
        id,
        nome: cte.clienteCodigo,
        grupoCliente: cte.grupoCliente || '—',
        classificacoes: new Map(),
        regioes: new Map(),
        valorTotal: 0,
        count: 0,
        devolucoes: 0,
        reentregas: 0,
        ctesAbertos: 0,
        yieldSum: 0,
        yieldCount: 0,
        destinatarios: new Set(),
        rotas: new Map(),
        produtos: new Map(),
        lastDate: 0,
        firstDate: Number.POSITIVE_INFINITY,
        monthly: new Map(),
        recent: [],
      }
      map.set(id, agg)
    }

    agg.count += 1
    agg.valorTotal += cte.valor
    if (cte.grupoCliente) agg.grupoCliente = cte.grupoCliente
    const classif = cte.classificacao || 'SEM CLASSIFICAÇÃO'
    agg.classificacoes.set(classif, (agg.classificacoes.get(classif) || 0) + 1)
    if (cte.regiao) {
      agg.regioes.set(cte.regiao, (agg.regioes.get(cte.regiao) || 0) + 1)
    }
    if (devolucao) agg.devolucoes += 1
    if (reentrega) agg.reentregas += 1
    if (aberto) agg.ctesAbertos += 1
    if (cte.destinatario) agg.destinatarios.add(cte.destinatario)

    const rota = `${cte.ufOrigem} → ${cte.ufDestino}`
    agg.rotas.set(rota, (agg.rotas.get(rota) || 0) + 1)
    agg.produtos.set(classif, (agg.produtos.get(classif) || 0) + 1)

    const y = calcYieldRsTon(cte.valor, cte.pesoKg)
    if (y > 0 && Number.isFinite(y)) {
      agg.yieldSum += y
      agg.yieldCount += 1
    }

    const ts = Date.parse(cte.dtCadastro)
    if (!Number.isNaN(ts)) {
      if (ts > agg.lastDate) agg.lastDate = ts
      if (ts < agg.firstDate) agg.firstDate = ts
      const mk = monthKey(cte.dtCadastro)
      agg.monthly.set(mk, (agg.monthly.get(mk) || 0) + cte.valor)
    }

    // Mantém só os 8 mais recentes para timeline (heap simples por inserção ordenada depois)
    if (agg.recent.length < 12) {
      agg.recent.push(cte)
    } else {
      // substitui o mais antigo se este for mais novo
      let oldestIdx = 0
      let oldestTs = Date.parse(agg.recent[0]?.dtCadastro || '') || 0
      for (let i = 1; i < agg.recent.length; i++) {
        const t = Date.parse(agg.recent[i]?.dtCadastro || '') || 0
        if (t < oldestTs) {
          oldestTs = t
          oldestIdx = i
        }
      }
      if (!Number.isNaN(ts) && ts > oldestTs) {
        agg.recent[oldestIdx] = cte
      }
    }
  }

  return { map, totalValor, ctesAbertos, devolucoes, reentregas }
}

function detailFromAgg (client: Client, agg: ClientAgg, dashboard: DashboardData): ClientDetail {
  const historicoFaturamento: MonthlyMetric[] = [...agg.monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, valor]) => ({ mes: monthLabel(key), valor }))

  const movimentacoes: TimelineEvent[] = [...agg.recent]
    .sort((a, b) => Date.parse(b.dtCadastro) - Date.parse(a.dtCadastro))
    .slice(0, 8)
    .map((cte, i) => ({
      id: `mov-${client.id}-${i}`,
      data: cte.dtCadastro.slice(0, 10),
      titulo: isDevolucao(cte.tipoCte)
        ? 'Devolução'
        : isReentrega(cte.tipoCte)
          ? 'Reentrega'
          : isCteAberto(cte)
            ? 'CT-e em aberto'
            : 'Embarque / CT-e',
      descricao: `CT-e ${cte.codigo} · ${cte.munOrigem}/${cte.ufOrigem} → ${cte.munDestino}/${cte.ufDestino} · R$ ${cte.valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`,
      tipo: isDevolucao(cte.tipoCte) || isReentrega(cte.tipoCte) ? 'alerta' as const : 'embarque' as const,
    }))

  const topRotas = [...agg.rotas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([r]) => r)
  const topProdutos = [...agg.produtos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p]) => p)

  return {
    ...client,
    historicoFaturamento,
    produtos: topProdutos,
    rotas: topRotas,
    destinatarios: agg.destinatarios.size,
    embarquesMes: client.frequenciaEmbarques,
    movimentacoes,
    insights: [
      {
        id: `ins-${client.id}-1`,
        titulo: 'Health Score do cliente',
        descricao: `Score ${client.healthScore} com ${client.devolucoes} devoluções, ${client.reentregas} reentregas e ${client.diasSemEmbarque} dias desde o último CT-e.`,
        tipo: 'explicacao',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `ins-${client.id}-2`,
        titulo: 'Receita em risco',
        descricao: `Probabilidade de perda ${(client.probabilidadePerda * 100).toFixed(0)}% sobre faturamento de R$ ${client.receitaAnual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} → risco de R$ ${client.receitaEmRisco.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.`,
        tipo: 'risco',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `ins-${client.id}-3`,
        titulo: 'Potencial estimado',
        descricao: `Potencial de expansão calculado por benchmark interno: R$ ${client.receitaPotencial.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.`,
        tipo: 'oportunidade',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
    ],
    recomendacoes: dashboard.recomendacoes.filter(r => r.clienteId === client.id),
  }
}

function aggToClient (agg: ClientAgg, now: number, peerAvg: number): Client {
  const spanDays = Math.max(30, daysBetween(agg.firstDate === Number.POSITIVE_INFINITY ? now : agg.firstDate, now))
  const frequencia = Math.round((agg.count / spanDays) * 30)
  const devolucaoRate = agg.count ? agg.devolucoes / agg.count : 0
  const reentregaRate = agg.count ? agg.reentregas / agg.count : 0
  const abertoRate = agg.count ? agg.ctesAbertos / agg.count : 0
  const diasSemEmbarque = agg.lastDate ? daysBetween(agg.lastDate, now) : 90

  const healthScore = computeHealth({
    diasSemEmbarque,
    devolucaoRate,
    reentregaRate,
    abertoRate,
    frequencia,
  })
  const probabilidadePerda = computeChurnProb({ diasSemEmbarque, devolucaoRate, healthScore })
  const receitaAnual = agg.valorTotal
  const ticketMedio = agg.count ? agg.valorTotal / agg.count : 0
  const yieldMedio = agg.yieldCount ? agg.yieldSum / agg.yieldCount : 0
  const receitaEmRisco = receitaAnual * probabilidadePerda
  const receitaPotencial = Math.max(0, peerAvg - ticketMedio) * Math.max(3, frequencia)

  let status: Client['status'] = 'ativo'
  if (diasSemEmbarque >= 45 || healthScore < 55) status = 'inativo'
  else if (healthScore < 78 || probabilidadePerda >= 0.35 || diasSemEmbarque >= 20) status = 'risco'

  return {
    id: agg.id,
    nome: agg.nome,
    documento: `Grupo ${agg.grupoCliente}`,
    segmento: topKey(agg.classificacoes, 'SEM CLASSIFICAÇÃO'),
    grupoCliente: agg.grupoCliente,
    regiao: topKey(agg.regioes, '—'),
    vendedorId: 'ven-base',
    vendedorNome: 'Carteira (base CT-e)',
    healthScore,
    receitaAnual,
    probabilidadePerda,
    receitaEmRisco,
    receitaPotencial,
    ticketMedio,
    frequenciaEmbarques: frequencia,
    yieldMedio: Math.round(yieldMedio),
    devolucoes: agg.devolucoes,
    reentregas: agg.reentregas,
    ctesAbertos: agg.ctesAbertos,
    diasSemEmbarque,
    status,
  }
}

function buildKpis (clients: Client[], stats: ImportStats): ExecutiveKpis {
  const avgHealth = clients.length
    ? clients.reduce((s, c) => s + c.healthScore, 0) / clients.length
    : 0
  const receitaEmRisco = clients.reduce((s, c) => s + c.receitaEmRisco, 0)
  const receitaPotencial = clients.reduce((s, c) => s + c.receitaPotencial, 0)
  const abertoRate = stats.totalCtes ? stats.ctesAbertos / stats.totalCtes : 0
  const devolucaoRate = stats.totalCtes ? stats.devolucoes / stats.totalCtes : 0

  const eficienciaComercial = Math.round(clamp(88 - abertoRate * 100 - devolucaoRate * 80, 40, 96))
  const crescimentoSustentavel = Math.round(clamp(90 - devolucaoRate * 150, 45, 97))

  const saudeCarteira = Math.round(avgHealth)
  const riscoScore = clamp(100 - (receitaEmRisco / Math.max(stats.totalValor, 1)) * 100, 0, 100)
  const potencialScore = clamp((receitaPotencial / Math.max(stats.totalValor, 1)) * 80, 0, 100)

  const cii = Math.round(
    saudeCarteira * 0.25
    + riscoScore * 0.2
    + potencialScore * 0.2
    + crescimentoSustentavel * 0.15
    + eficienciaComercial * 0.1
    + (100 - devolucaoRate * 400) * 0.05
    + 75 * 0.05,
  )

  return {
    saudeCarteira,
    receitaEmRisco,
    receitaPotencial,
    eficienciaComercial,
    crescimentoSustentavel,
    cii: clamp(Math.round(cii), 40, 99),
  }
}

function buildInsights (clients: Client[], stats: ImportStats, kpis: ExecutiveKpis): Insight[] {
  const risco = [...clients].sort((a, b) => b.receitaEmRisco - a.receitaEmRisco).slice(0, 5)
  const topShare = stats.totalValor
    ? risco.reduce((s, c) => s + c.receitaAnual, 0) / stats.totalValor
    : 0

  return [
    {
      id: 'ins-1',
      titulo: 'CII a partir da base LOG FALA',
      descricao: `Índice ${kpis.cii}/100 com base em ${stats.totalCtes.toLocaleString('pt-BR')} CT-es e ${stats.totalClientes} clientes pagadores.`,
      tipo: 'explicacao',
      createdAt: stats.importedAt,
    },
    {
      id: 'ins-2',
      titulo: 'Receita em risco concentrada',
      descricao: `Os 5 clientes com maior risco concentram ${(topShare * 100).toFixed(0)}% do faturamento da base. Priorize visitas e renegociação.`,
      tipo: 'risco',
      createdAt: stats.importedAt,
    },
    {
      id: 'ins-3',
      titulo: 'Operação: devoluções e CT-es abertos',
      descricao: `${stats.devolucoes.toLocaleString('pt-BR')} devoluções e ${stats.ctesAbertos.toLocaleString('pt-BR')} CT-es sem fatura impactam yield e giro.`,
      tipo: 'alerta',
      createdAt: stats.importedAt,
    },
  ]
}

function buildRecommendations (clients: Client[], importedAt: string): Recommendation[] {
  const sorted = [...clients].sort((a, b) => b.receitaEmRisco - a.receitaEmRisco)
  const recs: Recommendation[] = []

  for (const c of sorted.slice(0, 4)) {
    const regiaoLabel = c.regiao && c.regiao !== '—' ? c.regiao : null
    recs.push({
      id: `rec-${c.id}-visita`,
      titulo: c.diasSemEmbarque >= 30 ? 'Recuperar cliente sem embarque' : 'Agendar visita estratégica',
      descricao: `${c.nome}${regiaoLabel ? ` · Região ${regiaoLabel}` : ''}: Health ${c.healthScore}, ${c.diasSemEmbarque} dias sem embarque, risco de ${(c.probabilidadePerda * 100).toFixed(0)}%.`,
      prioridade: c.healthScore < 70 || c.diasSemEmbarque >= 30 ? 'alta' : 'media',
      status: 'pendente',
      clienteId: c.id,
      clienteNome: c.nome,
      regiao: regiaoLabel ?? undefined,
      acao: c.diasSemEmbarque >= 30 ? 'Recuperar cliente' : 'Agendar visita',
      impactoEstimado: c.receitaEmRisco,
      createdAt: importedAt,
    })
  }

  const lowYield = [...clients].filter(c => c.yieldMedio > 0).sort((a, b) => a.yieldMedio - b.yieldMedio)[0]
  if (lowYield) {
    const regiaoLabel = lowYield.regiao && lowYield.regiao !== '—' ? lowYield.regiao : null
    recs.push({
      id: `rec-${lowYield.id}-tabela`,
      titulo: 'Renegociar tabela de frete',
      descricao: `${lowYield.nome}${regiaoLabel ? ` · Região ${regiaoLabel}` : ''} com yield médio R$ ${lowYield.yieldMedio}/ton — abaixo do peer group.`,
      prioridade: 'media',
      status: 'pendente',
      clienteId: lowYield.id,
      clienteNome: lowYield.nome,
      regiao: regiaoLabel ?? undefined,
      acao: 'Renegociar tabela',
      impactoEstimado: lowYield.receitaPotencial,
      createdAt: importedAt,
    })
  }

  return recs
}

function buildAlerts (clients: Client[], stats: ImportStats): Alert[] {
  const alerts: Alert[] = []
  const now = stats.importedAt

  for (const c of clients.filter(x => x.diasSemEmbarque >= 30).slice(0, 8)) {
    alerts.push({
      id: `alt-idle-${c.id}`,
      titulo: 'Cliente sem embarque há 30+ dias',
      descricao: `${c.nome} sem movimento há ${c.diasSemEmbarque} dias.`,
      severidade: c.diasSemEmbarque >= 45 ? 'critical' : 'warning',
      clienteId: c.id,
      clienteNome: c.nome,
      lido: false,
      createdAt: now,
    })
  }

  for (const c of clients.filter(x => x.healthScore < 70).sort((a, b) => a.healthScore - b.healthScore).slice(0, 5)) {
    alerts.push({
      id: `alt-hs-${c.id}`,
      titulo: 'Health Score baixo',
      descricao: `${c.nome}: score ${c.healthScore} com ${c.devolucoes} devoluções e ${c.ctesAbertos} CT-es abertos.`,
      severidade: c.healthScore < 55 ? 'critical' : 'warning',
      clienteId: c.id,
      clienteNome: c.nome,
      lido: false,
      createdAt: now,
    })
  }

  if (stats.ctesAbertos > 0) {
    alerts.push({
      id: 'alt-ctes-abertos',
      titulo: 'CT-es pendentes',
      descricao: `${stats.ctesAbertos.toLocaleString('pt-BR')} CT-es sem NÚM. FATURA na base importada.`,
      severidade: 'info',
      lido: false,
      createdAt: now,
    })
  }

  return alerts
}

export function analyzeCtes (ctes: CteDocument[], sourceName = 'upload'): AnalyticsResult {
  const now = Date.now()
  const importedAt = new Date().toISOString()
  const { map: aggs, totalValor, ctesAbertos, devolucoes, reentregas } = buildAggs(ctes)

  const stats: ImportStats = {
    totalCtes: ctes.length,
    totalClientes: aggs.size,
    totalValor,
    ctesAbertos,
    devolucoes,
    reentregas,
    importedAt,
    sourceName,
  }

  const ticketValues = [...aggs.values()].map(a => (a.count ? a.valorTotal / a.count : 0))
  const peerAvg = ticketValues.length
    ? ticketValues.reduce((s, v) => s + v, 0) / ticketValues.length
    : 0

  const clients = [...aggs.values()]
    .map(a => aggToClient(a, now, peerAvg))
    .sort((a, b) => b.receitaAnual - a.receitaAnual)

  const kpis = buildKpis(clients, stats)
  const insights = buildInsights(clients, stats, kpis)
  const recomendacoes = buildRecommendations(clients, importedAt)
  const alertas = buildAlerts(clients, stats)

  const devolucaoRate = stats.totalCtes ? stats.devolucoes / stats.totalCtes : 0
  const abertoRate = stats.totalCtes ? stats.ctesAbertos / stats.totalCtes : 0
  const modules = aiModules.map(m => {
    if (m.id === 4) {
      return { ...m, status: devolucaoRate > 0.06 ? 'critico' as const : devolucaoRate > 0.03 ? 'atencao' as const : 'ok' as const }
    }
    if (m.id === 5) {
      return { ...m, status: abertoRate > 0.05 ? 'atencao' as const : 'ok' as const }
    }
    if (m.id === 2) {
      const top5 = clients.slice(0, 5).reduce((s, c) => s + c.receitaAnual, 0)
      const conc = stats.totalValor ? top5 / stats.totalValor : 0
      return { ...m, status: conc > 0.4 ? 'atencao' as const : 'ok' as const }
    }
    return { ...m }
  })

  const dashboard: DashboardData = {
    kpis,
    insights,
    recomendacoes,
    alertas,
    clientesRisco: clients.filter(c => c.status === 'risco' || c.status === 'inativo').slice(0, 12),
    aiModules: modules,
  }

  const clientDetails: Record<string, ClientDetail> = {}
  for (const client of clients) {
    const agg = aggs.get(client.id)
    if (agg) {
      clientDetails[client.id] = detailFromAgg(client, agg, dashboard)
    }
  }

  return {
    stats,
    clients,
    dashboard,
    clientDetails,
  }
}

export function buildClientDetail (
  client: Client,
  ctes: CteDocument[],
  dashboard: DashboardData,
): ClientDetail {
  const clientCtes = ctes.filter(c => clientIdFromCodigo(c.clienteCodigo) === client.id)
  const monthlyMap = new Map<string, number>()
  const rotas = new Map<string, number>()
  const produtos = new Map<string, number>()
  const destinatarios = new Set<string>()

  for (const cte of clientCtes) {
    if (cte.dtCadastro) {
      const mk = monthKey(cte.dtCadastro)
      monthlyMap.set(mk, (monthlyMap.get(mk) || 0) + cte.valor)
    }
    const rota = `${cte.munOrigem}/${cte.ufOrigem} → ${cte.munDestino}/${cte.ufDestino}`
    rotas.set(rota, (rotas.get(rota) || 0) + 1)
    produtos.set(cte.classificacao || 'SEM CLASSIFICAÇÃO', (produtos.get(cte.classificacao || 'SEM CLASSIFICAÇÃO') || 0) + 1)
    if (cte.destinatario) destinatarios.add(cte.destinatario)
  }

  const historicoFaturamento: MonthlyMetric[] = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([key, valor]) => ({ mes: monthLabel(key), valor }))

  const movimentacoes: TimelineEvent[] = [...clientCtes]
    .sort((a, b) => new Date(b.dtCadastro).getTime() - new Date(a.dtCadastro).getTime())
    .slice(0, 8)
    .map((cte, i) => ({
      id: `mov-${client.id}-${i}`,
      data: cte.dtCadastro.slice(0, 10),
      titulo: isDevolucao(cte.tipoCte)
        ? 'Devolução'
        : isReentrega(cte.tipoCte)
          ? 'Reentrega'
          : isCteAberto(cte)
            ? 'CT-e em aberto'
            : 'Embarque / CT-e',
      descricao: `CT-e ${cte.codigo} · ${cte.munOrigem}/${cte.ufOrigem} → ${cte.munDestino}/${cte.ufDestino} · R$ ${cte.valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`,
      tipo: isDevolucao(cte.tipoCte) || isReentrega(cte.tipoCte) ? 'alerta' : 'embarque',
    }))

  const topRotas = [...rotas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([r]) => r)
  const topProdutos = [...produtos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p]) => p)

  return {
    ...client,
    historicoFaturamento,
    produtos: topProdutos,
    rotas: topRotas,
    destinatarios: destinatarios.size,
    embarquesMes: client.frequenciaEmbarques,
    movimentacoes,
    insights: [
      {
        id: `ins-${client.id}-1`,
        titulo: 'Health Score do cliente',
        descricao: `Score ${client.healthScore} com ${client.devolucoes} devoluções, ${client.reentregas} reentregas e ${client.diasSemEmbarque} dias desde o último CT-e.`,
        tipo: 'explicacao',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `ins-${client.id}-2`,
        titulo: 'Receita em risco',
        descricao: `Probabilidade de perda ${(client.probabilidadePerda * 100).toFixed(0)}% sobre faturamento de R$ ${client.receitaAnual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} → risco de R$ ${client.receitaEmRisco.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.`,
        tipo: 'risco',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
      {
        id: `ins-${client.id}-3`,
        titulo: 'Potencial estimado',
        descricao: `Potencial de expansão calculado por benchmark interno: R$ ${client.receitaPotencial.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}.`,
        tipo: 'oportunidade',
        clienteId: client.id,
        createdAt: new Date().toISOString(),
      },
    ],
    recomendacoes: dashboard.recomendacoes.filter(r => r.clienteId === client.id),
  }
}
