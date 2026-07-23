import type { DashboardData } from '@/types/commercial'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchDashboard } from '@/api/directus'

export const useDashboardStore = defineStore('dashboard', () => {
  const data = ref<DashboardData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const kpis = computed(() => data.value?.kpis)
  const insights = computed(() => data.value?.insights ?? [])
  const recomendacoes = computed(() => data.value?.recomendacoes ?? [])
  const alertas = computed(() => data.value?.alertas ?? [])
  const alertasNaoLidos = computed(() => alertas.value.filter(a => !a.lido).length)
  const clientesRisco = computed(() => data.value?.clientesRisco ?? [])
  const aiModules = computed(() => data.value?.aiModules ?? [])

  async function load () {
    loading.value = true
    error.value = null
    try {
      data.value = await fetchDashboard()
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'Erro ao carregar dashboard'
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    kpis,
    insights,
    recomendacoes,
    alertas,
    alertasNaoLidos,
    clientesRisco,
    aiModules,
    load,
  }
})
