import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
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

router.afterEach(to => {
  const title = (to.meta.title as string) || 'Raça analise comercial'
  document.title = `${title} | Raça analise comercial`
})

export default router
