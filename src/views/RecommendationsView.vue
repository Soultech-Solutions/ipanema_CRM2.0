<script lang="ts" setup>
  import type { ChipTone } from '@/components/StatusChip.vue'
  import type { Priority, Recommendation } from '@/types/commercial'
  import { computed, onMounted, ref } from 'vue'
  import { fetchRecommendations } from '@/api/directus'
  import KpiCard from '@/components/KpiCard.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import { formatCurrency } from '@/utils/format'

  const items = ref<Recommendation[]>([])
  const loading = ref(false)
  const filterPriority = ref<'all' | Priority>('all')
  const openId = ref<string | null>(null)
  const showAll = ref(false)

  const filtered = computed(() => {
    const base = filterPriority.value === 'all'
      ? items.value
      : items.value.filter(r => r.prioridade === filterPriority.value)
    return base.toSorted((a, b) => (b.impactoEstimado ?? 0) - (a.impactoEstimado ?? 0))
  })

  // Celular: 4 itens por padrão, o resto abre no botão "Ver todas"
  const mobileList = computed(() => showAll.value ? filtered.value : filtered.value.slice(0, 4))

  const potencialTotal = computed(() =>
    items.value.reduce((s, r) => s + (r.impactoEstimado ?? 0), 0))

  function prioridadeInfo (p: string): { label: string, tone: ChipTone } {
    if (p === 'alta') return { label: 'Alta', tone: 'error' }
    if (p === 'media') return { label: 'Média', tone: 'gold' }
    return { label: 'Baixa', tone: 'info' }
  }

  function toggle (id: string) {
    openId.value = openId.value === id ? null : id
  }

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
    <!-- KPIs (no celular só os 2 primeiros, como no Figma M02) -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard class="h-100" label="Potencial total" :value="formatCurrency(potencialTotal, true)" />
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-green)"
          class="h-100"
          delta="+18% · exemplo"
          label="Cross-sell"
          value="R$ 2,3 mi"
        />
      </v-col>
      <v-col class="d-none d-sm-block" cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-gold)"
          class="h-100"
          delta="+12% · exemplo"
          label="Reativação"
          value="R$ 1,4 mi"
        />
      </v-col>
      <v-col class="d-none d-sm-block" cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-blue)"
          class="h-100"
          delta="+9% · exemplo"
          label="Recuperação"
          value="R$ 1,1 mi"
        />
      </v-col>
    </v-row>

    <!-- ===== DESKTOP / TABLET ===== -->
    <v-card class="queue-banner d-none d-sm-flex" rounded="xl" variant="flat">
      <div>
        <div class="queue-banner__title">Fila inteligente de oportunidades</div>
        <div class="queue-banner__sub">Priorizada por potencial financeiro, probabilidade, margem e urgência.</div>
      </div>
      <span class="queue-banner__pill">ALTO POTENCIAL</span>
    </v-card>

    <v-btn-toggle
      v-model="filterPriority"
      class="mb-4 d-none d-sm-inline-flex"
      color="primary"
      density="comfortable"
      divided
      mandatory
      rounded="lg"
    >
      <v-btn size="small" value="all">Todas</v-btn>
      <v-btn size="small" value="alta">Alta</v-btn>
      <v-btn size="small" value="media">Média</v-btn>
      <v-btn size="small" value="baixa">Baixa</v-btn>
    </v-btn-toggle>

    <div class="d-none d-sm-block">
      <v-card v-for="rec in filtered" :key="rec.id" class="opp" rounded="xl" variant="flat">
        <div class="opp__row">
          <StatusChip class="opp__type" :label="rec.acao" tone="info" />

          <div class="opp__who">
            <div class="opp__name">{{ rec.clienteNome || 'Carteira geral' }}</div>
            <div class="opp__sub">{{ rec.titulo }}</div>
          </div>

          <div class="opp__value">
            {{ rec.impactoEstimado ? formatCurrency(rec.impactoEstimado, true) : '—' }}
          </div>

          <StatusChip
            class="opp__prio"
            :label="prioridadeInfo(rec.prioridade).label"
            :tone="prioridadeInfo(rec.prioridade).tone"
          />

          <v-btn class="opp__btn" size="small" variant="outlined" @click="toggle(rec.id)">
            {{ openId === rec.id ? 'Fechar' : 'Abrir' }}
          </v-btn>
        </div>

        <div v-if="openId === rec.id" class="opp__detail">{{ rec.descricao }}</div>
      </v-card>
    </div>

    <!-- ===== CELULAR (Figma M02) ===== -->
    <div class="d-sm-none">
      <div class="m-title">Fila priorizada</div>

      <div v-for="rec in mobileList" :key="rec.id" class="m-opp">
        <div class="m-opp__top">
          <span class="m-opp__name">{{ rec.clienteNome || 'Carteira geral' }} • {{ rec.acao }}</span>
          <StatusChip
            :label="prioridadeInfo(rec.prioridade).label"
            :tone="prioridadeInfo(rec.prioridade).tone"
          />
        </div>
        <div class="m-opp__value">
          {{ rec.impactoEstimado ? formatCurrency(rec.impactoEstimado, true) : '—' }}
        </div>
      </div>

      <v-btn
        v-if="filtered.length > 4"
        block
        class="m-all"
        variant="flat"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Mostrar menos' : 'Ver todas as oportunidades' }}
      </v-btn>
    </div>

    <div v-if="!loading && !filtered.length" class="ip-card-subtitle">Nenhuma oportunidade encontrada.</div>
    <v-skeleton-loader v-if="loading" class="mt-4" type="card, card" />
  </div>
</template>

<style scoped>
.queue-banner { align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin: 24px 0 20px; padding: 22px 24px; background: #102338 !important; border-color: #102338 !important; }
.queue-banner__title { font-size: 18px; font-weight: 700; color: #fff; }
.queue-banner__sub { margin-top: 6px; font-size: 13px; color: rgba(255, 255, 255, 0.75); }
.queue-banner__pill { display: inline-flex; align-items: center; height: 28px; padding: 0 18px; border-radius: 14px; background: var(--ip-tint-green); color: var(--ip-green); font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }

.opp { margin-bottom: 12px; padding: 14px 20px; }
.opp__row { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.opp__type { width: 150px; flex-shrink: 0; justify-content: center; }
.opp__who { flex: 1 1 220px; min-width: 0; }
.opp__name { font-size: 14px; font-weight: 600; color: var(--ip-text); }
.opp__sub { margin-top: 2px; font-size: 12px; color: var(--ip-text-muted); }
.opp__value { min-width: 110px; font-size: 16px; font-weight: 700; color: var(--ip-text); }
.opp__prio { min-width: 64px; justify-content: center; }
.opp__btn { min-width: 84px; }
.opp__detail { margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: var(--ip-bg); font-size: 13px; line-height: 1.5; color: var(--ip-text-muted); }

/* Celular */
.m-title { margin: 12px 0 12px; font-size: 16px; font-weight: 700; color: var(--ip-text); }
.m-opp { margin-bottom: 10px; padding: 14px 16px; border: 1px solid var(--ip-border); border-radius: 14px; background: #fff; }
.m-opp__top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.m-opp__name { min-width: 0; font-size: 12px; font-weight: 600; line-height: 1.4; color: var(--ip-text); }
.m-opp__value { margin-top: 8px; font-size: 16px; font-weight: 700; color: var(--ip-text); }
.m-all { margin-top: 8px; height: 48px; background: var(--ip-navy) !important; color: #fff !important; }
</style>