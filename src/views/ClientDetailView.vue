<script lang="ts" setup>
  import { computed, onMounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useClientsStore } from '@/stores/clients'
  import { formatCurrency } from '@/utils/format'

  const route = useRoute()
  const router = useRouter()
  const store = useClientsStore()

  const clientId = computed(() => route.params.id as string)

  async function load () {
    await store.loadById(clientId.value)
  }

  onMounted(load)
  watch(clientId, load)

  type Tone = 'error' | 'warning' | 'success' | 'info' | undefined

  function statusTone (status: string): Tone {
    if (status === 'ativo') return 'success'
    if (status === 'risco') return 'warning'
    return 'error'
  }

  function statusLabel (status: string): string {
    if (status === 'ativo') return 'Cliente ativo'
    if (status === 'risco') return 'Cliente em risco'
    return 'Cliente inativo'
  }
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
      <!-- Header -->
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
        <div>
          <h1 class="text-h4 font-weight-bold mb-1 brand-title">
            Cliente 360º • {{ store.current.nome }}
          </h1>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Histórico comercial, margem, oportunidades e próximos passos.
          </p>
        </div>

        <div class="d-flex ga-2">
          <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
          <v-btn color="primary" rounded="lg" variant="flat" @click="router.push('/pipeline')">
            + Nova oportunidade
          </v-btn>
        </div>
      </div>

      <!-- Perfil + métricas -->
      <div class="d-flex flex-wrap ga-3 mb-4">
        <v-card class="profile-card pa-4" rounded="xl" variant="outlined">
          <div class="text-subtitle-1 font-weight-bold text-uppercase mb-2">{{ store.current.nome }}</div>
          <div class="text-caption text-medium-emphasis">{{ store.current.documento }}</div>
          <div class="text-caption text-medium-emphasis mb-3">Vendedor: {{ store.current.vendedorNome }}</div>
          <v-chip :color="statusTone(store.current.status)" rounded="pill" size="small" variant="tonal">
            {{ statusLabel(store.current.status) }}
          </v-chip>
        </v-card>

        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="text-h5 font-weight-bold mb-1">{{ formatCurrency(store.current.receitaAnual, true) }}</div>
            <div class="text-body-2 text-medium-emphasis">Compras (12 meses)</div>
          </v-card-text>
        </v-card>

        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="text-h5 font-weight-bold mb-1">13,4%</div>
            <div class="text-body-2 text-medium-emphasis">Margem atual</div>
            <div class="text-caption font-italic text-disabled">exemplo — sem dado de margem na base</div>
          </v-card-text>
        </v-card>

        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="text-h5 font-weight-bold mb-1">-4,2pp</div>
            <div class="text-body-2 text-medium-emphasis">Variação margem</div>
            <div class="text-caption font-italic text-disabled">exemplo — sem dado de margem na base</div>
          </v-card-text>
        </v-card>

        <v-card class="metric-card" rounded="xl" variant="outlined">
          <v-card-text class="pa-4">
            <div class="text-h5 font-weight-bold mb-1">{{ store.current.diasSemCompra }} dias</div>
            <div class="text-body-2 text-medium-emphasis">Último pedido</div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Alerta IA -->
      <v-card
        v-if="store.current.insights?.[0]"
        class="mb-4 pa-4"
        color="error"
        rounded="lg"
        variant="tonal"
      >
        <div class="font-weight-bold mb-1">IA: {{ store.current.insights[0].titulo }}</div>
        <div class="text-body-2">{{ store.current.insights[0].descricao }}</div>
      </v-card>

      <!-- Duas colunas -->
      <v-row>
        <v-col cols="12" lg="7">
          <v-card class="h-100 pa-4" rounded="xl" variant="outlined">
            <div class="text-subtitle-1 font-weight-bold mb-1">Histórico recente</div>
            <div class="text-caption text-medium-emphasis mb-3">Realizado vs cotado por mês</div>

            <v-table density="comfortable">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Cotado</th>
                  <th>Realizado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in store.current.historicoFaturamento" :key="h.mes">
                  <td>{{ h.mes }}</td>
                  <td>{{ formatCurrency(h.meta ?? 0, true) }}</td>
                  <td>{{ formatCurrency(h.valor, true) }}</td>
                </tr>
              </tbody>
            </v-table>

            <div v-if="!store.current.historicoFaturamento?.length" class="text-caption text-medium-emphasis">
              Sem histórico mensal disponível.
            </div>
          </v-card>
        </v-col>

        <v-col cols="12" lg="5">
          <v-card class="h-100 pa-4" rounded="xl" variant="outlined">
            <div class="text-subtitle-1 font-weight-bold mb-1">Sinais comerciais</div>
            <div class="text-caption text-medium-emphasis mb-3">Sugestões para o vendedor (exemplo)</div>

            <div class="d-flex align-start ga-3 py-2">
              <v-chip color="error" rounded="pill" size="small" variant="tonal">Margem</v-chip>
              <span class="text-body-2">Revisar desconto aplicado na última proposta.</span>
            </div>
            <v-divider />
            <div class="d-flex align-start ga-3 py-2">
              <v-chip color="default" rounded="pill" size="small" variant="tonal">Mix</v-chip>
              <span class="text-body-2">Cliente compra pouca variedade de linha vs. histórico.</span>
            </div>
            <v-divider />
            <div class="d-flex align-start ga-3 py-2">
              <v-chip color="default" rounded="pill" size="small" variant="tonal">Relacionamento</v-chip>
              <span class="text-body-2">{{ store.current.diasSemCompra }} dias sem pedido fechado.</span>
            </div>
            <v-divider />
            <div class="d-flex align-start ga-3 py-2">
              <v-chip color="info" rounded="pill" size="small" variant="tonal">Follow-up</v-chip>
              <span class="text-body-2">Ver recomendações pendentes na Central de follow-ups.</span>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
.profile-card {
  flex: 1 1 220px;
  min-width: 220px;
}
.metric-card {
  flex: 1 1 180px;
  min-width: 180px;
}
</style>