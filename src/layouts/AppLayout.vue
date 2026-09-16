<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useTheme } from 'vuetify'
  import logoIpanema from '@/assets/logo-ipanema.png'
  import { useAuthStore } from '@/stores/auth'
  import { useCommercialStore } from '@/stores/commercial'
  import { useDashboardStore } from '@/stores/dashboard'

  const drawer = ref(true)
  const rail = ref(false)
  const route = useRoute()
  const router = useRouter()
  const theme = useTheme()
  const dashboard = useDashboardStore()
  const commercial = useCommercialStore()
  const auth = useAuthStore()

  onMounted(() => {
    if (!dashboard.data) dashboard.load()
  })

  const navItems = [
    { title: 'Visão comercial', to: '/', icon: 'mdi-view-dashboard', exact: true },
    { title: 'Caixa de entrada', to: '/caixa-entrada', icon: 'mdi-email-outline' },
    { title: 'Pipeline', to: '/pipeline', icon: 'mdi-view-column-outline' },
    { title: 'Follow-ups', to: '/follow-ups', icon: 'mdi-calendar-clock-outline' },
    { title: 'Clientes', to: '/clientes', icon: 'mdi-account-group' },
    { title: 'Produtos & preços', to: '/produtos', icon: 'mdi-tag-multiple-outline' },
    { title: 'Portais', to: '/portais', icon: 'mdi-account-network-outline' },
    { title: 'Integrações', to: '/integracoes', icon: 'mdi-puzzle-outline' },
  ]

  const pageTitle = computed(() => (route.meta.title as string) || 'Ipanema CRM 2.0')
  const isDark = computed(() => theme.global.current.value.dark)
  const baseLabel = computed(() => {
    if (commercial.importing || commercial.loading) return 'Carregando base…'
    if (commercial.stats) {
      return `${commercial.stats.totalClientes.toLocaleString('pt-BR')} clientes`
    }
    return 'Base local'
  })

  function isActive (item: (typeof navItems)[0]) {
    if (item.exact) return route.path === item.to
    return route.path.startsWith(item.to)
  }

  function toggleTheme () {
    theme.global.name.value = isDark.value ? 'ipanemaLight' : 'ipanemaDark'
  }

  const authEnabled = import.meta.env.VITE_USE_MOCK === 'false'

  async function logout () {
    await auth.logout()
    await router.replace({ name: 'login' })
  }
</script>

<template>
  <v-layout class="app-layout">
    <v-navigation-drawer
      v-model="drawer"
      class="app-nav"
      :rail="rail"
      width="268"
    >
      <div class="brand-header pa-4">
        <div class="d-flex align-center ga-3">
          <div class="brand-logo-wrap" :class="{ 'brand-logo-wrap--rail': rail }">
            <img
              :src="logoIpanema"
              alt="Ipanema Rolamentos"
              class="brand-logo"
            >
          </div>

          <div v-if="!rail" class="overflow-hidden">
            <div class="brand-wordmark text-white">
              Ipanema
            </div>
            <div class="text-caption brand-subtitle">
              CRM 2.0
            </div>
          </div>
        </div>
      </div>

      <v-divider class="border-opacity-25" />

      <v-list class="px-2 py-3" density="comfortable" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :active="isActive(item)"
          class="mb-1 nav-item"
          :class="{ 'nav-item--active': isActive(item) }"
          :prepend-icon="item.icon"
          rounded="lg"
          :title="item.title"
          :to="item.to"
        >
          <template v-if="item.to === '/alertas' && dashboard.alertasNaoLidos" #append>
            <v-badge
              color="primary"
              :content="dashboard.alertasNaoLidos"
              inline
            />
          </template>
        </v-list-item>
      </v-list>

      <template #append>
        <div class="pa-3">
          <v-btn
            block
            color="white"
            :prepend-icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            variant="text"
            @click="rail = !rail"
          >
            <span v-if="!rail">Recolher</span>
          </v-btn>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar border class="app-bar" color="surface" flat height="64">
      <v-app-bar-nav-icon
        class="d-lg-none"
        @click="drawer = !drawer"
      />

      <v-toolbar-title class="brand-title font-weight-bold">
        {{ pageTitle }}
      </v-toolbar-title>

      <v-spacer />

      <v-chip
        class="me-3"
        color="secondary"
        size="small"
        variant="tonal"
      >
        {{ baseLabel }}
      </v-chip>

      <v-btn
        icon
        variant="text"
        @click="toggleTheme"
      >
        <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </v-btn>

      <v-btn
        icon
        variant="text"
        @click="router.push('/alertas')"
      >
        <v-badge
          color="primary"
          :content="dashboard.alertasNaoLidos || undefined"
          :model-value="!!dashboard.alertasNaoLidos"
        >
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>

      <v-menu v-if="authEnabled" location="bottom end">
        <template #activator="{ props }">
          <v-btn
            class="ms-1"
            v-bind="props"
            variant="text"
          >
            <v-icon class="me-1" icon="mdi-account-circle" />
            <span class="d-none d-sm-inline text-body-2">{{ auth.displayName || 'Conta' }}</span>
            <v-icon icon="mdi-chevron-down" size="18" />
          </v-btn>
        </template>
        <v-list density="compact" min-width="200">
          <v-list-item
            v-if="auth.user?.email"
            :subtitle="auth.user.email"
            title="Usuário"
          />
          <v-divider class="my-1" />
          <v-list-item
            prepend-icon="mdi-logout"
            title="Sair"
            @click="logout"
          />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main class="app-main app-shell-bg">
      <v-container class="pa-4 pa-md-6" fluid>
        <router-view />
      </v-container>
    </v-main>
  </v-layout>
</template>

<style scoped>
.app-main {
  min-height: 100vh;
}

.app-nav {
  border-right: none !important;
  background: #000 !important;
  color: #fff !important;
}

.app-nav :deep(.v-list),
.app-nav :deep(.v-list-item-title),
.app-nav :deep(.v-icon),
.app-nav :deep(.v-btn) {
  color: rgba(255, 255, 255, 0.88) !important;
}

.app-nav :deep(.v-divider) {
  border-color: rgba(255, 255, 255, 0.12) !important;
}

.brand-header {
  background: linear-gradient(180deg, rgba(198, 31, 62, 0.22), transparent);
}

.brand-logo-wrap {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #000;
  padding: 4px;
  overflow: hidden;
  border: 1px solid rgba(198, 31, 62, 0.35);
}

.brand-logo-wrap--rail {
  width: 40px;
  height: 40px;
}

.brand-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-subtitle {
  color: rgba(255, 255, 255, 0.65);
  text-transform: lowercase;
  letter-spacing: 0.02em;
}

.nav-item {
  opacity: 0.9;
}

.nav-item--active,
.app-nav :deep(.nav-item--active) {
  background: rgba(198, 31, 62, 0.22) !important;
}

.nav-item--active :deep(.v-list-item-title),
.nav-item--active :deep(.v-icon),
.app-nav :deep(.nav-item--active .v-list-item-title),
.app-nav :deep(.nav-item--active .v-icon) {
  color: #c61f3e !important;
  font-weight: 600;
}

.app-bar {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
}
</style>