<script lang="ts" setup>
  import { useRouter } from 'vue-router'
  import KpiCard from '@/components/KpiCard.vue'
  import SectionCard from '@/components/SectionCard.vue'
  import StatusChip from '@/components/StatusChip.vue'

  const router = useRouter()

  // ── DADOS DE EXEMPLO (do Figma) — a base não tem faturamento, margem nem crescimento por segmento ──
  const crescimento = [
    { nome: 'Mineração', pct: 83, delta: '+14%', tom: 'success' as const, color: '#17324d' },
    { nome: 'Papel & Celulose', pct: 72, delta: '+9%', tom: 'success' as const, color: '#2f6b9a' },
    { nome: 'Siderurgia', pct: 58, delta: '-3%', tom: 'error' as const, color: '#d9232e' },
    { nome: 'Ferrovia', pct: 46, delta: '+6%', tom: 'success' as const, color: '#b39b5e' },
    { nome: 'Agro', pct: 66, delta: '+18%', tom: 'success' as const, color: '#1d7a4d' },
    { nome: 'Sucroalcooleiro', pct: 52, delta: '+11%', tom: 'success' as const, color: '#b39b5e' },
  ]

  const segmentos = [
    { nome: 'Agro', fat: 'R$ 4,0 mi', margem: '34,4%', cresc: '+18%', leitura: 'Penetração baixa', prioridade: 'Alta', tom: 'error' as const },
    { nome: 'Mineração', fat: 'R$ 7,9 mi', margem: '33,1%', cresc: '+14%', leitura: 'Expandir contas A', prioridade: 'Alta', tom: 'error' as const },
    { nome: 'Papel & Celulose', fat: 'R$ 6,0 mi', margem: '35,6%', cresc: '+9%', leitura: 'Cross-sell', prioridade: 'Média', tom: 'gold' as const },
    { nome: 'Siderurgia', fat: 'R$ 4,6 mi', margem: '28,2%', cresc: '-3%', leitura: 'Risco de perda', prioridade: 'Crítica', tom: 'error' as const },
  ]
</script>

<template>
  <div>
    <!-- KPIs -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard class="h-100" delta="+14% · exemplo" label="Mineração" value="R$ 7,9 mi" />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-green)"
          class="h-100"
          delta="+9% · exemplo"
          label="Papel & Celulose"
          value="R$ 6,0 mi"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-red)"
          class="h-100"
          delta="-3% · exemplo"
          delta-tone="error"
          label="Siderurgia"
          value="R$ 4,6 mi"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-gold)"
          class="h-100"
          delta="+18% · exemplo"
          label="Agro"
          value="R$ 4,0 mi"
        />
      </v-col>
    </v-row>

    <!-- Crescimento por segmento + Mercado pouco explorado -->
    <v-row>
      <v-col cols="12" lg="8">
        <SectionCard class="h-100" subtitle="Receita x margem x tendência" title="Crescimento por segmento">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div v-for="s in crescimento" :key="s.nome" class="hbar">
            <span class="hbar__label">{{ s.nome }}</span>

            <div class="hbar__track">
              <div class="hbar__fill" :style="{ width: `${s.pct}%`, background: s.color }" />
            </div>

            <StatusChip class="hbar__chip" :label="s.delta" :tone="s.tom" />
          </div>
        </SectionCard>
      </v-col>

      <v-col cols="12" lg="4">
        <SectionCard class="h-100 ia-card" large title="Mercado pouco explorado">
          <div class="ia-headline">Agro combina crescimento alto com baixa penetração.</div>

          <p class="ia-sub mt-4 mb-0">
            Clientes semelhantes ao perfil atual indicam espaço para ampliar portfólio NTN e Timken.
          </p>

          <span class="ia-pill mt-6">Potencial R$ 2,2 mi</span>

          <div>
            <v-btn class="ia-btn mt-4" variant="flat" @click="router.push('/clientes')">
              Ver contas-alvo
            </v-btn>
          </div>

          <div class="ia-note">Dado de exemplo</div>
        </SectionCard>
      </v-col>
    </v-row>

    <!-- Segmentos prioritários -->
    <v-row>
      <v-col cols="12">
        <SectionCard subtitle="Oportunidade x risco" title="Segmentos prioritários">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div class="table-wrap">
            <table class="seg">
              <thead>
                <tr>
                  <th>Segmento</th>
                  <th>Faturamento</th>
                  <th>Margem</th>
                  <th>Crescimento</th>
                  <th>Leitura IA</th>
                  <th>Prioridade</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="s in segmentos" :key="s.nome">
                  <td class="seg__strong">{{ s.nome }}</td>
                  <td>{{ s.fat }}</td>
                  <td>{{ s.margem }}</td>
                  <td>{{ s.cresc }}</td>
                  <td class="seg__strong">{{ s.leitura }}</td>
                  <td class="seg__strong">{{ s.prioridade }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.hbar { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.hbar__label { width: 120px; flex-shrink: 0; font-size: 13px; color: var(--ip-text); }
.hbar__track { flex: 1; height: 10px; border-radius: 5px; background: var(--ip-bg); }
.hbar__fill { height: 100%; border-radius: 5px; }
.hbar__chip { min-width: 56px; justify-content: center; }

.table-wrap { overflow-x: auto; }
.seg { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.seg th { text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--ip-text-muted); }
.seg td { padding: 12px; color: var(--ip-text-muted); border-top: 1px solid var(--ip-border); }
.seg__strong { font-weight: 600; color: var(--ip-text) !important; }

.ia-card { background: #102338 !important; border-color: #102338 !important; }
.ia-card :deep(.ip-card-title) { color: var(--ip-gold); font-size: 12px; font-weight: 600; }
.ia-headline { font-size: 22px; font-weight: 700; line-height: 1.3; color: #fff; }
.ia-sub { font-size: 13px; line-height: 1.5; color: rgba(255, 255, 255, 0.75); }
.ia-pill { display: inline-flex; align-items: center; height: 28px; padding: 0 16px; border-radius: 14px; background: var(--ip-tint-green); color: var(--ip-green); font-size: 11px; font-weight: 600; }
.ia-btn { background: var(--ip-navy) !important; color: #fff !important; }
.ia-note { margin-top: 20px; font-size: 11px; color: rgba(255, 255, 255, 0.5); }
</style>
