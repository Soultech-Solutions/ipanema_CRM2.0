<script lang="ts" setup>
  import type { NavItem } from '@/config/navigation'
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay, useTheme } from 'vuetify'
  import logoIpanema from '@/assets/logo-ipanema.png'
  import { decisionFlow, mainNav, mobileNav, operationsNav } from '@/config/navigation'
  import { useAuthStore } from '@/stores/auth'
  import { useCommercialStore } from '@/stores/commercial'
  import { useDashboardStore } from '@/stores/dashboard'

  const route = useRoute()
  const router = useRouter()
  const theme = useTheme()
  const { mdAndDown } = useDisplay()
  const dashboard = useDashboardStore()
  const commercial = useCommercialStore()
  const auth = useAuthStore()

  const drawer = ref(true)
  const showOperations = ref(route.meta.group === 'operations')

  onMounted(() => {
    if (!dashboard.data) dashboard.load()
  })

  const isDark = computed(() => theme.global.current.value.dark)
  const pageTitle = computed(() => (route.meta.title as string) || 'Gestão Ipanema')
  const pageSubtitle = computed(() => route.meta.subtitle as string | undefined)
  /** Header do Figma (título + subtítulo + período) — ligado por rota, conforme cada tela é migrada */
  const showFigmaHeader = computed(() => route.meta.figmaHeader === true)

  const periodLabel = computed(() => {
    const d = new Date()
    const m = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    return `${m.charAt(0).toUpperCase()}${m.slice(1)}/${d.getFullYear()}`
  })

  const baseLabel = computed(() => {
    if (commercial.importing || commercial.loading) return 'Carregando base…'
    if (commercial.stats) return `${commercial.stats.totalClientes.toLocaleString('pt-BR')} clientes`
    return 'Base local'
  })

  const alertCount = computed(() => dashboard.alertasNaoLidos || 0)

  function isActive (item: NavItem) {
    return item.exact ? route.path === item.to : route.path.startsWith(item.to)
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
    <!-- Sidebar (desktop) -->
    <v-navigation-drawer
      v-if="!mdAndDown"
      class="app-nav"
      permanent
      width="240"
    >
      <div class="brand">
        <img alt="Ipanema Rolamentos" class="brand__logo" :src="logoIpanema">
        <div>
          <div class="brand__name">IPANEMA</div>
          <div class="brand__sub">ROLAMENTOS</div>
        </div>
        <span class="brand__since">Desde 1969</span>
      </div>
      <div class="brand-product">Gestão Ipanema</div>

      <v-list class="px-4" density="comfortable" nav>
        <v-list-item
          v-for="item in mainNav"
          :key="item.to"
          class="nav-item"
          :class="{ 'nav-item--active': isActive(item) }"
          rounded="lg"
          :title="item.title"
          :to="item.to"
        >
          <template v-if="item.badge === 'alerts' && alertCount" #append>
            <span class="nav-badge">{{ alertCount }}</span>
          </template>
        </v-list-item>

        <!-- Telas operacionais ainda fora do Figma -->
        <v-list-item
          class="nav-item nav-item--muted mt-2"
          :prepend-icon="showOperations ? 'mdi-chevron-down' : 'mdi-chevron-right'"
          title="Operação"
          @click="showOperations = !showOperations"
        />
        <template v-if="showOperations">
          <v-list-item
            v-for="item in operationsNav"
            :key="item.to"
            class="nav-item nav-item--sub"
            :class="{ 'nav-item--active': isActive(item) }"
            rounded="lg"
            :title="item.title"
            :to="item.to"
          />
        </template>
      </v-list>

      <v-divider class="mx-4 my-2" />

      <div class="flow">
        <div class="flow__title">DECISÃO COMERCIAL</div>
        <div v-for="step in decisionFlow" :key="step" class="flow__step">
          <span class="flow__dot" />{{ step }}
        </div>
      </div>

      <template #append>
        <div class="period">
          <div class="period__label">Período analisado</div>
          <span class="period__chip">{{ periodLabel }}</span>
          <div class="period__base">{{ baseLabel }}</div>
        </div>
      </template>
    </v-navigation-drawer>

    <!-- Topbar -->
    <v-app-bar class="app-bar" flat :height="mdAndDown ? 72 : (showFigmaHeader ? 82 : 64)">
      <template v-if="mdAndDown">
        <img alt="Ipanema Rolamentos" class="brand__logo ms-4" :src="logoIpanema">
        <div class="ms-3">
          <div class="brand__name">IPANEMA</div>
          <div class="brand__sub">ROLAMENTOS</div>
        </div>
        <v-spacer />
        <span class="period__chip me-2">{{ periodLabel }}</span>
      </template>

      <template v-else>
        <div class="ms-8">
          <div class="ip-h1 topbar-title">{{ pageTitle }}</div>
          <div v-if="showFigmaHeader && pageSubtitle" class="ip-card-subtitle">{{ pageSubtitle }}</div>
        </div>
        <v-spacer />
        <template v-if="showFigmaHeader">
          <v-btn class="me-2" color="primary" size="small" variant="outlined">Últimos 30 dias</v-btn>
          <v-btn class="me-4" color="primary" size="small" variant="outlined">Comparar período</v-btn>
        </template>
        <v-btn icon variant="text" @click="toggleTheme">
          <v-icon>{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>
        <v-menu v-if="authEnabled" location="bottom end">
          <template #activator="{ props }">
            <v-btn class="ms-1 me-4" v-bind="props" variant="text">
              <v-icon class="me-1" icon="mdi-account-circle" />
              <span class="text-body-2">{{ auth.displayName || 'Conta' }}</span>
              <v-icon icon="mdi-chevron-down" size="18" />
            </v-btn>
          </template>
          <v-list density="compact" min-width="200">
            <v-list-item v-if="auth.user?.email" :subtitle="auth.user.email" title="Usuário" />
            <v-divider class="my-1" />
            <v-list-item prepend-icon="mdi-logout" title="Sair" @click="logout" />
          </v-list>
        </v-menu>
      </template>
    </v-app-bar>

    <v-main class="app-main">
      <v-container class="pa-4 pa-md-8" fluid>
        <!-- Título no mobile (a topbar mobile só tem marca + período) -->
        <h1 v-if="mdAndDown" class="ip-h2 mb-4">{{ pageTitle }}</h1>
        <router-view />
      </v-container>
    </v-main>

    <!-- Barra inferior (mobile) -->
    <v-bottom-navigation v-if="mdAndDown" class="bottom-nav" grow height="56">
      <v-btn v-for="item in mobileNav" :key="item.to" :to="item.to" :value="item.to">
        <v-badge
          color="error"
          :content="alertCount"
          :model-value="item.badge === 'alerts' && alertCount > 0"
        >
          <v-icon :icon="item.icon" />
        </v-badge>
        <span>{{ item.title }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>

<style scoped>
.app-main { min-height: 100vh; background: var(--ip-bg); }
.app-nav { background: #fff !important; border-right: 1px solid var(--ip-border) !important; }
.app-bar { background: #fff !important; border-bottom: 1px solid var(--ip-border) !important; }
.topbar-title { font-size: 22px; line-height: 1.2; }

.brand { display: flex; align-items: center; gap: 12px; padding: 18px 24px 4px; position: relative; }
.brand__logo { width: 36px; height: 36px; object-fit: contain; }
.brand__name { font-weight: 700; font-size: 15px; color: var(--ip-navy); line-height: 1.1; letter-spacing: 0.04em; }
.brand__sub { font-weight: 600; font-size: 11px; color: var(--ip-red); line-height: 1.3; letter-spacing: 0.08em; }
.brand__since { position: absolute; top: 8px; right: 24px; font-size: 9px; color: var(--ip-gold); font-weight: 600; }
.brand-product { padding: 14px 24px 12px; font-size: 13px; font-weight: 600; color: var(--ip-text-muted); }

.nav-item { color: var(--ip-text-muted); font-weight: 500; min-height: 40px; }
.nav-item--active { background: var(--ip-tint-blue) !important; color: var(--ip-navy) !important; font-weight: 600; }
.nav-item--muted { font-size: 12px; opacity: 0.8; }
.nav-item--sub { padding-left: 28px !important; font-size: 13px; }
.nav-badge { background: var(--ip-red); color: #fff; font-size: 11px; font-weight: 700; min-width: 24px; height: 22px; padding: 0 7px; border-radius: 11px; display: inline-flex; align-items: center; justify-content: center; }

.flow { padding: 12px 24px; }
.flow__title { font-size: 11px; font-weight: 700; color: var(--ip-text-muted); letter-spacing: 0.06em; margin-bottom: 10px; }
.flow__step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--ip-text); padding: 6px 0; }
.flow__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ip-gold); }

.period { padding: 16px 24px 20px; }
.period__label { font-size: 12px; color: var(--ip-text-muted); margin-bottom: 8px; }
.period__chip { display: inline-flex; align-items: center; height: 28px; padding: 0 14px; border-radius: 14px; background: var(--ip-tint-blue); color: var(--ip-navy); font-size: 12px; font-weight: 600; }
.period__base { margin-top: 10px; font-size: 11px; color: var(--ip-text-muted); }

.bottom-nav { border-top: 1px solid var(--ip-border); }
</style>