<script lang="ts" setup>
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import CiiCard from '@/components/kpi/CiiCard.vue'
  import InsightPanel from '@/components/kpi/InsightPanel.vue'
  import KpiGauge from '@/components/kpi/KpiGauge.vue'
  import { useCommercialStore } from '@/stores/commercial'
  import { useDashboardStore } from '@/stores/dashboard'
  import { formatCurrency, healthColor, priorityColor } from '@/utils/format'

  const store = useDashboardStore()
  const commercial = useCommercialStore()
  const router = useRouter()

  onMounted(() => {
    if (!store.data) store.load()
  })
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1 brand-title">
          Painel — Raça analise comercial
        </h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          Saúde da carteira, riscos, oportunidades e recomendações geradas por IA.
          <span v-if="commercial.progress" class="text-primary"> · {{ commercial.progress }}</span>
        </p>
      </div>

      <v-btn
        color="primary"
        :loading="store.loading"
        prepend-icon="mdi-refresh"
        variant="tonal"
        @click="store.load()"
      >
        Atualizar
      </v-btn>
    </div>

    <v-alert
      v-if="store.error"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ store.error }}
    </v-alert>

    <v-row v-if="store.loading && !store.kpis" class="mb-4">
      <v-col
        v-for="n in 5"
        :key="n"
        cols="12"
        lg
        md="4"
        sm="6"
      >
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <template v-if="store.kpis">
      <!-- KPI Gauges -->
      <v-card class="mb-6" rounded="lg" variant="outlined">
        <v-card-text class="pa-4">
          <v-row density="compact">
            <v-col cols="12" lg md="4" sm="6">
              <KpiGauge
                color="#43A047"
                icon="mdi-heart-pulse"
                label="Saúde da Carteira"
                tooltip="A carteira está saudável ou caminhando para uma perda de receita?"
                :value="store.kpis.saudeCarteira"
              />
            </v-col>

            <v-col cols="12" lg md="4" sm="6">
              <KpiGauge
                color="#FB8C00"
                icon="mdi-alert"
                label="Índice de Receita em Risco"
                :numeric="false"
                tooltip="Quanto da receita pode ser perdida?"
                :value="formatCurrency(store.kpis.receitaEmRisco, true)"
              />
            </v-col>

            <v-col cols="12" lg md="4" sm="6">
              <KpiGauge
                color="#1E88E5"
                icon="mdi-chart-timeline-variant-shimmer"
                label="Índice de Receita Potencial"
                :numeric="false"
                tooltip="Quanto dinheiro ainda existe dentro da carteira?"
                :value="formatCurrency(store.kpis.receitaPotencial, true)"
              />
            </v-col>

            <v-col cols="12" lg md="4" sm="6">
              <KpiGauge
                color="#1565C0"
                icon="mdi-star-four-points"
                label="Índice de Eficiência Comercial"
                tooltip="O time comercial está usando bem seu tempo?
(Receita por vendedor / Conversão / Tempo médio entre embarques / Recuperação de clientes / Crescimento líquido da carteira)"
                :value="store.kpis.eficienciaComercial"
              />
            </v-col>

            <v-col cols="12" lg md="4" sm="6">
              <KpiGauge
                color="#2E7D32"
                icon="mdi-leaf"
                label="Índice de Crescimento Sustentável"
                tooltip="Estamos crescendo com qualidade?
(Crescimento do faturamento / Crescimento do Yield / Crescimento da margem / Retenção / Qualidade operacional)"
                :value="store.kpis.crescimentoSustentavel"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- CII + Insights -->
      <v-row class="mb-2">
        <v-col cols="12" lg="4" md="5">
          <CiiCard class="h-100" :score="store.kpis.cii" />
        </v-col>

        <v-col cols="12" lg="8" md="7">
          <InsightPanel :insights="store.insights" />
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <!-- Recomendações prioritárias -->
        <v-col cols="12" lg="6">
          <v-card class="h-100" rounded="lg" variant="outlined">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Recomendações prioritárias
              </v-card-title>

              <template #append>
                <v-btn
                  color="primary"
                  size="small"
                  variant="text"
                  @click="router.push('/recomendacoes')"
                >
                  Ver todas
                </v-btn>
              </template>
            </v-card-item>

            <v-divider />

            <v-list class="bg-transparent" lines="two">
              <v-list-item
                v-for="rec in store.recomendacoes.slice(0, 4)"
                :key="rec.id"
              >
                <template #prepend>
                  <v-chip
                    class="me-3 text-uppercase"
                    :color="priorityColor(rec.prioridade)"
                    size="small"
                    variant="tonal"
                  >
                    {{ rec.prioridade }}
                  </v-chip>
                </template>

                <v-list-item-title class="font-weight-medium">
                  {{ rec.titulo }}
                </v-list-item-title>

                <v-list-item-subtitle>
                  {{ rec.clienteNome || 'Carteira geral' }}
                  <span v-if="rec.impactoEstimado">
                    · {{ formatCurrency(rec.impactoEstimado, true) }}
                  </span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card>
        </v-col>

        <!-- Clientes em risco -->
        <v-col cols="12" lg="6">
          <v-card class="h-100" rounded="lg" variant="outlined">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Clientes em risco
              </v-card-title>

              <template #append>
                <v-btn
                  color="primary"
                  size="small"
                  variant="text"
                  @click="router.push('/clientes')"
                >
                  Ver carteira
                </v-btn>
              </template>
            </v-card-item>

            <v-divider />

            <v-table density="comfortable">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Health</th>
                  <th>Risco</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="client in store.clientesRisco"
                  :key="client.id"
                  class="cursor-pointer"
                  @click="router.push(`/clientes/${client.id}`)"
                >
                  <td>
                    <div class="font-weight-medium">{{ client.nome }}</div>

                    <div class="text-caption text-medium-emphasis">
                      {{ client.vendedorNome }}
                    </div>
                  </td>

                  <td>
                    <v-chip
                      :color="healthColor(client.healthScore)"
                      size="small"
                      variant="flat"
                    >
                      {{ client.healthScore }}
                    </v-chip>
                  </td>

                  <td class="text-warning font-weight-medium">
                    {{ formatCurrency(client.receitaEmRisco, true) }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.cursor-pointer:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}
</style>
