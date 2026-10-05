<script lang="ts" setup>
  import KpiCard from '@/components/KpiCard.vue'
  import SectionCard from '@/components/SectionCard.vue'
  import StatusChip from '@/components/StatusChip.vue'

  // ── DADOS DE EXEMPLO (do Figma) — a base ainda não tem custo, margem nem desconto por produto ──
  const bolhas = [
    { x: 10, y: 69, d: 14, c: '#17324d' },
    { x: 20, y: 54, d: 14, c: '#2f6b9a' },
    { x: 30, y: 30, d: 16, c: '#1d7a4d' },
    { x: 42, y: 45, d: 18, c: '#b39b5e' },
    { x: 52, y: 64, d: 14, c: '#d9232e' },
    { x: 65, y: 33, d: 16, c: '#17324d' },
    { x: 79, y: 49, d: 14, c: '#d9232e' },
    { x: 92, y: 72, d: 16, c: '#b39b5e' },
  ]

  const alertas = [
    { tag: '14 contas A', tom: 'error' as const, texto: 'desconto > 12%' },
    { tag: 'FAG • linha X', tom: 'gold' as const, texto: 'margem -3,2 p.p.' },
    { tag: 'Mineração', tom: 'info' as const, texto: 'preço 4,6% abaixo média' },
  ]

  const produtos = [
    { produto: 'Rolamento 22224-E1-XL', marca: 'FAG', margem: '24,8%', desconto: '13,2%', impacto: '+ R$ 184 mil', acao: 'Reprecificar' },
    { produto: 'NU 318 ECP', marca: 'SKF', margem: '26,2%', desconto: '11,8%', impacto: '+ R$ 126 mil', acao: 'Revisar faixa' },
    { produto: '22320-E1', marca: 'FAG', margem: '28,1%', desconto: '10,9%', impacto: '+ R$ 98 mil', acao: 'Reduzir desconto' },
    { produto: 'UC 210', marca: 'NTN', margem: '29,0%', desconto: '9,6%', impacto: '+ R$ 72 mil', acao: 'Teste preço' },
  ]
</script>

<template>
  <div>
    <!-- KPIs -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard class="h-100" delta="+1,4 p.p. · exemplo" label="Margem bruta" value="32,8%" />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-navy)"
          class="h-100"
          delta="+0,06x · exemplo"
          label="Markup médio"
          value="1,48x"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-blue)"
          class="h-100"
          delta="-0,8 p.p. · exemplo"
          delta-tone="error"
          label="Desconto médio"
          value="7,6%"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-gold)"
          class="h-100"
          delta="+12% · exemplo"
          label="Margem potencial"
          value="R$ 920 mil"
        />
      </v-col>
    </v-row>

    <!-- Desconto x Conversão + Alertas de margem -->
    <v-row>
      <v-col cols="12" lg="8">
        <SectionCard class="h-100" subtitle="Mais desconto nem sempre gera mais fechamento" title="Desconto x Conversão">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div class="plot">
            <span class="plot__axis plot__axis--y">↑ Conversão</span>
            <span class="plot__axis plot__axis--x">Desconto →</span>
            <div class="plot__base" />

            <span
              v-for="(b, i) in bolhas"
              :key="i"
              class="plot__dot"
              :style="{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.d}px`, height: `${b.d}px`, background: b.c }"
            />
          </div>
        </SectionCard>
      </v-col>

      <v-col cols="12" lg="4">
        <SectionCard class="h-100" subtitle="Onde existe vazamento de rentabilidade" title="Alertas de margem">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div v-for="a in alertas" :key="a.tag" class="row-item">
            <StatusChip class="row-item__tag" :label="a.tag" :tone="a.tom" />
            <span class="row-item__text">{{ a.texto }}</span>
          </div>
        </SectionCard>
      </v-col>
    </v-row>

    <!-- Produtos com oportunidade de ganho de margem -->
    <v-row>
      <v-col cols="12">
        <SectionCard subtitle="Volume alto + desconto acima da referência" title="Produtos com oportunidade de ganho de margem">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div class="table-wrap">
            <table class="prod">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Marca</th>
                  <th>Margem</th>
                  <th>Desconto</th>
                  <th>Impacto potencial</th>
                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="p in produtos" :key="p.produto">
                  <td class="prod__strong">{{ p.produto }}</td>
                  <td>{{ p.marca }}</td>
                  <td>{{ p.margem }}</td>
                  <td>{{ p.desconto }}</td>
                  <td class="prod__strong">{{ p.impacto }}</td>
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
.plot { position: relative; height: 220px; }
.plot__axis { position: absolute; font-size: 11px; color: var(--ip-text-muted); }
.plot__axis--y { top: 0; left: 0; }
.plot__axis--x { bottom: 0; right: 0; }
.plot__base { position: absolute; left: 0; right: 0; bottom: 24px; height: 1px; background: var(--ip-border); }
.plot__dot { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); }

.row-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; margin-bottom: 10px; border-radius: 12px; background: var(--ip-bg); }
.row-item__tag { min-width: 110px; justify-content: center; }
.row-item__text { font-size: 13px; font-weight: 600; color: var(--ip-text); }

.table-wrap { overflow-x: auto; }
.prod { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.prod th { text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--ip-text-muted); }
.prod td { padding: 14px 12px; color: var(--ip-text-muted); border-top: 1px solid var(--ip-border); }
.prod__strong { font-weight: 600; color: var(--ip-text) !important; }
</style>
