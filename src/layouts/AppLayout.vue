<script lang="ts" setup>
  import type { NavItem } from '@/config/navigation'
  import { computed, onMounted, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useDisplay, useTheme } from 'vuetify'
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

  const showOperations = ref(route.meta.group === 'operations')

  onMounted(() => {
    if (!dashboard.data) dashboard.load()
  })

  const isDark = computed(() => theme.global.current.value.dark)
  const pageTitle = computed(() => (route.meta.title as string) || 'Gestão Ipanema')
  const pageSubtitle = computed(() => route.meta.subtitle as string | undefined)
  /** Header do Figma (título + subtítulo + período) — ligado por rota, conforme cada tela é migrada */
  const showFigmaHeader = computed(() => route.meta.figmaHeader === true)

  function isActive (item: NavItem) {
    return item.exact ? route.path === item.to : route.path.startsWith(item.to)
  }

  /** No mobile o título é o nome curto do item da navegação (Alertas, Analista IA...) */
  const mobileTitle = computed(() => {
    const item = [...mainNav, ...operationsNav].find(i => isActive(i))
    return item?.title ?? pageTitle.value
  })

  const periodDate = new Date()
  const periodMonth = (() => {
    const m = periodDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    return `${m.charAt(0).toUpperCase()}${m.slice(1)}`
  })()
  const periodLabel = `${periodMonth}/${periodDate.getFullYear()}`
  const periodLabelShort = `${periodMonth}/${String(periodDate.getFullYear()).slice(2)}`

  const baseLabel = computed(() => {
    if (commercial.importing || commercial.loading) return 'Carregando base…'
    if (commercial.stats) return `${commercial.stats.totalClientes.toLocaleString('pt-BR')} clientes`
    return 'Base local'
  })

  const alertCount = computed(() => dashboard.alertasNaoLidos || 0)

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
        <div>
          <div class="brand__name">IPANEMA</div>
          <div class="brand__sub">ROLAMENTOS</div>
        </div>
        <span class="brand__since">DESDE 1969</span>
      </div>
      <div class="brand-product">Gestão Ipanema</div>

      <v-list class="px-4" density="comfortable" nav>
        <v-list-item
          v-for="item in mainNav"
          :key="item.to"
          :active="isActive(item)"
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
            :active="isActive(item)"
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
        <div
          v-for="(step, i) in decisionFlow"
          :key="step"
          class="flow__step"
          :class="{ 'flow__step--result': i === decisionFlow.length - 1 }"
        >
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
    <v-app-bar class="app-bar" flat :height="mdAndDown ? 64 : (showFigmaHeader ? 82 : 64)">
      <template v-if="mdAndDown">
        <div class="brand brand--mobile">
          <div>
            <div class="brand__name">IPANEMA</div>
            <div class="brand__sub">ROLAMENTOS</div>
          </div>
        </div>
        <v-spacer />
        <span class="period__chip me-4">{{ periodLabelShort }}</span>
      </template>

      <template v-else>
        <div class="ms-8">
          <div class="ip-h1 topbar-title">{{ pageTitle }}</div>
          <div v-if="showFigmaHeader && pageSubtitle" class="ip-card-subtitle mt-1">{{ pageSubtitle }}</div>
        </div>
        <v-spacer />
        <template v-if="showFigmaHeader">
          <v-btn class="period-btn me-2" size="small" variant="flat">Últimos 30 dias</v-btn>
          <v-btn class="period-btn me-4" size="small" variant="flat">Comparar período</v-btn>
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
        <!-- Título no mobile: nome curto + "Gestão Ipanema" (Figma M01–M04) -->
        <div v-if="mdAndDown" class="m-head">
          <h1 class="m-head__title">{{ mobileTitle }}</h1>
          <div class="m-head__sub">Gestão Ipanema</div>
        </div>
        <router-view />
      </v-container>
    </v-main>

    <!-- Barra inferior (mobile) -->
    <v-bottom-navigation
      v-if="mdAndDown"
      class="bottom-nav"
      color="error"
      grow
      height="60"
    >
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

.brand { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 24px 0; }
.brand--mobile { padding: 0 0 0 16px; }
.brand__name { font-weight: 800; font-size: 22px; color: var(--ip-red); line-height: 1; letter-spacing: 0.01em; }
.brand__sub { font-weight: 700; font-size: 9px; color: var(--ip-red); line-height: 1.6; letter-spacing: 0.12em; }
.brand__since { font-size: 7px; color: var(--ip-gold); font-weight: 600; letter-spacing: 0.08em; }
.brand-product { padding: 12px 24px 14px; font-size: 12px; font-weight: 500; color: var(--ip-text-muted); }

.nav-item { color: var(--ip-text); font-weight: 500; min-height: 40px; margin-bottom: 4px; }
.nav-item :deep(.v-list-item-title) { font-size: 13px; }
.nav-item :deep(.v-list-item__overlay) { opacity: 0 !important; }
.nav-item:hover { background: var(--ip-bg); }
.nav-item--active { background: var(--ip-navy) !important; color: #fff !important; font-weight: 600; }
.nav-item--active:hover { background: var(--ip-navy) !important; }
.nav-item--muted { font-size: 12px; color: var(--ip-text-muted); }
.nav-item--sub { padding-left: 28px !important; }
.nav-badge { background: var(--ip-tint-red); color: var(--ip-red); font-size: 11px; font-weight: 700; min-width: 28px; height: 24px; padding: 0 9px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; }

.flow { padding: 12px 24px; }
.flow__title { font-size: 9px; font-weight: 600; color: var(--ip-text-muted); letter-spacing: 0.06em; margin-bottom: 8px; }
.flow__step { display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--ip-text); padding: 6px 0; }
.flow__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ip-gold); }
.flow__step--result { color: var(--ip-green); font-weight: 600; }
.flow__step--result .flow__dot { background: var(--ip-green); }

.period { padding: 16px 24px 20px; }
.period__label { font-size: 9px; color: var(--ip-text-muted); margin-bottom: 8px; }
.period__chip { display: inline-flex; align-items: center; height: 28px; padding: 0 14px; border-radius: 14px; background: var(--ip-tint-blue); color: var(--ip-navy); font-size: 11px; font-weight: 600; }
.period__base { margin-top: 10px; font-size: 11px; color: var(--ip-text-muted); }

.period-btn { background: var(--ip-bg) !important; color: var(--ip-text) !important; border-radius: 14px !important; font-size: 11px; font-weight: 600; letter-spacing: 0; text-transform: none; }

.m-head { margin-bottom: 16px; }
.m-head__title { font-size: 22px; font-weight: 700; line-height: 1.2; color: var(--ip-text); }
.m-head__sub { margin-top: 4px; font-size: 11px; color: var(--ip-text-muted); }

.bottom-nav { border-top: 1px solid var(--ip-border); }
.bottom-nav :deep(.v-btn) { font-size: 11px; font-weight: 600; text-transform: none; letter-spacing: 0; }
</style>