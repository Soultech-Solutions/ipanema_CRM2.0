<script lang="ts" setup>
  import type { ChipTone } from '@/components/StatusChip.vue'
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import KpiCard from '@/components/KpiCard.vue'
  import SectionCard from '@/components/SectionCard.vue'
  import StatusChip from '@/components/StatusChip.vue'
  import { useClientsStore } from '@/stores/clients'
  import { formatCurrency } from '@/utils/format'

  const store = useClientsStore()
  const router = useRouter()
  const search = ref('')
  const statusFilter = ref<string | null>(null)

  const filtered = computed(() => {
    const q = search.value.toLowerCase().trim()
    return store.list.filter(c => {
      const matchQ = !q
        || c.nome.toLowerCase().includes(q)
        || c.segmento.toLowerCase().includes(q)
        || c.vendedorNome.toLowerCase().includes(q)
      const matchStatus = !statusFilter.value || c.status === statusFilter.value
      return matchQ && matchStatus
    })
  })

  // KPIs reais, calculados sobre a carteira inteira (não sobre o filtro)
  const totalClientes = computed(() => store.list.length)
  const receitaAnual = computed(() => store.list.reduce((s, c) => s + (c.receitaAnual ?? 0), 0))
  const receitaEmRisco = computed(() => store.list.reduce((s, c) => s + (c.receitaEmRisco ?? 0), 0))
  const receitaPotencial = computed(() => store.list.reduce((s, c) => s + (c.receitaPotencial ?? 0), 0))

  const statusOptions = [
    { title: 'Todos', value: null },
    { title: 'Ativo', value: 'ativo' },
    { title: 'Em risco', value: 'risco' },
    { title: 'Inativo', value: 'inativo' },
  ]

  const headers = [
    { title: 'Cliente', key: 'nome', sortable: true },
    { title: 'Segmento', key: 'segmento' },
    { title: 'Vendedor', key: 'vendedorNome' },
    { title: 'Health Score', key: 'healthScore' },
    { title: 'Receita anual', key: 'receitaAnual' },
    { title: 'Em risco', key: 'receitaEmRisco' },
    { title: 'Potencial', key: 'receitaPotencial' },
    { title: 'Status', key: 'status' },
  ]

  function healthTone (score: number): ChipTone {
    if (score >= 80) return 'success'
    if (score >= 70) return 'gold'
    return 'error'
  }

  function statusInfo (status: string): { label: string, tone: ChipTone } {
    if (status === 'ativo') return { label: 'Ativo', tone: 'success' }
    if (status === 'risco') return { label: 'Em risco', tone: 'error' }
    return { label: 'Inativo', tone: 'neutral' }
  }

  onMounted(() => store.loadAll())
</script>

<template>
  <div>
    <!-- KPIs -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard class="h-100" label="Clientes na carteira" :value="totalClientes.toLocaleString('pt-BR')" />
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-blue)"
          class="h-100"
          label="Receita anual"
          :value="formatCurrency(receitaAnual, true)"
        />
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-red)"
          class="h-100"
          label="Receita em risco"
          :value="formatCurrency(receitaEmRisco, true)"
        />
      </v-col>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-green)"
          class="h-100"
          label="Potencial"
          :value="formatCurrency(receitaPotencial, true)"
        />
      </v-col>
    </v-row>

    <!-- Tabela -->
    <    <SectionCard class="mt-3" subtitle="Health Score, receita em risco, potencial e insights por conta" title="Carteira de clientes">class="mt-3" subtitle="Cotações relevantes sem avanço ou follow-up" title="Oportunidades de recuperação">
      <v-row class="mb-2" density="compact">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="search"
            clearable
            density="comfortable"
            hide-details
            label="Buscar cliente, segmento ou vendedor"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="statusFilter"
            density="comfortable"
            hide-details
            :items="statusOptions"
            label="Status"
            variant="outlined"
          />
        </v-col>
      </v-row>

      <v-data-table
        class="clients-table"
        density="comfortable"
        :headers="headers"
        hover
        item-value="id"
        :items="filtered"
        :loading="store.loading"
        items-per-page-text="Itens por página"
        loading-text="Carregando clientes…"
        no-data-text="Nenhum cliente encontrado"
        page-text="{0}-{1} de {2}"
        @click:row="(_e: Event, { item }: { item: { id: string } }) => router.push(`/clientes/${item.id}`)"
      >
        <template #item.nome="{ item }">
          <span class="client-name">{{ item.nome }}</span>
        </template>

        <template #item.healthScore="{ item }">
          <StatusChip :label="String(item.healthScore)" :tone="healthTone(item.healthScore)" />
        </template>

        <template #item.receitaAnual="{ item }">
          {{ formatCurrency(item.receitaAnual, true) }}
        </template>

        <template #item.receitaEmRisco="{ item }">
          <span class="money money--risk">{{ formatCurrency(item.receitaEmRisco, true) }}</span>
        </template>

        <template #item.receitaPotencial="{ item }">
          <span class="money money--potential">{{ formatCurrency(item.receitaPotencial, true) }}</span>
        </template>

        <template #item.status="{ item }">
          <StatusChip :label="statusInfo(item.status).label" :tone="statusInfo(item.status).tone" />
        </template>
      </v-data-table>
    </SectionCard>
  </div>
</template>

<style scoped>
.clients-table { background: transparent; }
.clients-table :deep(th) { font-size: 12px !important; font-weight: 600 !important; color: var(--ip-text-muted) !important; }
.clients-table :deep(tbody tr) { cursor: pointer; }
.clients-table :deep(td) { font-size: 13px !important; }
.client-name { font-weight: 600; color: var(--ip-text); }
.money { font-weight: 600; }
.money--risk { color: var(--ip-red); }
.money--potential { color: var(--ip-blue); }
</style>