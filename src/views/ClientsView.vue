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

  // ── KPIs reais (carteira inteira, não o filtro) ──
  const totalAtivos = computed(() => store.list.filter(c => c.status === 'ativo').length)
  const totalRisco = computed(() => store.list.filter(c => c.status === 'risco').length)
  const totalInativos = computed(() => store.list.filter(c => c.status === 'inativo').length)
  const ticketMedio = computed(() => {
    const comReceita = store.list.filter(c => (c.receitaAnual ?? 0) > 0)
    if (comReceita.length === 0) return 0
    return comReceita.reduce((s, c) => s + c.receitaAnual, 0) / comReceita.length
  })

  // ── Curva ABC real, pela receita anual acumulada (A até 80%, B até 95%, C o resto) ──
  const abcById = computed(() => {
    const sorted = store.list.toSorted((a, b) => (b.receitaAnual ?? 0) - (a.receitaAnual ?? 0))
    const total = sorted.reduce((s, c) => s + (c.receitaAnual ?? 0), 0)
    const map = new Map<string, string>()
    let acumulado = 0
    for (const c of sorted) {
      acumulado += c.receitaAnual ?? 0
      const share = total > 0 ? acumulado / total : 1
      map.set(c.id, share <= 0.8 ? 'A' : (share <= 0.95 ? 'B' : 'C'))
    }
    return map
  })

  // ── Clientes prioritários: maior valor em jogo (risco + potencial) ──
  const prioritarios = computed(() =>
    store.list
      .toSorted((a, b) => ((b.receitaEmRisco ?? 0) + (b.receitaPotencial ?? 0)) - ((a.receitaEmRisco ?? 0) + (a.receitaPotencial ?? 0)))
      .slice(0, 4))

  function oportunidade (c: { status: string, receitaPotencial: number }) {
    if (c.status === 'risco') return 'Retenção'
    if (c.status === 'inativo') return 'Reativação'
    return c.receitaPotencial > 0 ? 'Cross-sell' : 'Acompanhar'
  }

  function acao (c: { status: string }) {
    if (c.status === 'risco') return 'Atacar hoje'
    if (c.status === 'inativo') return 'Contato'
    return 'Expandir'
  }

  // ── Dados de exemplo (Figma): a base não tem margem por cliente ──
  const bolhas = [
    { x: 17, y: 47, d: 32, c: '#17324d' },
    { x: 32, y: 30, d: 48, c: '#1d7a4d' },
    { x: 40, y: 69, d: 34, c: '#d9232e' },
    { x: 59, y: 19, d: 58, c: '#2f6b9a' },
    { x: 69, y: 54, d: 42, c: '#b39b5e' },
    { x: 79, y: 33, d: 28, c: '#17324d' },
    { x: 49, y: 88, d: 24, c: '#1d7a4d' },
    { x: 90, y: 75, d: 40, c: '#d9232e' },
  ]

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

  function open (id: string) {
    router.push(`/clientes/${id}`)
  }

  onMounted(() => store.loadAll())
</script>

<template>
  <div>
    <!-- KPIs -->
    <v-row>
      <v-col cols="12" lg="3" sm="6">
        <KpiCard class="h-100" label="Clientes na carteira" :value="store.list.length.toLocaleString('pt-BR')" />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-red)"
          class="h-100"
          label="Clientes em risco"
          :value="totalRisco.toLocaleString('pt-BR')"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-green)"
          class="h-100"
          delta="+18% · exemplo"
          label="Reativados"
          value="43"
        />
      </v-col>

      <v-col cols="12" lg="3" sm="6">
        <KpiCard
          accent="var(--ip-blue)"
          class="h-100"
          label="Ticket médio"
          :value="formatCurrency(ticketMedio, true)"
        />
      </v-col>
    </v-row>

    <!-- Mapa da carteira + Carteira por status -->
    <v-row>
      <v-col cols="12" lg="8">
        <SectionCard class="h-100" subtitle="Faturamento x margem • tamanho = potencial" title="Mapa da carteira">
          <template #actions>
            <StatusChip label="Dado de exemplo" tone="gold" />
          </template>

          <div class="map">
            <span class="map__axis map__axis--y">↑ Faturamento</span>
            <span class="map__axis map__axis--x">Margem →</span>

            <span
              v-for="(b, i) in bolhas"
              :key="i"
              class="map__dot"
              :style="{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.d}px`, height: `${b.d}px`, background: b.c }"
            />
          </div>
        </SectionCard>
      </v-col>

      <v-col cols="12" lg="4">
        <SectionCard class="h-100" subtitle="Distribuição da carteira por status" title="Carteira por status">
          <div class="status-row">
            <StatusChip class="status-row__chip" label="Ativos" tone="success" />
            <span class="status-row__n">{{ totalAtivos.toLocaleString('pt-BR') }}</span>
          </div>

          <div class="status-row">
            <StatusChip class="status-row__chip" label="Em risco" tone="error" />
            <span class="status-row__n">{{ totalRisco.toLocaleString('pt-BR') }}</span>
          </div>

          <div class="status-row">
            <StatusChip class="status-row__chip" label="Inativos" tone="neutral" />
            <span class="status-row__n">{{ totalInativos.toLocaleString('pt-BR') }}</span>
          </div>
        </SectionCard>
      </v-col>
    </v-row>

    <!-- Clientes prioritários -->
    <v-row>
      <v-col cols="12">
        <SectionCard subtitle="Risco, reativação e cross-sell" title="Clientes prioritários">
          <div class="table-wrap">
            <table class="prio">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>ABC</th>
                  <th>Tendência</th>
                  <th>Margem</th>
                  <th>Oportunidade</th>
                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="c in prioritarios" :key="c.id" @click="open(c.id)">
                  <td class="prio__strong">{{ c.nome }}</td>
                  <td>{{ abcById.get(c.id) }}</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{{ oportunidade(c) }}</td>
                  <td class="prio__strong">{{ acao(c) }}</td>
                </tr>

                <tr v-if="prioritarios.length === 0">
                  <td class="text-center py-6" colspan="6">Nenhum cliente carregado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      </v-col>
    </v-row>

    <!-- Todos os clientes (busca, filtro e detalhe) -->
    <v-row>
      <v-col cols="12">
        <SectionCard subtitle="Busca, filtro e acesso ao detalhe de cada conta" title="Todos os clientes">
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
            items-per-page-text="Itens por página"
            :loading="store.loading"
            loading-text="Carregando clientes…"
            no-data-text="Nenhum cliente encontrado"
            page-text="{0}-{1} de {2}"
            @click:row="(_e: Event, { item }: { item: { id: string } }) => open(item.id)"
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
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.map { position: relative; height: 250px; }
.map__axis { position: absolute; font-size: 11px; color: var(--ip-text-muted); }
.map__axis--y { top: 0; left: 0; }
.map__axis--x { bottom: 0; right: 0; }
.map__dot { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); }

.status-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.status-row__chip { min-width: 110px; justify-content: flex-start; height: 32px; }
.status-row__n { font-size: 14px; font-weight: 600; color: var(--ip-text); }

.table-wrap { overflow-x: auto; }
.prio { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.prio th { text-align: left; padding: 8px 12px; font-size: 12px; font-weight: 600; color: var(--ip-text-muted); }
.prio td { padding: 14px 12px; color: var(--ip-text-muted); border-top: 1px solid var(--ip-border); }
.prio tbody tr { cursor: pointer; }
.prio tbody tr:hover { background: var(--ip-bg); }
.prio__strong { font-weight: 600; color: var(--ip-text) !important; }

.clients-table { background: transparent; }
.clients-table :deep(th) { font-size: 12px !important; font-weight: 600 !important; color: var(--ip-text-muted) !important; }
.clients-table :deep(tbody tr) { cursor: pointer; }
.clients-table :deep(td) { font-size: 13px !important; }
.client-name { font-weight: 600; color: var(--ip-text); }
.money { font-weight: 600; }
.money--risk { color: var(--ip-red); }
.money--potential { color: var(--ip-blue); }
</style>
