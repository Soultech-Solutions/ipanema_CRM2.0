<script lang="ts" setup>
  import { useRouter } from 'vue-router'
  import KpiCard from '@/components/KpiCard.vue'
  import SectionCard from '@/components/SectionCard.vue'
  import StatusChip from '@/components/StatusChip.vue'

  const router = useRouter()

  // ── DADOS DE EXEMPLO (do Figma) — a base não tem meta, margem nem conversão por vendedor ──
  const ranking = [
    { nome: 'Marcos Lima', fat: 'R$ 4,8 mi', meta: '108%', margem: '35,2%', conv: '38,6%', pipeline: 'R$ 2,1 mi' },
    { nome: 'Fernanda Alves', fat: 'R$ 4,2 mi', meta: '101%', margem: '33,8%', conv: '36,1%', pipeline: 'R$ 1,9 mi' },
    { nome: 'Rafael Souza', fat: 'R$ 3,6 mi', meta: '96%', margem: '30,5%', conv: '31,9%', pipeline: 'R$ 1,7 mi' },
    { nome: 'Camila Prado', fat: 'R$ 3,2 mi', meta: '92%', margem: '36,4%', conv: '39,8%', pipeline: 'R$ 1,2 mi' },
    { nome: 'João Ribeiro', fat: 'R$ 2,9 mi', meta: '84%', margem: '27,8%', conv: '28,4%', pipeline: 'R$ 1,6 mi' },
  ]

  const melhorias = [
    { vendedor: 'Rafael Souza', titulo: 'Margem abaixo da média', sub: 'Rever desconto em 14 contas' },
    { vendedor: 'João Ribeiro', titulo: 'Conversão abaixo da média', sub: 'Priorizar 9 cotações > R$ 50 mil' },
    { vendedor: 'Fernanda Alves', titulo: 'Carteira concentrada', sub: 'Abrir 6 contas B com alto potencial' },
  ]
</script>

<template>
  <div>
    <!-- KPIs -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard class="h-100" delta="+8,2% · exemplo" label="Faturamento equipe" value="R$ 28,4 mi" />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-green)"
          class="h-100"
          delta="+3,4 p.p. · exemplo"
          label="Meta atingida"
          value="94,6%"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-blue)"
          class="h-100"
          delta="+2,8 p.p. · exemplo"
          label="Conversão média"
          value="34,2%"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-red)"
          class="h-100"
          delta="-14% · exemplo"
          delta-tone="error"
          label="Follow-ups vencidos"
          value="127"
        />
      </v-col>
    </v-row>

    <!-- Ranking comercial -->
    <v-row>
      <v-col cols="12">
        <SectionCard subtitle="Resultado com qualidade de margem" title="Ranking comercial">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div class="table-wrap">
            <table class="rank">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Faturamento</th>
                  <th>Meta</th>
                  <th>Margem</th>
                  <th>Conversão</th>
                  <th>Pipeline</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="v in ranking" :key="v.nome">
                  <td class="rank__strong">{{ v.nome }}</td>
                  <td class="rank__strong">{{ v.fat }}</td>
                  <td>{{ v.meta }}</td>
                  <td>{{ v.margem }}</td>
                  <td>{{ v.conv }}</td>
                  <td>{{ v.pipeline }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      </v-col>
    </v-row>

    <!-- Oportunidades de melhoria + Ação recomendada -->
    <v-row>
      <v-col cols="12" lg="6">
        <SectionCard class="h-100" subtitle="Ações sugeridas por vendedor" title="Oportunidades de melhoria">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div v-for="m in melhorias" :key="m.vendedor" class="row-item">
            <StatusChip class="row-item__who" :label="m.vendedor" tone="info" />

            <div>
              <div class="row-item__title">{{ m.titulo }}</div>
              <div class="row-item__sub">{{ m.sub }}</div>
            </div>
          </div>
        </SectionCard>
      </v-col>

      <v-col cols="12" lg="6">
        <SectionCard class="h-100 ia-card" large title="Ação recomendada hoje">
          <div class="ia-headline">12 oportunidades somam R$ 1,4 mi e estão sem follow-up.</div>

          <p class="ia-sub mt-4 mb-0">
            Priorize as contas com maior probabilidade de fechamento e margem acima de 30%.
          </p>

          <v-btn class="ia-btn mt-8" variant="flat" @click="router.push('/oportunidades')">
            Ver fila comercial
          </v-btn>

          <div class="ia-note">Dado de exemplo</div>
        </SectionCard>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }
.rank { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.rank th { text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--ip-text-muted); }
.rank td { padding: 16px 12px; color: var(--ip-text); border-top: 1px solid var(--ip-border); }
.rank__strong { font-weight: 600; }

.row-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-bottom: 10px; border-radius: 12px; background: var(--ip-bg); }
.row-item__who { min-width: 120px; justify-content: center; }
.row-item__title { font-size: 14px; font-weight: 600; color: var(--ip-text); }
.row-item__sub { font-size: 13px; color: var(--ip-text-muted); }

.ia-card { background: #102338 !important; border-color: #102338 !important; }
.ia-card :deep(.ip-card-title) { color: rgba(255, 255, 255, 0.7); font-size: 12px; font-weight: 600; }
.ia-headline { font-size: 24px; font-weight: 700; line-height: 1.3; color: #fff; }
.ia-sub { font-size: 13px; line-height: 1.5; color: rgba(255, 255, 255, 0.75); }
.ia-btn { background: var(--ip-navy) !important; color: #fff !important; }
.ia-note { margin-top: 20px; font-size: 11px; color: rgba(255, 255, 255, 0.5); }
</style>
