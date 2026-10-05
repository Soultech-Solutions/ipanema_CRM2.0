<script lang="ts" setup>
  import type { ChipTone } from '@/components/StatusChip.vue'
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import KpiCard from '@/components/KpiCard.vue'
  import SectionCard from '@/components/SectionCard.vue'
  import StatusChip from '@/components/StatusChip.vue'
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
    if (clients.length === 0) return 0
    const soma = clients.reduce((s, c) => s + (c.taxaConversao ?? 0), 0)
    return Math.round((soma / clients.length) * 100)
  })

  const clientesAtencaoCount = computed(() =>
    commercial.clients.filter(c => c.status === 'risco').length)

  const topRecomendacao = computed(() => store.recomendacoes[0])

  function prioridadeTone (prioridade: string): ChipTone {
    if (prioridade === 'alta') return 'error'
    if (prioridade === 'media') return 'gold'
    return 'info'
  }

  function insightTone (tipo: string): ChipTone {
    if (tipo === 'risco') return 'error'
    if (tipo === 'alerta') return 'gold'
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
      return { label: `Sem compra há ${client.diasSemCompra}d`, tone: 'error' as ChipTone }
    }
    if (client.probabilidadePerda >= 0.5) {
      return { label: `Risco de perda ${(client.probabilidadePerda * 100).toFixed(0)}%`, tone: 'error' as ChipTone }
    }
    if (client.healthScore < 70) {
      return { label: `Health baixo (${client.healthScore})`, tone: 'gold' as ChipTone }
    }
    return { label: `Potencial ${formatCurrency(client.receitaPotencial, true)}`, tone: 'info' as ChipTone }
  }

  // ── DADOS DE EXEMPLO (do Figma) — a base ainda não tem faturamento mensal, meta nem segmento ──
  const sampleSeries = [63, 74, 67, 84, 88, 95, 90, 100]
  const barColors = ['#17324d', '#24496b', '#2f6b9a', '#1d7a4d']
  const bars = computed(() => {
    const now = new Date()
    return sampleSeries.map((value, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (sampleSeries.length - 1 - i), 1)
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      return { value, label, color: barColors[i % barColors.length] }
    })
  })

  const sampleSegments = [
    { nome: 'Mineração', pct: 28, color: '#17324d' },
    { nome: 'Papel & Celulose', pct: 21, color: '#2f6b9a' },
    { nome: 'Siderurgia', pct: 16, color: '#d9232e' },
    { nome: 'Agro', pct: 14, color: '#1d7a4d' },
    { nome: 'Outros', pct: 21, color: '#b39b5e' },
  ]
</script>

<template>
  <div>
    <p v-if="commercial.progress" class="ip-card-subtitle mb-4">{{ commercial.progress }}</p>

    <v-alert
      v-if="store.error"
      class="mb-4"
      type="error"
      variant="tonal"
    >
      {{ store.error }}
    </v-alert>

    <v-row v-if="store.loading && !store.kpis">
      <v-col
        v-for="n in 4"
        :key="n"
        cols="12"
        lg="3"
        sm="6"
      >
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <template v-if="store.kpis">
      <!-- KPIs -->
      <v-row>
        <v-col cols="12" lg="3" sm="6">
          <KpiCard
            class="h-100"
            label="Pipeline aberto"
            :value="formatCurrency(store.kpis.receitaPotencial, true)"
          />
        </v-col>

        <v-col cols="12" lg="3" sm="6">
          <KpiCard
            accent="var(--ip-red)"
            class="h-100"
            label="Clientes pedem atenção"
            :value="String(clientesAtencaoCount)"
          />
        </v-col>

        <v-col cols="12" lg="3" sm="6">
          <KpiCard
            accent="var(--ip-blue)"
            class="h-100"
            label="Conversão estimada"
            :value="`${conversaoMedia}%`"
          />
        </v-col>

        <v-col cols="12" lg="3" sm="6">
          <KpiCard
            accent="var(--ip-gold)"
            class="h-100"
            delta="Dado de exemplo"
            delta-tone="gold"
            label="Margem média"
            value="24,8%"
          />
        </v-col>
      </v-row>

      <!-- Faturamento x Meta + Segmentos (exemplo) -->
      <v-row>
        <v-col cols="12" lg="8">
          <SectionCard class="h-100" subtitle="Evolução dos últimos 8 meses" title="Faturamento x Meta">
            <template #actions>
              <StatusChip label="Meta 30,0 mi · dado de exemplo" tone="gold" />
            </template>

            <div class="bars">
              <div
                v-for="(b, i) in bars"
                :key="i"
                class="bars__bar"
                :style="{ height: `${b.value * 1.7}px`, background: b.color }"
              />
            </div>

            <div class="bars-labels">
              <span v-for="(b, i) in bars" :key="i">{{ b.label }}</span>
            </div>
          </SectionCard>
        </v-col>

        <v-col cols="12" lg="4">
          <SectionCard class="h-100" subtitle="Participação no faturamento" title="Segmentos">
            <template #actions>
              <StatusChip label="Dado de exemplo" tone="gold" />
            </template>

            <div v-for="seg in sampleSegments" :key="seg.nome" class="seg">
              <div class="seg__head">
                <span>{{ seg.nome }}</span>
                <span class="seg__pct">{{ seg.pct }}%</span>
              </div>

              <div class="seg__track">
                <div class="seg__fill" :style="{ width: `${seg.pct * 3}%`, background: seg.color }" />
              </div>
            </div>
          </SectionCard>
        </v-col>
      </v-row>

      <!-- Riscos e oportunidades + Insight da IA (dados reais) -->
      <v-row>
        <v-col cols="12" lg="6">
          <SectionCard class="h-100" subtitle="O que exige ação da diretoria" title="Riscos e oportunidades">
            <div v-for="ins in store.insights.slice(0, 3)" :key="ins.id" class="row-item row-item--soft">
              <StatusChip :label="insightLabel(ins.tipo)" :tone="insightTone(ins.tipo)" />

              <div>
                <div class="row-item__title">{{ ins.titulo }}</div>
                <div class="row-item__sub">{{ ins.descricao }}</div>
              </div>
            </div>

            <div v-if="store.insights.length === 0" class="ip-card-subtitle">Nenhum insight disponível ainda.</div>
          </SectionCard>
        </v-col>

        <v-col cols="12" lg="6">
          <SectionCard class="h-100 ia-card" large title="Insight da IA">
            <template v-if="topRecomendacao">
              <div class="ia-headline">{{ topRecomendacao.titulo }}</div>

              <p class="ia-sub mt-4 mb-0">
                {{ topRecomendacao.clienteNome || 'Carteira geral' }}
                <template v-if="topRecomendacao.impactoEstimado">
                  • impacto {{ formatCurrency(topRecomendacao.impactoEstimado, true) }}
                </template>
              </p>

              <v-btn
                class="ia-btn mt-8"
                variant="flat"
                @click="router.push('/analista')"
              >
                Ver análise completa
              </v-btn>
            </template>

            <div v-else class="ia-sub">Nenhum insight disponível ainda.</div>
          </SectionCard>
        </v-col>
      </v-row>

      <!-- Listas operacionais (dados reais) -->
      <v-row>
        <v-col cols="12" lg="6">
          <SectionCard class="h-100" subtitle="Ordenado por prioridade" title="O que precisa de ação hoje">
            <div v-for="rec in store.recomendacoes.slice(0, 5)" :key="rec.id" class="row-item row-item--soft">
              <StatusChip :label="rec.acao" :tone="prioridadeTone(rec.prioridade)" />

              <span class="row-item__sub">
                {{ rec.titulo }} — {{ rec.clienteNome || 'Carteira geral' }}
                <template v-if="rec.impactoEstimado"> • {{ formatCurrency(rec.impactoEstimado, true) }}</template>
              </span>
            </div>

            <div v-if="store.recomendacoes.length === 0" class="ip-card-subtitle">Nenhuma recomendação pendente.</div>
          </SectionCard>
        </v-col>

        <v-col cols="12" lg="6">
          <SectionCard class="h-100" subtitle="Volume, margem e relacionamento" title="Clientes que merecem atenção">
            <div
              v-for="client in store.clientesRisco"
              :key="client.id"
              class="row-item row-item--soft row-item--click"
              @click="router.push(`/clientes/${client.id}`)"
            >
              <span class="row-item__title flex-grow-1">{{ client.nome }}</span>
              <StatusChip :label="clientReason(client).label" :tone="clientReason(client).tone" />
            </div>

            <div v-if="store.clientesRisco.length === 0" class="ip-card-subtitle">Nenhum cliente em atenção no momento.</div>
          </SectionCard>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
/* Gráfico de barras (exemplo) */
.bars { display: flex; align-items: flex-end; justify-content: space-around; height: 180px; border-bottom: 1px solid var(--ip-border); }
.bars__bar { width: 48px; border-radius: 8px 8px 0 0; }
.bars-labels { display: flex; justify-content: space-around; margin-top: 8px; }
.bars-labels span { width: 48px; text-align: center; font-size: 11px; color: var(--ip-text-muted); text-transform: capitalize; }

/* Segmentos (exemplo) */
.seg { margin-bottom: 14px; }
.seg__head { display: flex; justify-content: space-between; font-size: 13px; color: var(--ip-text); margin-bottom: 6px; }
.seg__pct { font-weight: 600; }
.seg__track { height: 6px; border-radius: 3px; background: var(--ip-tint-blue); }
.seg__fill { height: 100%; border-radius: 3px; max-width: 100%; }

/* Linhas de lista com fundo suave (sem borda) */
.row-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-bottom: 10px; border-radius: 12px; }
.row-item--soft { background: var(--ip-bg); }
.row-item--soft > :first-child { min-width: 92px; justify-content: center; }
.row-item__title { font-size: 14px; font-weight: 600; color: var(--ip-text); }
.row-item__sub { font-size: 13px; color: var(--ip-text-muted); }
.row-item--click { cursor: pointer; }
.row-item--click > :first-child { min-width: 0; justify-content: flex-start; }
.row-item--click:hover { background: var(--ip-tint-blue); }

/* Card Insight da IA (navy escuro) */
.ia-card { background: #102338 !important; border-color: #102338 !important; }
.ia-card :deep(.ip-card-title) { color: rgba(255, 255, 255, 0.7); font-size: 12px; font-weight: 600; }
.ia-headline { font-size: 24px; font-weight: 700; line-height: 1.3; color: #fff; }
.ia-sub { font-size: 13px; line-height: 1.5; color: rgba(255, 255, 255, 0.75); }
.ia-btn { background: var(--ip-navy) !important; color: #fff !important; }
</style>
