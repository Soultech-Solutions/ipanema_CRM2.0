<script lang="ts" setup>
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useCommercialStore } from '@/stores/commercial'
  import { useDashboardStore } from '@/stores/dashboard'
  import { formatCurrency } from '@/utils/format'

  const store = useDashboardStore()
  const commercial = useCommercialStore()
  const router = useRouter()

  onMounted(() => {
    if (!store.data) store.load()
  })

  // Conversão média real, calculada a partir dos clientes carregados
  const conversaoMedia = computed(() => {
    const clients = commercial.clients
    if (!clients.length) return 0
    const soma = clients.reduce((s, c) => s + (c.taxaConversao ?? 0), 0)
    return Math.round((soma / clients.length) * 100)
  })

  const clientesAtencaoCount = computed(() =>
    commercial.clients.filter(c => c.status === 'risco').length)

  type Tone = 'error' | 'warning' | 'success' | 'info'

  function prioridadeTone (prioridade: string): Tone {
    if (prioridade === 'alta') return 'error'
    if (prioridade === 'media') return 'warning'
    return 'info'
  }

  function insightTone (tipo: string): Tone {
    if (tipo === 'risco' || tipo === 'alerta') return 'error'
    if (tipo === 'oportunidade') return 'success'
    return 'info'
  }

  function insightLabel (tipo: string): string {
    if (tipo === 'risco') return 'Risco'
    if (tipo === 'alerta') return 'Alerta'
    if (tipo === 'oportunidade') return 'Oportunidade'
    return 'Análise'
  }

  /** Motivo de atenção do cliente, derivado de dados reais (sem inventar número) */
  function clientReason (client: { status: string, diasSemCompra: number, probabilidadePerda: number, healthScore: number, receitaPotencial: number }) {
    if (client.status === 'inativo') {
      return { label: `Sem compra há ${client.diasSemCompra}d`, tone: 'error' as Tone }
    }
    if (client.probabilidadePerda >= 0.5) {
      return { label: `Risco de perda ${(client.probabilidadePerda * 100).toFixed(0)}%`, tone: 'error' as Tone }
    }
    if (client.healthScore < 70) {
      return { label: `Health baixo (${client.healthScore})`, tone: 'warning' as Tone }
    }
    return { label: `Potencial ${formatCurrency(client.receitaPotencial, true)}`, tone: 'info' as Tone }
  }
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Visão comercial
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Prioridades, riscos e desempenho da carteira em uma única tela.
          <span v-if="commercial.progress" class="text-primary"> · {{ commercial.progress }}</span>
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn
          color="secondary"
          rounded="lg"
          variant="outlined"
        >
          Exportar
        </v-btn>
        <v-btn
          color="primary"
          rounded="lg"
          variant="flat"
          @click="router.push('/pipeline')"
        >
          + Nova oportunidade
        </v-btn>
      </div>
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
      <v-col v-for="n in 5" :key="n" cols="12" md="2" sm="4">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <template v-if="store.kpis">
      <!-- 5 métricas -->
      <div class="d-flex flex-wrap ga-3 mb-5">
        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-h5 font-weight-bold">{{ formatCurrency(store.kpis.receitaPotencial, true) }}</span>
            </div>
            <div class="text-body-2 text-medium-emphasis">Orçamentos em aberto</div>
          </v-card-text>
        </v-card>

        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-h5 font-weight-bold">12</span>
            </div>
            <div class="text-body-2 text-medium-emphasis">Follow-ups vencidos</div>
            <div class="text-caption font-italic text-disabled">dado de exemplo — recurso ainda não construído</div>
          </v-card-text>
        </v-card>

        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-h5 font-weight-bold">{{ clientesAtencaoCount }}</span>
            </div>
            <div class="text-body-2 text-medium-emphasis">Clientes pedem atenção</div>
          </v-card-text>
        </v-card>

        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-h5 font-weight-bold">24,8%</span>
            </div>
            <div class="text-body-2 text-medium-emphasis">Margem média</div>
            <div class="text-caption font-italic text-disabled">dado de exemplo — sem dado de custo/margem na base</div>
          </v-card-text>
        </v-card>

        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-h5 font-weight-bold">{{ conversaoMedia }}%</span>
            </div>
            <div class="text-body-2 text-medium-emphasis">Conversão estimada</div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Leitura comercial da IA -->
      <v-card class="ia-panel mb-5 pa-4" rounded="xl">
        <div class="text-subtitle-1 font-weight-bold text-white mb-3">
          Leitura comercial da IA
        </div>

        <div class="d-flex flex-wrap ga-3">
          <v-card
            v-for="ins in store.insights.slice(0, 3)"
            :key="ins.id"
            class="ia-insight pa-3"
            rounded="lg"
          >
            <v-chip
              class="mb-2"
              :color="insightTone(ins.tipo)"
              rounded="pill"
              size="small"
              variant="tonal"
            >
              {{ insightLabel(ins.tipo) }}
            </v-chip>
            <div class="text-body-2 font-weight-medium ia-insight-text mb-1">{{ ins.titulo }}</div>
            <div class="text-caption ia-insight-text">{{ ins.descricao }}</div>
          </v-card>

          <div v-if="!store.insights.length" class="text-caption text-medium-emphasis">
            Nenhum insight disponível ainda.
          </div>
        </div>
      </v-card>

      <!-- Duas colunas -->
      <v-row>
        <v-col cols="12" lg="6">
          <v-card class="h-100" rounded="xl" variant="outlined">
            <v-card-text class="pa-4">
              <div class="text-subtitle-1 font-weight-bold mb-1">O que precisa de ação hoje</div>
              <div class="text-caption text-medium-emphasis mb-3">Ordenado por prioridade</div>

              <template v-for="(rec, i) in store.recomendacoes.slice(0, 5)" :key="rec.id">
                <div class="d-flex align-center ga-3 py-2">
                  <v-chip
                    :color="prioridadeTone(rec.prioridade)"
                    rounded="pill"
                    size="small"
                    variant="tonal"
                  >
                    {{ rec.acao }}
                  </v-chip>
                  <span class="text-caption">
                    {{ rec.titulo }} — {{ rec.clienteNome || 'Carteira geral' }}
                    <template v-if="rec.impactoEstimado"> • {{ formatCurrency(rec.impactoEstimado, true) }}</template>
                  </span>
                </div>
                <v-divider v-if="i < store.recomendacoes.slice(0, 5).length - 1" />
              </template>

              <div v-if="!store.recomendacoes.length" class="text-caption text-medium-emphasis">
                Nenhuma recomendação pendente.
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" lg="6">
          <v-card class="h-100" rounded="xl" variant="outlined">
            <v-card-text class="pa-4">
              <div class="text-subtitle-1 font-weight-bold mb-1">Clientes que merecem atenção</div>
              <div class="text-caption text-medium-emphasis mb-3">Volume, margem e relacionamento</div>

              <template v-for="(client, i) in store.clientesRisco" :key="client.id">
                <div
                  class="d-flex align-center justify-space-between py-2 cursor-pointer"
                  @click="router.push(`/clientes/${client.id}`)"
                >
                  <span class="text-body-2 font-weight-medium">{{ client.nome }}</span>
                  <v-chip
                    :color="clientReason(client).tone"
                    rounded="pill"
                    size="small"
                    variant="tonal"
                  >
                    {{ clientReason(client).label }}
                  </v-chip>
                </div>
                <v-divider v-if="i < store.clientesRisco.length - 1" />
              </template>

              <div v-if="!store.clientesRisco.length" class="text-caption text-medium-emphasis">
                Nenhum cliente em atenção no momento.
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
.metric-card {
  flex: 1 1 200px;
  min-width: 200px;
}

.ia-panel {
  background: #161a1f !important;
}

.ia-insight {
  background: #20252b !important;
  border: 1px solid #2b3138;
  flex: 1 1 280px;
  min-width: 280px;
}

.ia-insight-text {
  color: #d7dce3;
}

.cursor-pointer {
  cursor: pointer;
}
.cursor-pointer:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}
</style>