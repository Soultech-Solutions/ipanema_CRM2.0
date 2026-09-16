<script lang="ts" setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()

  type Tone = 'error' | 'warning' | 'success' | 'info' | undefined

  interface KanbanCard {
    id: string
    tag: string
    tone: Tone
    titulo: string
    cliente: string
    valor: string
    aging: string
    agingVencido?: boolean
  }

  interface KanbanColumn {
    id: string
    titulo: string
    cards: KanbanCard[]
  }

  const filtros = ref([
    { key: 'vendedores', label: 'Todos os vendedores', active: false },
    { key: 'carteira', label: 'Minha carteira', tone: 'error' as Tone, active: true },
    { key: 'vencido', label: 'Follow-up vencido', tone: 'warning' as Tone, active: true },
    { key: 'alto-valor', label: 'Alto valor', active: false },
  ])

  function toggleFiltro (key: string) {
    const f = filtros.value.find(x => x.key === key)
    if (f) f.active = !f.active
  }

  const columns: KanbanColumn[] = [
    {
      id: 'novo',
      titulo: 'Novo pedido',
      cards: [
        { id: 'c1', tag: 'Em andamento', tone: 'info', titulo: 'Vale • RFQ 0926', cliente: 'Vale', valor: 'R$ 48,2k', aging: '15 min' },
        { id: 'c2', tag: 'Em andamento', tone: undefined, titulo: 'Papel Forte • 22330', cliente: 'Papel Forte', valor: 'R$ 22,8k', aging: '2h' },
      ],
    },
    {
      id: 'preparando',
      titulo: 'Preparando cotação',
      cards: [
        { id: 'c3', tag: 'Atenção', tone: 'warning', titulo: 'Rolamentos linha FAG', cliente: 'Klabin', valor: 'R$ 87,4k', aging: '5h' },
        { id: 'c4', tag: 'Em andamento', tone: undefined, titulo: 'Parada moinho', cliente: 'Mineração BR', valor: 'R$ 156k', aging: '1d' },
      ],
    },
    {
      id: 'pronto',
      titulo: 'Pronto para enviar',
      cards: [
        { id: 'c5', tag: 'Ganho provável', tone: 'success', titulo: 'Pedido 14 itens', cliente: 'Suzano', valor: 'R$ 64,9k', aging: '30 min' },
      ],
    },
    {
      id: 'aguardando',
      titulo: 'Aguardando cliente',
      cards: [
        { id: 'c6', tag: 'Follow-up vencido', tone: 'error', titulo: 'Proposta #9814', cliente: 'Gerdau', valor: 'R$ 91k', aging: '7d', agingVencido: true },
        { id: 'c7', tag: 'Atenção', tone: 'warning', titulo: 'Proposta #9820', cliente: 'CSN', valor: 'R$ 34k', aging: '3d' },
      ],
    },
    {
      id: 'followup',
      titulo: 'Follow-up',
      cards: [
        { id: 'c8', tag: 'Follow-up vencido', tone: 'error', titulo: 'Proposta #9788', cliente: 'Usina SL', valor: 'R$ 128k', aging: '15d', agingVencido: true },
      ],
    },
  ]
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
          Cada novo pedido vira um card com prazo, valor, aging e próximo passo.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat" @click="router.push('/caixa-entrada')">
          + Nova oportunidade
        </v-btn>
      </div>
    </div>

    <v-alert class="mb-4" density="compact" type="info" variant="tonal">
      Tela de exemplo — o kanban ainda não está ligado a dados reais de negociação. Layout segue o Figma aprovado.
    </v-alert>

    <!-- Filtros -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        v-for="f in filtros"
        :key="f.key"
        :color="f.active ? (f.tone || 'default') : undefined"
        rounded="pill"
        :variant="f.active ? 'tonal' : 'flat'"
        @click="toggleFiltro(f.key)"
      >
        {{ f.label }}
      </v-chip>
    </div>

    <!-- Kanban -->
    <div class="d-flex ga-3 kanban-scroll pb-2">
      <div v-for="col in columns" :key="col.id" class="kanban-col pa-3">
        <div class="d-flex align-center justify-space-between mb-3">
          <span class="text-caption font-weight-bold">{{ col.titulo }}</span>
          <v-chip color="default" rounded="pill" size="small" variant="tonal">
            {{ col.cards.length }}
          </v-chip>
        </div>

        <v-card
          v-for="card in col.cards"
          :key="card.id"
          class="pa-3 mb-3"
          rounded="lg"
          variant="outlined"
        >
          <v-chip class="mb-3" :color="card.tone" rounded="pill" size="small" variant="tonal">
            {{ card.tag }}
          </v-chip>
          <div class="text-body-2 font-weight-bold mb-1">{{ card.titulo }}</div>
          <div class="text-caption text-medium-emphasis mb-3">{{ card.cliente }}</div>
          <div class="d-flex align-center justify-space-between">
            <span class="text-body-2 font-weight-bold">{{ card.valor }}</span>
            <span
              class="text-caption font-weight-medium"
              :class="card.agingVencido ? 'text-error' : 'text-medium-emphasis'"
            >
              {{ card.aging }}
            </span>
          </div>
        </v-card>
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
  width: 220px;
  flex: 0 0 220px;
}
</style>