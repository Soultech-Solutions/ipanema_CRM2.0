<script lang="ts" setup>
  import type { OpportunityListItem, OpportunityStage } from '@/types/opportunity'
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useOpportunitiesStore } from '@/stores/opportunities'
  import { OPPORTUNITY_STAGES } from '@/types/opportunity'
  import { formatCurrency } from '@/utils/format'

  const router = useRouter()
  const store = useOpportunitiesStore()

  type Tone = 'error' | 'warning' | 'success' | 'info' | undefined

  const HIGH_VALUE = 50_000
  const STALE_DAYS: Partial<Record<OpportunityStage, number>> = { aguardando: 3, followup: 3 }

  const filtros = ref([
    { key: 'email', label: 'Origem e-mail', tone: 'info' as Tone, active: false },
    { key: 'revisar', label: 'Itens a revisar', tone: 'warning' as Tone, active: false },
    { key: 'alto-valor', label: 'Alto valor', tone: undefined as Tone, active: false },
  ])

  function toggleFiltro (key: string) {
    const f = filtros.value.find(x => x.key === key)
    if (f) f.active = !f.active
  }

  function pendingItems (o: OpportunityListItem) {
    return (o.itens ?? []).filter(i => i.status_match !== 'encontrado').length
  }

  function ageHours (o: OpportunityListItem) {
    const stamp = o.updated_at || o.created_at
    return stamp ? (Date.now() - new Date(stamp).getTime()) / 3_600_000 : 0
  }

  function agingLabel (o: OpportunityListItem) {
    const h = ageHours(o)
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
    if (h < 24) return `${Math.round(h)}h`
    return `${Math.round(h / 24)}d`
  }

  function isStale (o: OpportunityListItem) {
    const limit = STALE_DAYS[o.etapa]
    return limit != null && ageHours(o) / 24 >= limit
  }

  function tag (o: OpportunityListItem): { label: string, tone: Tone } {
    if (isStale(o)) return { label: 'Follow-up vencido', tone: 'error' }
    const pending = pendingItems(o)
    if (pending > 0) return { label: `${pending} ${pending === 1 ? 'item' : 'itens'} a revisar`, tone: 'warning' }
    if (o.etapa === 'pronto') return { label: 'Pronto', tone: 'success' }
    if (o.origem === 'email') return { label: 'E-mail', tone: 'info' }
    return { label: 'Manual', tone: undefined }
  }

  const filtered = computed(() => {
    const active = new Set(filtros.value.filter(f => f.active).map(f => f.key))
    return store.list.filter(o => {
      if (active.has('email') && o.origem !== 'email') return false
      if (active.has('revisar') && pendingItems(o) === 0) return false
      if (active.has('alto-valor') && (o.valor_estimado ?? 0) < HIGH_VALUE) return false
      return true
    })
  })

  const columns = computed(() => OPPORTUNITY_STAGES.map(stage => {
    const cards = filtered.value.filter(o => o.etapa === stage.id)
    return {
      ...stage,
      cards,
      total: cards.reduce((sum, o) => sum + (o.valor_estimado ?? 0), 0),
    }
  }))

  onMounted(() => {
    void store.loadAll()
    store.startPolling()
  })

  onUnmounted(() => store.stopPolling())
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Pipeline de oportunidades
        </h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          Cada pedido de orçamento recebido por e-mail vira um card com valor, aging e itens identificados.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn
          color="secondary"
          :loading="store.loading"
          prepend-icon="mdi-refresh"
          rounded="lg"
          variant="outlined"
          @click="store.loadAll()"
        >
          Atualizar
        </v-btn>

        <v-btn color="primary" rounded="lg" variant="flat" @click="router.push('/caixa-entrada')">
          Caixa de entrada
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="!store.enabled"
      class="mb-4"
      density="compact"
      type="info"
      variant="tonal"
    >
      O pipeline lê as oportunidades do Directus. Configure <code>VITE_USE_MOCK=false</code> e faça login para ver os dados reais.
    </v-alert>

    <v-alert
      v-if="store.error"
      class="mb-4"
      closable
      density="compact"
      type="error"
      variant="tonal"
    >
      {{ store.error }}
    </v-alert>

    <!-- Filtros -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        v-for="f in filtros"
        :key="f.key"
        :color="f.active ? (f.tone || 'primary') : undefined"
        rounded="pill"
        :variant="f.active ? 'tonal' : 'flat'"
        @click="toggleFiltro(f.key)"
      >
        {{ f.label }}
      </v-chip>
    </div>

    <v-progress-linear v-if="store.loading && store.list.length === 0" class="mb-4" color="primary" indeterminate />

    <!-- Kanban -->
    <div class="d-flex ga-3 kanban-scroll pb-2">
      <div v-for="col in columns" :key="col.id" class="kanban-col pa-3">
        <div class="d-flex align-center justify-space-between mb-1">
          <span class="text-caption font-weight-bold">{{ col.titulo }}</span>

          <v-chip color="default" rounded="pill" size="small" variant="tonal">
            {{ col.cards.length }}
          </v-chip>
        </div>

        <div class="text-caption text-medium-emphasis mb-3">
          {{ formatCurrency(col.total, true) }}
        </div>

        <v-card
          v-for="card in col.cards"
          :key="card.id"
          class="pa-3 mb-3"
          rounded="lg"
          variant="outlined"
          @click="router.push(`/oportunidades/${card.id}`)"
        >
          <div class="d-flex align-start justify-space-between ga-1 mb-3">
            <v-chip :color="tag(card).tone" rounded="pill" size="small" variant="tonal">
              {{ tag(card).label }}
            </v-chip>

            <v-menu location="bottom end">
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  density="comfortable"
                  icon="mdi-dots-vertical"
                  size="x-small"
                  variant="text"
                  @click.stop
                />
              </template>

              <v-list density="compact">
                <v-list-subheader>Mover para</v-list-subheader>

                <v-list-item
                  v-for="stage in OPPORTUNITY_STAGES"
                  :key="stage.id"
                  :active="stage.id === card.etapa"
                  :title="stage.titulo"
                  @click="store.moveStage(card.id, stage.id)"
                />
              </v-list>
            </v-menu>
          </div>

          <div class="text-body-2 font-weight-bold mb-1 card-title">{{ card.titulo }}</div>
          <div class="text-caption text-medium-emphasis mb-3">{{ card.cliente_nome || '—' }}</div>

          <div class="d-flex align-center justify-space-between">
            <span class="text-body-2 font-weight-bold">
              {{ card.valor_estimado ? formatCurrency(card.valor_estimado, true) : 'A cotar' }}
            </span>

            <span
              class="text-caption font-weight-medium"
              :class="isStale(card) ? 'text-error' : 'text-medium-emphasis'"
            >
              {{ agingLabel(card) }}
            </span>
          </div>
        </v-card>

        <div v-if="col.cards.length === 0" class="text-caption text-medium-emphasis text-center py-4">
          Nenhuma oportunidade
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-scroll {
  overflow-x: auto;
}
.kanban-col {
  background: #f0f2f5;
  border-radius: 14px;
  width: 240px;
  flex: 0 0 240px;
}
.card-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
