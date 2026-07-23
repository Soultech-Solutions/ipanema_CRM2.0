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
          meta: { title: 'Dashboard', icon: 'mdi-view-dashboard' },
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
  const title = (to.meta.title as string) || 'Raça analise comercial'
  document.title = `${title} | Raça analise comercial`
})

export default router
