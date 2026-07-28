<script lang="ts" setup>
  import { onMounted } from 'vue'
  import { useDashboardStore } from '@/stores/dashboard'

  const store = useDashboardStore()

  const statusColor = {
    ok: 'success',
    atencao: 'warning',
    critico: 'error',
  } as const

  const statusLabel = {
    ok: 'Estável',
    atencao: 'Atenção',
    critico: 'Crítico',
  } as const

  const weights = [
    { label: 'Health Score', weight: '25%' },
    { label: 'Receita em risco', weight: '20%' },
    { label: 'Receita potencial', weight: '20%' },
    { label: 'Crescimento sustentável', weight: '15%' },
    { label: 'Eficiência comercial', weight: '10%' },
    { label: 'Qualidade operacional', weight: '5%' },
    { label: 'Contexto de mercado', weight: '5%' },
  ]

  onMounted(() => {
    if (!store.data) store.load()
  })
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-h5 font-weight-bold mb-1">Motor de IA</h1>

      <p class="text-body-2 text-medium-emphasis mb-0">
        Análises automáticas após consolidação — projeções, alertas, priorização e insights acionáveis.
      </p>
    </div>

    <v-alert
      class="mb-6"
      color="primary"
      icon="mdi-api"
      rounded="lg"
      variant="tonal"
    >
      Conectada ao sistema da Raça via API. Dashboard + alertas + insights.
    </v-alert>

    <v-row class="mb-4">
      <v-col
        v-for="mod in store.aiModules"
        :key="mod.id"
        cols="12"
        lg="4"
        md="6"
      >
        <v-card class="h-100" rounded="lg" variant="outlined">
          <v-card-item>
            <template #prepend>
              <v-avatar color="primary" rounded="lg" variant="tonal">
                <v-icon>{{ mod.icon }}</v-icon>
              </v-avatar>
            </template>

            <v-card-title class="text-subtitle-1 font-weight-bold text-wrap">
              {{ mod.id }}. {{ mod.titulo }}
            </v-card-title>

            <template #append>
              <v-chip
                :color="statusColor[mod.status]"
                size="small"
                variant="tonal"
              >
                {{ statusLabel[mod.status] }}
              </v-chip>
            </template>
          </v-card-item>

          <v-card-text class="text-body-2 text-medium-emphasis">
            {{ mod.descricao }}
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="7">
        <v-card rounded="lg" variant="outlined">
          <v-card-item>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              Índice de Inteligência Comercial — composição
            </v-card-title>

            <v-card-subtitle>
              Indicador proprietário (0–100) baseado em ~50 variáveis
            </v-card-subtitle>
          </v-card-item>

          <v-divider />

          <v-list class="bg-transparent">
            <v-list-item
              v-for="w in weights"
              :key="w.label"
            >
              <v-list-item-title>{{ w.label }}</v-list-item-title>

              <template #append>
                <v-chip color="primary" size="small" variant="flat">
                  {{ w.weight }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card class="h-100 text-white" color="secondary" rounded="lg">
          <v-card-text class="pa-6">
            <div class="text-caption text-uppercase mb-2" style="opacity: 0.75">
              Outputs do motor
            </div>

            <div class="d-flex flex-column ga-4">
              <div
                v-for="out in [
                  { icon: 'mdi-chart-timeline-variant', label: 'Projeções' },
                  { icon: 'mdi-bell-alert', label: 'Alertas' },
                  { icon: 'mdi-sort-ascending', label: 'Priorização' },
                  { icon: 'mdi-lightbulb-on', label: 'Insights acionáveis' },
                ]"
                :key="out.label"
                class="d-flex align-center ga-3"
              >
                <v-avatar color="rgba(255,255,255,0.15)" size="40">
                  <v-icon>{{ out.icon }}</v-icon>
                </v-avatar>

                <span class="text-subtitle-1 font-weight-medium">{{ out.label }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
