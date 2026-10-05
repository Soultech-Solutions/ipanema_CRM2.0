<script lang="ts" setup>
  import KpiCard from '@/components/KpiCard.vue'
  import SectionCard from '@/components/SectionCard.vue'
  import StatusChip from '@/components/StatusChip.vue'

  // ── DADOS DE EXEMPLO (do Figma) — ainda não ligados ao store de oportunidades ──
  const pipeline = [
    { etapa: 'Entrada', valor: 184, color: '#17324d' },
    { etapa: 'Proposta', valor: 138, color: '#2f6b9a' },
    { etapa: 'Negociação', valor: 92, color: '#b39b5e' },
    { etapa: 'Fechado', valor: 63, color: '#1d7a4d' },
    { etapa: 'Perdido', valor: 41, color: '#d9232e' },
  ]
  const pipelineMax = Math.max(...pipeline.map(p => p.valor))

  const motivosPerda = [
    { motivo: 'Preço', pct: 31, color: '#d9232e' },
    { motivo: 'Prazo', pct: 22, color: '#b39b5e' },
    { motivo: 'Marca concorrente', pct: 18, color: '#2f6b9a' },
    { motivo: 'Sem retorno', pct: 16, color: '#667484' },
    { motivo: 'Especificação', pct: 13, color: '#1d7a4d' },
  ]
  const motivoMax = Math.max(...motivosPerda.map(m => m.pct))

  const recuperacao = [
    { cliente: 'Usiminas • Ipatinga', cotacao: '#CT-89102', valor: 'R$ 428 mil', parado: '9 dias', motivo: 'Sem retorno', acao: 'Reativar' },
    { cliente: 'Suzano • Limeira', cotacao: '#CT-89288', valor: 'R$ 312 mil', parado: '7 dias', motivo: 'Preço', acao: 'Revisar margem' },
    { cliente: 'Vale • Itabira', cotacao: '#CT-89410', valor: 'R$ 276 mil', parado: '6 dias', motivo: 'Especificação', acao: 'Acionar técnico' },
    { cliente: 'Raizen • Sertãozinho', cotacao: '#CT-89501', valor: 'R$ 198 mil', parado: '5 dias', motivo: 'Prazo', acao: 'Reprogramar' },
  ]
</script>

<template>
  <div>
    <!-- KPIs -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard class="h-100" delta="+11,4% · exemplo" label="Valor cotado" value="R$ 18,6 mi" />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-green)"
          class="h-100"
          delta="+2,8 p.p. · exemplo"
          label="Conversão"
          value="34,2%"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-blue)"
          class="h-100"
          delta="-1,6 dia · exemplo"
          delta-tone="error"
          label="Tempo fechamento"
          value="11,8 dias"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-red)"
          class="h-100"
          delta="-6,1% · exemplo"
          delta-tone="error"
          label="Cotações paradas"
          value="R$ 3,7 mi"
        />
      </v-col>
    </v-row>

    <!-- Pipeline + Motivos de perda -->
    <v-row>
      <v-col cols="12" lg="6">
        <SectionCard class="h-100" subtitle="Do orçamento ao fechamento" title="Pipeline">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div v-for="p in pipeline" :key="p.etapa" class="hbar">
            <span class="hbar__label">{{ p.etapa }}</span>

            <div class="hbar__track">
              <div class="hbar__fill" :style="{ width: `${(p.valor / pipelineMax) * 100}%`, background: p.color }" />
            </div>

            <span class="hbar__value">{{ p.valor }}</span>
          </div>
        </SectionCard>
      </v-col>

      <v-col cols="12" lg="6">
        <SectionCard class="h-100" subtitle="Onde estamos perdendo mais" title="Motivos de perda">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div v-for="m in motivosPerda" :key="m.motivo" class="hbar">
            <span class="hbar__label">{{ m.motivo }}</span>

            <div class="hbar__track">
              <div class="hbar__fill" :style="{ width: `${(m.pct / motivoMax) * 100}%`, background: m.color }" />
            </div>

            <span class="hbar__value">{{ m.pct }}%</span>
          </div>
        </SectionCard>
      </v-col>
    </v-row>

    <!-- Oportunidades de recuperação -->
    <SectionCard class="mt-3" subtitle="Cotações relevantes sem avanço ou follow-up" title="Oportunidades de recuperação">
      <template #actions>
        <StatusChip label="Dado de exemplo" tone="gold" />
      </template>

      <div class="table-wrap">
        <table class="recovery">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Cotação</th>
              <th>Valor</th>
              <th>Parado há</th>
              <th>Motivo</th>
              <th>Ação</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="r in recuperacao" :key="r.cotacao">
              <td class="recovery__strong">{{ r.cliente }}</td>
              <td>{{ r.cotacao }}</td>
              <td class="recovery__strong">{{ r.valor }}</td>
              <td>{{ r.parado }}</td>
              <td>{{ r.motivo }}</td>
              <td class="recovery__strong">{{ r.acao }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  </div>
</template>

<style scoped>
.hbar { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.hbar__label { width: 120px; flex-shrink: 0; font-size: 13px; color: var(--ip-text); }
.hbar__track { flex: 1; height: 10px; border-radius: 5px; background: var(--ip-bg); }
.hbar__fill { height: 100%; border-radius: 5px; }
.hbar__value { width: 40px; text-align: right; font-size: 13px; font-weight: 600; color: var(--ip-text); }

.table-wrap { overflow-x: auto; }
.recovery { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.recovery th { text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--ip-text-muted); }
.recovery td { padding: 14px 12px; color: var(--ip-text-muted); border-top: 1px solid var(--ip-border); }
.recovery__strong { font-weight: 600; color: var(--ip-text) !important; }
</style>
