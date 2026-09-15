<script lang="ts" setup>
  import { computed, onMounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import SimpleBarChart from '@/components/charts/SimpleBarChart.vue'
  import KpiGauge from '@/components/kpi/KpiGauge.vue'
  import { useClientsStore } from '@/stores/clients'
  import {
    formatCurrency,
    formatDate,
    formatPercent,
    priorityColor,
  } from '@/utils/format'

  const route = useRoute()
  const router = useRouter()
  const store = useClientsStore()

  const clientId = computed(() => route.params.id as string)

  const timelineIcon: Record<string, string> = {
    embarque: 'mdi-truck-delivery',
    visita: 'mdi-account-tie',
    proposta: 'mdi-file-document-edit',
    alerta: 'mdi-alert',
    negociacao: 'mdi-handshake',
  }

  async function load () {
    await store.loadById(clientId.value)
  }

  onMounted(load)
  watch(clientId, load)
</script>

<template>
  <div>
    <v-btn
      class="mb-4"
      prepend-icon="mdi-arrow-left"
      variant="text"
      @click="router.push('/clientes')"
    >
      Voltar à carteira
    </v-btn>

    <v-alert v-if="store.error" class="mb-4" type="error" variant="tonal">
      {{ store.error }}
    </v-alert>

    <div v-if="store.loading && !store.current" class="pa-4">
      <v-skeleton-loader type="article, table" />
    </div>

    <template v-if="store.current">
      <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-6">
        <div>
          <h1 class="text-h5 font-weight-bold mb-1">{{ store.current.nome }}</h1>

          <div class="text-body-2 text-medium-emphasis">
            {{ store.current.documento }} · {{ store.current.segmento }} ·
            Vendedor: {{ store.current.vendedorNome }}
          </div>
        </div>

        <v-chip
          class="text-capitalize"
          :color="store.current.status === 'ativo' ? 'success' : 'warning'"
          variant="tonal"
        >
          {{ store.current.status }}
        </v-chip>
      </div>

      <!-- KPIs do cliente -->
      <v-card class="mb-6" rounded="lg" variant="outlined">
        <v-card-text>
          <v-row density="compact">
            <v-col cols="12" sm="4">
              <KpiGauge
                :color="store.current.healthScore >= 85 ? '#43A047' : store.current.healthScore >= 70 ? '#FB8C00' : '#E53935'"
                icon="mdi-heart-pulse"
                label="Health Score"
                :value="store.current.healthScore"
              />
            </v-col>

            <v-col cols="12" sm="4">
              <KpiGauge
                color="#FB8C00"
                icon="mdi-alert"
                label="Receita em Risco"
                :numeric="false"
                :value="formatCurrency(store.current.receitaEmRisco, true)"
              />
            </v-col>

            <v-col cols="12" sm="4">
              <KpiGauge
                color="#1E88E5"
                icon="mdi-trending-up"
                label="Receita Potencial"
                :numeric="false"
                :value="formatCurrency(store.current.receitaPotencial, true)"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <v-row>
        <!-- Dados gerais + histórico -->
        <v-col cols="12" lg="8">
          <v-card class="mb-4" rounded="lg" variant="outlined">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Histórico de faturamento
              </v-card-title>

              <v-card-subtitle>Real vs meta mensal</v-card-subtitle>
            </v-card-item>

            <v-card-text>
              <SimpleBarChart :data="store.current.historicoFaturamento" :height="180" />
            </v-card-text>
          </v-card>

          <v-row class="mb-4" density="compact">
            <v-col
              v-for="stat in [
                { label: 'Receita anual', value: formatCurrency(store.current.receitaAnual, true) },
                { label: 'Ticket médio', value: formatCurrency(store.current.ticketMedio) },
                { label: 'Compras/mês', value: String(store.current.embarquesMes) },
                { label: 'Taxa de conversão', value: formatPercent(store.current.taxaConversao) },
                { label: 'Meses com compra', value: String(store.current.frequenciaCompra) },
                { label: 'Dias sem compra', value: String(store.current.diasSemCompra) },
                { label: 'Prob. de perda', value: formatPercent(store.current.probabilidadePerda) },
                { label: 'Destinatários', value: String(store.current.destinatarios) },
              ]"
              :key="stat.label"
              cols="6"
              md="3"
              sm="4"
            >
              <v-card class="pa-3 h-100" rounded="lg" variant="tonal">
                <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
                <div class="text-subtitle-1 font-weight-bold">{{ stat.value }}</div>
              </v-card>
            </v-col>
          </v-row>

          <v-row density="compact">
            <v-col cols="12" md="6">
              <v-card class="h-100" rounded="lg" variant="outlined">
                <v-card-item>
                  <v-card-title class="text-subtitle-2 font-weight-bold">Produtos</v-card-title>
                </v-card-item>

                <v-card-text>
                  <v-chip
                    v-for="p in store.current.produtos"
                    :key="p"
                    class="ma-1"
                    color="primary"
                    size="small"
                    variant="tonal"
                  >
                    {{ p }}
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="6">
              <v-card class="h-100" rounded="lg" variant="outlined">
                <v-card-item>
                  <v-card-title class="text-subtitle-2 font-weight-bold">Rotas</v-card-title>
                </v-card-item>

                <v-card-text>
                  <v-chip
                    v-for="r in store.current.rotas"
                    :key="r"
                    class="ma-1"
                    size="small"
                    variant="outlined"
                  >
                    {{ r }}
                  </v-chip>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>

        <!-- Insights + timeline + recomendações -->
        <v-col cols="12" lg="4">
          <v-card class="mb-4" rounded="lg" variant="outlined">
            <v-card-item>
              <template #prepend>
                <v-icon color="primary">mdi-brain</v-icon>
              </template>

              <v-card-title class="text-subtitle-1 font-weight-bold">
                Insights da IA
              </v-card-title>
            </v-card-item>

            <v-divider />

            <v-card-text>
              <div
                v-for="ins in store.current.insights"
                :key="ins.id"
                class="mb-4"
              >
                <div class="text-subtitle-2 font-weight-medium mb-1">{{ ins.titulo }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ ins.descricao }}</div>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="mb-4" rounded="lg" variant="outlined">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Recomendações
              </v-card-title>
            </v-card-item>

            <v-divider />

            <v-list v-if="store.current.recomendacoes.length > 0" class="bg-transparent">
              <v-list-item
                v-for="rec in store.current.recomendacoes"
                :key="rec.id"
              >
                <template #prepend>
                  <v-chip
                    class="me-2 text-uppercase"
                    :color="priorityColor(rec.prioridade)"
                    size="x-small"
                    variant="flat"
                  >
                    {{ rec.prioridade }}
                  </v-chip>
                </template>

                <v-list-item-title class="text-wrap">{{ rec.titulo }}</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">{{ rec.descricao }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-card-text v-else class="text-medium-emphasis">
              Nenhuma recomendação pendente.
            </v-card-text>
          </v-card>

          <v-card rounded="lg" variant="outlined">
            <v-card-item>
              <v-card-title class="text-subtitle-1 font-weight-bold">
                Linha do tempo
              </v-card-title>
            </v-card-item>

            <v-divider />

            <v-timeline
              class="pa-4"
              density="compact"
              side="end"
              truncate-line="both"
            >
              <v-timeline-item
                v-for="mov in store.current.movimentacoes"
                :key="mov.id"
                :dot-color="mov.tipo === 'alerta' ? 'warning' : 'primary'"
                size="small"
              >
                <template #icon>
                  <v-icon size="14">{{ timelineIcon[mov.tipo] }}</v-icon>
                </template>

                <div class="text-caption text-medium-emphasis">{{ formatDate(mov.data) }}</div>
                <div class="text-body-2 font-weight-medium">{{ mov.titulo }}</div>
                <div class="text-caption text-medium-emphasis">{{ mov.descricao }}</div>
              </v-timeline-item>
            </v-timeline>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>