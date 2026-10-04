<script lang="ts" setup>
  import KpiCard from '@/components/KpiCard.vue'
  import SectionCard from '@/components/SectionCard.vue'
  import StatusChip from '@/components/StatusChip.vue'

  // ── DADOS DE EXEMPLO (do Figma) — a base de clientes não tem marca nem SKU ──
  const marcas = [
    { nome: 'FAG', pct: 86, delta: '+12%', color: '#17324d' },
    { nome: 'NTN', pct: 74, delta: '+9%', color: '#2f6b9a' },
    { nome: 'Timken', pct: 60, delta: '+6%', color: '#d9232e' },
    { nome: 'NKE', pct: 47, delta: '+18%', color: '#1d7a4d' },
    { nome: 'IKO', pct: 36, delta: '+4%', color: '#b39b5e' },
  ]

  const curvaAbc = [
    { letra: 'A', texto: '18% dos SKUs • 72% da receita', color: '#17324d' },
    { letra: 'B', texto: '27% dos SKUs • 19% da receita', color: '#2f6b9a' },
    { letra: 'C', texto: '55% dos SKUs • 9% da receita', color: '#b39b5e' },
  ]

  const produtos = [
    { produto: 'OPTIME C1', marca: 'Schaeffler', segmento: 'Mineração', alvo: '18 contas', potencial: 'R$ 480 mil', acao: 'Campanha' },
    { produto: 'KIZEI®', marca: 'NTN', segmento: 'Papel & Celulose', alvo: '14 contas', potencial: 'R$ 310 mil', acao: 'Cross-sell' },
    { produto: 'LOAD1000', marca: 'FAG', segmento: 'Mineração', alvo: '11 contas', potencial: 'R$ 265 mil', acao: 'Técnico' },
    { produto: 'Heater 50', marca: 'Schaeffler', segmento: 'Industrial', alvo: '23 contas', potencial: 'R$ 220 mil', acao: 'Reativar' },
  ]
</script>

<template>
  <div>
    <!-- KPIs -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard class="h-100" delta="+8,2% · exemplo" label="Faturamento portfólio" value="R$ 28,4 mi" />
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-blue)"
          class="h-100"
          delta="+3,1% · exemplo"
          label="SKUs ativos"
          value="4.982"
        />
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-green)"
          class="h-100"
          delta="+1,4 p.p. · exemplo"
          label="Margem média"
          value="32,8%"
        />
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-gold)"
          class="h-100"
          delta="+21% · exemplo"
          label="SKUs expansão"
          value="186"
        />
      </v-col>
    </v-row>

    <!-- Desempenho por marca + Curva ABC -->
    <v-row>
      <v-col cols="12" lg="7">
        <SectionCard class="h-100" subtitle="Faturamento e crescimento" title="Desempenho por marca">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>
          <div v-for="m in marcas" :key="m.nome" class="hbar">
            <span class="hbar__label">{{ m.nome }}</span>
            <div class="hbar__track">
              <div class="hbar__fill" :style="{ width: `${m.pct}%`, background: m.color }" />
            </div>
            <StatusChip class="hbar__chip" :label="m.delta" tone="success" />
          </div>
        </SectionCard>
      </v-col>

      <v-col cols="12" lg="5">
        <SectionCard class="h-100" subtitle="Concentração de receita por SKU" title="Curva ABC">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>
          <div v-for="c in curvaAbc" :key="c.letra" class="abc">
            <span class="abc__letter" :style="{ color: c.color }">{{ c.letra }}</span>
            <span class="abc__text">{{ c.texto }}</span>
          </div>
        </SectionCard>
      </v-col>
    </v-row>

    <!-- Produtos com maior potencial de expansão -->
    <v-row>
      <v-col cols="12">
        <SectionCard subtitle="Clientes semelhantes compram — sua carteira ainda não" title="Produtos com maior potencial de expansão">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>
          <div class="table-wrap">
            <table class="prod">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Marca</th>
                  <th>Segmento forte</th>
                  <th>Clientes alvo</th>
                  <th>Potencial</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in produtos" :key="p.produto">
                  <td class="prod__strong">{{ p.produto }}</td>
                  <td>{{ p.marca }}</td>
                  <td>{{ p.segmento }}</td>
                  <td>{{ p.alvo }}</td>
                  <td class="prod__strong">{{ p.potencial }}</td>
                  <td class="prod__strong">{{ p.acao }}</td>
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
.hbar { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.hbar__label { width: 64px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--ip-text); }
.hbar__track { flex: 1; height: 10px; border-radius: 5px; background: var(--ip-bg); }
.hbar__fill { height: 100%; border-radius: 5px; }
.hbar__chip { min-width: 56px; justify-content: center; }

.abc { display: flex; align-items: center; gap: 16px; margin-bottom: 22px; }
.abc__letter { width: 24px; font-size: 22px; font-weight: 700; }
.abc__text { font-size: 13px; font-weight: 600; color: var(--ip-text); }

.table-wrap { overflow-x: auto; }
.prod { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.prod th { text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--ip-text-muted); }
.prod td { padding: 14px 12px; color: var(--ip-text-muted); border-top: 1px solid var(--ip-border); }
.prod__strong { font-weight: 600; color: var(--ip-text) !important; }
</style>