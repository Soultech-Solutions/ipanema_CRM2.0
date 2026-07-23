<script lang="ts" setup>
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useClientsStore } from '@/stores/clients'
  import { formatCurrency, healthColor } from '@/utils/format'

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

  onMounted(() => store.loadAll())
</script>

<template>
  <div>
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1">Dashboard dos Clientes</h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          Health Score, receita em risco, potencial e insights por conta.
        </p>
      </div>
    </div>

    <v-row class="mb-4" dense>
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
          :items="[
            { title: 'Todos', value: null },
            { title: 'Ativo', value: 'ativo' },
            { title: 'Em risco', value: 'risco' },
            { title: 'Inativo', value: 'inativo' },
          ]"
          label="Status"
          variant="outlined"
        />
      </v-col>
    </v-row>

    <v-card rounded="lg" variant="outlined">
      <v-data-table
        density="comfortable"
        :headers="[
          { title: 'Cliente', key: 'nome', sortable: true },
          { title: 'Segmento', key: 'segmento' },
          { title: 'Vendedor', key: 'vendedorNome' },
          { title: 'Health Score', key: 'healthScore' },
          { title: 'Receita anual', key: 'receitaAnual' },
          { title: 'Em risco', key: 'receitaEmRisco' },
          { title: 'Potencial', key: 'receitaPotencial' },
          { title: 'Status', key: 'status' },
        ]"
        hover
        item-value="id"
        :items="filtered"
        :loading="store.loading"
        @click:row="(_e: Event, { item }: { item: { id: string } }) => router.push(`/clientes/${item.id}`)"
      >
        <template #item.healthScore="{ item }">
          <v-chip :color="healthColor(item.healthScore)" size="small" variant="flat">
            {{ item.healthScore }}
          </v-chip>
        </template>

        <template #item.receitaAnual="{ item }">
          {{ formatCurrency(item.receitaAnual, true) }}
        </template>

        <template #item.receitaEmRisco="{ item }">
          <span class="text-warning font-weight-medium">
            {{ formatCurrency(item.receitaEmRisco, true) }}
          </span>
        </template>

        <template #item.receitaPotencial="{ item }">
          <span class="text-info font-weight-medium">
            {{ formatCurrency(item.receitaPotencial, true) }}
          </span>
        </template>

        <template #item.status="{ item }">
          <v-chip
            class="text-capitalize"
            :color="item.status === 'ativo' ? 'success' : item.status === 'risco' ? 'warning' : 'default'"
            size="small"
            variant="tonal"
          >
            {{ item.status }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>
