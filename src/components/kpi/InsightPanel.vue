<script lang="ts" setup>
  import type { Insight } from '@/types/commercial'

  defineProps<{
    insights: Insight[]
  }>()

  const typeIcon: Record<string, string> = {
    risco: 'mdi-alert-circle',
    oportunidade: 'mdi-trending-up',
    explicacao: 'mdi-brain',
    alerta: 'mdi-bell',
  }

  const typeColor: Record<string, string> = {
    risco: 'error',
    oportunidade: 'success',
    explicacao: 'primary',
    alerta: 'warning',
  }
</script>

<template>
  <v-card class="insight-panel h-100" rounded="lg" variant="outlined">
    <v-card-item>
      <template #prepend>
        <v-avatar color="primary" rounded="lg" variant="tonal">
          <v-icon>mdi-brain</v-icon>
        </v-avatar>
      </template>

      <v-card-title class="text-subtitle-1 font-weight-bold">
        Insights da IA
      </v-card-title>

      <v-card-subtitle>
        IA explica a variação do índice e recomenda ações.
      </v-card-subtitle>
    </v-card-item>

    <v-divider />

    <v-card-text>
      <v-list class="bg-transparent pa-0" lines="three">
        <v-list-item
          v-for="insight in insights"
          :key="insight.id"
          class="px-0 mb-1"
        >
          <template #prepend>
            <v-icon
              class="me-3"
              :color="typeColor[insight.tipo]"
              size="22"
            >
              {{ typeIcon[insight.tipo] }}
            </v-icon>
          </template>

          <v-list-item-title class="font-weight-medium text-wrap">
            {{ insight.titulo }}
          </v-list-item-title>

          <v-list-item-subtitle class="text-wrap mt-1">
            {{ insight.descricao }}
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <v-divider class="my-3" />

      <div class="d-flex flex-column ga-2">
        <div class="d-flex align-center text-body-2 text-medium-emphasis">
          <v-icon class="me-2" color="success" size="16">mdi-check-circle</v-icon>
          Recalcula diariamente
        </div>

        <div class="d-flex align-center text-body-2 text-medium-emphasis">
          <v-icon class="me-2" color="success" size="16">mdi-check-circle</v-icon>
          Aponta riscos e oportunidades
        </div>

        <div class="d-flex align-center text-body-2 text-medium-emphasis">
          <v-icon class="me-2" color="success" size="16">mdi-check-circle</v-icon>
          Sugere ações de maior retorno
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>
