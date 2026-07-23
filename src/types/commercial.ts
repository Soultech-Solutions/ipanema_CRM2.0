export type Priority = 'alta' | 'media' | 'baixa'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type RecommendationStatus = 'pendente' | 'em_andamento' | 'concluida'

export interface ExecutiveKpis {
  saudeCarteira: number
  receitaEmRisco: number
  receitaPotencial: number
  eficienciaComercial: number
  crescimentoSustentavel: number
  cii: number
}

export interface Insight {
  id: string
  titulo: string
  descricao: string
  tipo: 'risco' | 'oportunidade' | 'explicacao' | 'alerta'
  clienteId?: string
  createdAt: string
}

export interface Recommendation {
  id: string
  titulo: string
  descricao: string
  prioridade: Priority
  status: RecommendationStatus
  clienteId?: string
  clienteNome?: string
  acao: string
  impactoEstimado?: number
  createdAt: string
}

export interface Alert {
  id: string
  titulo: string
  descricao: string
  severidade: AlertSeverity
  clienteId?: string
  clienteNome?: string
  lido: boolean
  createdAt: string
}

export interface Client {
  id: string
  /** Código do pagador na base Raça (ex.: CLIENTE 83347) */
  nome: string
  documento: string
  /** Proxy de segmento: CLASSIFICAÇÃO predominante ou GRUPO CLIENTE */
  segmento: string
  grupoCliente?: string
  vendedorId: string
  vendedorNome: string
  healthScore: number
  receitaAnual: number
  probabilidadePerda: number
  receitaEmRisco: number
  receitaPotencial: number
  ticketMedio: number
  frequenciaEmbarques: number
  /** Yield médio R$/ton derivado de VALOR / PESO */
  yieldMedio: number
  /** Contagem de TIPO CTE = DEVOLUÇÃO * */
  devolucoes: number
  /** Contagem de TIPO CTE = REENTREGA */
  reentregas: number
  /** CT-es sem NÚM. FATURA */
  ctesAbertos: number
  diasSemEmbarque: number
  status: 'ativo' | 'risco' | 'inativo'
}

export interface ClientDetail extends Client {
  historicoFaturamento: MonthlyMetric[]
  produtos: string[]
  rotas: string[]
  destinatarios: number
  embarquesMes: number
  movimentacoes: TimelineEvent[]
  insights: Insight[]
  recomendacoes: Recommendation[]
}

export interface MonthlyMetric {
  mes: string
  valor: number
  meta?: number
}

export interface TimelineEvent {
  id: string
  data: string
  titulo: string
  descricao: string
  tipo: 'embarque' | 'visita' | 'proposta' | 'alerta' | 'negociacao'
}

export interface Seller {
  id: string
  nome: string
  email: string
  clientesAtivos: number
  faturamentoMes: number
  metaMes: number
  eficiencia: number
  visitas: number
  propostas: number
  conversao: number
}

export interface AiModule {
  id: number
  titulo: string
  descricao: string
  icon: string
  status: 'ok' | 'atencao' | 'critico'
}

export interface DashboardData {
  kpis: ExecutiveKpis
  insights: Insight[]
  recomendacoes: Recommendation[]
  alertas: Alert[]
  clientesRisco: Client[]
  aiModules: AiModule[]
}
