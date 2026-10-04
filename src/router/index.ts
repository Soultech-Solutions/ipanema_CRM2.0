import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/**
 * meta.figmaHeader: true → o AppLayout renderiza título + subtítulo + período (Figma).
 * Ligue por rota à medida que a view for migrada (e remova o <h1> próprio da view).
 * meta.group: 'operations' → telas operacionais fora do Figma novo.
 */
const placeholder = (title: string, icon: string, description: string) => ({
  component: () => import('@/views/PlaceholderView.vue'),
  props: { title, icon, description },
})

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Login', public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        // ── Figma novo ───────────────────────────────────────────────
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Executivo', subtitle: 'Visão consolidada da operação comercial e das prioridades de decisão.', figmaHeader: true },
        },
        {
          path: 'funil',
          name: 'funnel',
          component: () => import('@/views/FunilComercialView.vue'),
          meta: { title: 'Funil Comercial', subtitle: 'Conversão, velocidade e recuperação das cotações.', figmaHeader: true },
        },
        {
          path: 'clientes',
          name: 'clients',
          component: () => import('@/views/ClientsView.vue'),
          meta: { title: 'Clientes', subtitle: 'Visão 360º da carteira, risco, crescimento e potencial.', figmaHeader: true },
        },
        {
          path: 'clientes/:id',
          name: 'client-detail',
          component: () => import('@/views/ClientDetailView.vue'),
          meta: { title: 'Detalhe do Cliente' },
        },
        {
          path: 'vendedores',
          name: 'sellers',
          component: () => import('@/views/VendedoresView.vue'), 
          meta: { title: 'Vendedores', subtitle: 'Performance, qualidade de carteira e oportunidades de evolução.', figmaHeader: true },
        },
        {
          path: 'precos-margem',
          name: 'pricing',
          component: () => import('@/views/PrecosMargemView.vue'),
          meta: { title: 'Preços, Markup e Margem', subtitle: 'Rentabilidade por cliente, vendedor e produto — com foco em decisão.', figmaHeader: true },
        },
        {
          path: 'marcas-produtos',
          name: 'brands-products',
          ...placeholder('Marcas e Produtos', 'mdi-tag-multiple-outline', 'Desempenho, crescimento e potencial de expansão do portfólio.'),
          meta: { title: 'Marcas e Produtos', subtitle: 'Desempenho, crescimento e potencial de expansão do portfólio.', figmaHeader: true },
        },
        {
          path: 'mercado-segmentos',
          name: 'market',
          ...placeholder('Mercado e Segmentos', 'mdi-chart-bubble', 'Onde a Ipanema cresce, perde espaço e ainda é pouco explorada.'),
          meta: { title: 'Mercado e Segmentos', subtitle: 'Onde a Ipanema cresce, perde espaço e ainda é pouco explorada.', figmaHeader: true },
        },
        {
          path: 'oportunidades',
          name: 'opportunities',
          component: () => import('@/views/RecommendationsView.vue'),
          meta: { title: 'Oportunidades', subtitle: 'Central de ações comerciais identificadas pela plataforma.' },
        },
        { path: 'recomendacoes', redirect: '/oportunidades' },
        {
          path: 'alertas',
          name: 'alerts',
          component: () => import('@/views/AlertsView.vue'),
          meta: { title: 'Central de Alertas', subtitle: 'Situações que exigem ação antes de virarem perda comercial.' },
        },
        {
          path: 'analista',
          name: 'analyst',
          component: () => import('@/views/AnalystChatView.vue'),
          meta: { title: 'Analista Comercial com IA', subtitle: 'Pergunte, entenda causas e transforme resposta em ação.' },
        },

        // ── Operação (fora do Figma novo — decisão pendente) ─────────
        {
          path: 'caixa-entrada',
          name: 'inbox',
          component: () => import('@/views/CaixaEntradaView.vue'),
          meta: { title: 'Caixa de entrada', group: 'operations' },
        },
        {
          path: 'pipeline',
          name: 'pipeline',
          component: () => import('@/views/PipelineView.vue'),
          meta: { title: 'Pipeline', group: 'operations' },
        },
        {
          path: 'oportunidades/:id',
          name: 'opportunity-detail',
          component: () => import('@/views/OportunidadeDetailView.vue'),
          meta: { title: 'Oportunidade', group: 'operations' },
        },
        {
          path: 'follow-ups',
          name: 'follow-ups',
          component: () => import('@/views/FollowUpsView.vue'),
          meta: { title: 'Follow-ups', group: 'operations' },
        },
        {
          path: 'cotacao',
          name: 'quote-builder',
          component: () => import('@/views/MontarCotacaoView.vue'),
          meta: { title: 'Montar cotação', group: 'operations' },
        },
        {
          path: 'proposta',
          name: 'proposal-ready',
          component: () => import('@/views/PropostaProntaView.vue'),
          meta: { title: 'Proposta pronta para envio', group: 'operations' },
        },
        {
          path: 'produtos',
          name: 'products',
          component: () => import('@/views/ProdutosView.vue'),
          meta: { title: 'Produtos & preços', group: 'operations' },
        },
        {
          path: 'portais',
          name: 'portals',
          component: () => import('@/views/PortalRespostaView.vue'),
          meta: { title: 'Portais', group: 'operations' },
        },
        {
          path: 'integracoes',
          name: 'integrations',
          ...placeholder('Integrações', 'mdi-puzzle-outline', 'Conexões com e-mail, ERP e outras fontes de dados.'),
          meta: { title: 'Integrações', group: 'operations' },
        },
        {
          path: 'base-dados',
          name: 'database',
          component: () => import('@/views/DatabaseView.vue'),
          meta: { title: 'Base de Dados', group: 'operations' },
        },
        {
          path: 'motor-ia',
          name: 'ai-engine',
          component: () => import('@/views/AiEngineView.vue'),
          meta: { title: 'Motor de IA', group: 'operations' },
        },
      ],
    },
  ],
})

router.beforeEach(async to => {
  const auth = useAuthStore()
  const authRequired = import.meta.env.VITE_USE_MOCK === 'false'
  const isPublic = to.matched.some(r => r.meta.public)
  const requiresAuth = authRequired && to.matched.some(r => r.meta.requiresAuth)

  if (requiresAuth && !auth.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.name === 'login' && !authRequired) {
    return { path: '/' }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    const ok = await auth.hydrate()
    if (ok) {
      return { path: '/' }
    }
  }

  if (requiresAuth && auth.isAuthenticated && !auth.user) {
    const ok = await auth.hydrate()
    if (!ok) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }
  }

  if (isPublic) {
    return true
  }
  return true
})

router.afterEach(to => {
  const title = (to.meta.title as string) || 'Gestão Ipanema'
  document.title = `${title} | Gestão Ipanema`
})

export default router