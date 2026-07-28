<script lang="ts" setup>
  import type { Priority, Recommendation } from '@/types/commercial'
  import { computed, onMounted, ref } from 'vue'
  import { fetchRecommendations } from '@/api/directus'
  import { formatCurrency, formatDate, priorityColor } from '@/utils/format'

  const items = ref<Recommendation[]>([])
  const loading = ref(false)
  const filterPriority = ref<'all' | Priority>('all')

  const filtered = computed(() => {
    if (filterPriority.value === 'all') return items.value
    return items.value.filter(r => r.prioridade === filterPriority.value)
  })

  onMounted(async () => {
    loading.value = true
    try {
      items.value = await fetchRecommendations()
    } finally {
      loading.value = false
    }
  })
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Recomendações</h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          Ações sugeridas pela IA com prioridade e impacto estimado.
        </p>
      </div>

      <v-btn-toggle
        v-model="filterPriority"
        color="primary"
        density="comfortable"
        divided
        rounded="lg"
      >
        <v-btn size="small" value="all">Todas</v-btn>
        <v-btn size="small" value="alta">Alta</v-btn>
        <v-btn size="small" value="media">Média</v-btn>
        <v-btn size="small" value="baixa">Baixa</v-btn>
      </v-btn-toggle>
    </div>

    <v-row>
      <v-col
        v-for="rec in filtered"
        :key="rec.id"
        cols="12"
        md="6"
      >
        <v-card class="h-100" rounded="lg" variant="outlined">
          <v-card-item>
            <template #prepend>
              <v-avatar color="primary" rounded="lg" variant="tonal">
                <v-icon>mdi-lightbulb-on</v-icon>
              </v-avatar>
            </template>

            <v-card-title class="text-subtitle-1 font-weight-bold text-wrap">
              {{ rec.titulo }}
            </v-card-title>

            <v-card-subtitle>
              {{ rec.clienteNome || 'Carteira geral' }}
              <template v-if="rec.regiao"> · {{ rec.regiao }}</template>
              · {{ formatDate(rec.createdAt) }}
            </v-card-subtitle>

            <template #append>
              <v-chip
                class="text-uppercase"
                :color="priorityColor(rec.prioridade)"
                size="small"
                variant="flat"
              >
                {{ rec.prioridade }}
              </v-chip>
            </template>
          </v-card-item>

          <v-card-text>
            <p class="text-body-2 mb-3">{{ rec.descricao }}</p>

            <div class="d-flex flex-wrap align-center ga-2">
              <v-chip
                v-if="rec.regiao"
                prepend-icon="mdi-map-marker"
                size="small"
                variant="tonal"
              >
                {{ rec.regiao }}
              </v-chip>

              <v-chip color="primary" prepend-icon="mdi-flash" size="small" variant="tonal">
                {{ rec.acao }}
              </v-chip>

              <v-chip
                v-if="rec.impactoEstimado"
                color="success"
                prepend-icon="mdi-cash"
                size="small"
                variant="tonal"
              >
                Impacto {{ formatCurrency(rec.impactoEstimado, true) }}
              </v-chip>

              <v-chip class="text-capitalize" size="small" variant="outlined">
                {{ rec.status.replace('_', ' ') }}
              </v-chip>
            </div>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn color="primary" size="small" variant="tonal">
              Executar ação
            </v-btn>

            <v-btn size="small" variant="text">Adiar</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-skeleton-loader v-if="loading" class="mt-4" type="card, card" />
  </div>
</template>
