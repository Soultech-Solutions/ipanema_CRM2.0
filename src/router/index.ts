import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Visão comercial', icon: 'mdi-view-dashboard' },
        },
        {
          path: 'caixa-entrada',
          name: 'inbox',
          component: () => import('@/views/CaixaEntradaView.vue'),
          meta: { title: 'Caixa de entrada', icon: 'mdi-email-outline' },
        },
        {
          path: 'pipeline',
          name: 'pipeline',
          component: () => import('@/views/PipelineView.vue'),
          meta: { title: 'Pipeline', icon: 'mdi-view-column-outline' },
        },
        {
          path: 'follow-ups',
          name: 'follow-ups',
          component: () => import('@/views/FollowUpsView.vue'),
          meta: { title: 'Follow-ups', icon: 'mdi-calendar-clock-outline' },
        },
        {
          path: 'cotacao',
          name: 'quote-builder',
          component: () => import('@/views/MontarCotacaoView.vue'),
          meta: { title: 'Montar cotação' },
        },
        {
          path: 'clientes',
          name: 'clients',
          component: () => import('@/views/ClientsView.vue'),
          meta: { title: 'Clientes', icon: 'mdi-account-group' },
        },
        {
          path: 'clientes/:id',
          name: 'client-detail',
          component: () => import('@/views/ClientDetailView.vue'),
          meta: { title: 'Detalhe do Cliente', icon: 'mdi-account' },
        },
        {
          path: 'produtos',
          name: 'products',
          component: () => import('@/views/PlaceholderView.vue'),
          props: { title: 'Produtos & preços', icon: 'mdi-tag-multiple-outline', description: 'Catálogo de produtos, preços e o "de-para" de nomes usados pelos clientes.' },
          meta: { title: 'Produtos & preços', icon: 'mdi-tag-multiple-outline' },
        },
        {
          path: 'portais',
          name: 'portals',
          component: () => import('@/views/PlaceholderView.vue'),
          props: { title: 'Portais', icon: 'mdi-account-network-outline', description: 'Respostas assistidas por IA via portal do cliente.' },
          meta: { title: 'Portais', icon: 'mdi-account-network-outline' },
        },
        {
          path: 'integracoes',
          name: 'integrations',
          component: () => import('@/views/PlaceholderView.vue'),
          props: { title: 'Integrações', icon: 'mdi-puzzle-outline', description: 'Conexões com e-mail, ERP e outras fontes de dados.' },
          meta: { title: 'Integrações', icon: 'mdi-puzzle-outline' },
        },
        {
          path: 'base-dados',
          name: 'database',
          component: () => import('@/views/DatabaseView.vue'),
          meta: { title: 'Base de Dados', icon: 'mdi-database' },
        },
        {
          path: 'motor-ia',
          name: 'ai-engine',
          component: () => import('@/views/AiEngineView.vue'),
          meta: { title: 'Motor de IA', icon: 'mdi-brain' },
        },
        {
          path: 'analista',
          name: 'analyst',
          component: () => import('@/views/AnalystChatView.vue'),
          meta: { title: 'Analista Comercial', icon: 'mdi-robot-outline' },
        },
        {
          path: 'recomendacoes',
          name: 'recommendations',
          component: () => import('@/views/RecommendationsView.vue'),
          meta: { title: 'Recomendações', icon: 'mdi-lightbulb-on' },
        },
        {
          path: 'alertas',
          name: 'alerts',
          component: () => import('@/views/AlertsView.vue'),
          meta: { title: 'Alertas', icon: 'mdi-bell-alert' },
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
    if (ok) return { path: '/' }
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

  if (isPublic) return true
  return true
})

router.afterEach(to => {
  const title = (to.meta.title as string) || 'Ipanema CRM 2.0'
  document.title = `${title} | Ipanema CRM 2.0`
})

export default router