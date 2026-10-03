export interface NavItem {
  title: string
  to: string
  icon: string
  exact?: boolean
  badge?: 'alerts'
}

/** Navegação principal — Figma "Gestão Ipanema" (10 itens, nesta ordem) */
export const mainNav: NavItem[] = [
  { title: 'Executivo', to: '/', icon: 'mdi-view-dashboard-outline', exact: true },
  { title: 'Funil Comercial', to: '/funil', icon: 'mdi-filter-variant' },
  { title: 'Clientes', to: '/clientes', icon: 'mdi-account-group-outline' },
  { title: 'Vendedores', to: '/vendedores', icon: 'mdi-account-tie-outline' },
  { title: 'Preços & Margem', to: '/precos-margem', icon: 'mdi-percent-outline' },
  { title: 'Marcas & Produtos', to: '/marcas-produtos', icon: 'mdi-tag-multiple-outline' },
  { title: 'Mercado & Segmentos', to: '/mercado-segmentos', icon: 'mdi-chart-bubble' },
  { title: 'Oportunidades', to: '/oportunidades', icon: 'mdi-lightbulb-on-outline' },
  { title: 'Alertas', to: '/alertas', icon: 'mdi-bell-alert-outline', badge: 'alerts' },
  { title: 'Analista IA', to: '/analista', icon: 'mdi-robot-outline' },
]

/** Telas operacionais que existem no projeto mas NÃO estão no Figma novo (decisão pendente) */
export const operationsNav: NavItem[] = [
  { title: 'Caixa de entrada', to: '/caixa-entrada', icon: 'mdi-email-outline' },
  { title: 'Pipeline', to: '/pipeline', icon: 'mdi-view-column-outline' },
  { title: 'Follow-ups', to: '/follow-ups', icon: 'mdi-calendar-clock-outline' },
  { title: 'Produtos & preços', to: '/produtos', icon: 'mdi-tag-outline' },
  { title: 'Portais', to: '/portais', icon: 'mdi-account-network-outline' },
  { title: 'Integrações', to: '/integracoes', icon: 'mdi-puzzle-outline' },
  { title: 'Base de dados', to: '/base-dados', icon: 'mdi-database-outline' },
  { title: 'Motor de IA', to: '/motor-ia', icon: 'mdi-brain' },
]

/** Barra inferior mobile (Figma M01–M04) */
export const mobileNav: NavItem[] = [
  { title: 'Início', to: '/', icon: 'mdi-home-outline', exact: true },
  { title: 'Oportunidades', to: '/oportunidades', icon: 'mdi-lightbulb-on-outline' },
  { title: 'Alertas', to: '/alertas', icon: 'mdi-bell-alert-outline', badge: 'alerts' },
  { title: 'IA', to: '/analista', icon: 'mdi-robot-outline' },
]

/** Fluxo exibido na sidebar: "Decisão comercial" */
export const decisionFlow = ['Dado', 'Insight', 'Oportunidade', 'Ação', 'Resultado'] as const