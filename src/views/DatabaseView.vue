<script lang="ts" setup>
  import type { Seller } from '@/types/commercial'
  import { BASE_COLUMN_MAP } from '@/types/base-comercial'
  import { computed, onMounted, ref } from 'vue'
  import { fetchSellers } from '@/api/directus'
  import { useCommercialStore } from '@/stores/commercial'
  import { useDashboardStore } from '@/stores/dashboard'
  import { formatCurrency, formatPercent } from '@/utils/format'

  const tab = ref('upload')
  const sellers = ref<Seller[]>([])
  const loading = ref(false)
  /** Vuetify file-input (sem multiple) devolve File | null, não File[] */
  const uploadFiles = ref<File | File[] | null>(null)
  const successMsg = ref('')
  const commercial = useCommercialStore()
  const dashboard = useDashboardStore()
  const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8055'

  const selectedFile = computed(() => {
    const value = uploadFiles.value
    if (!value) return null
    if (Array.isArray(value)) return value[0] ?? null
    return value
  })

  const canImport = computed(() => !!selectedFile.value && !commercial.importing && !commercial.syncing)

  const excelColumns = Object.keys(BASE_COLUMN_MAP)

  const statsCards = computed(() => {
    const s = commercial.stats
    if (!s) {
      return [
        { label: 'Clientes na base', value: '—', icon: 'mdi-account-group' },
        { label: 'Clientes ativos', value: '—', icon: 'mdi-account-check' },
        { label: 'Clientes inativos', value: '—', icon: 'mdi-account-off' },
        { label: 'Realizado no ano', value: '—', icon: 'mdi-currency-usd' },
      ]
    }
    return [
      { label: 'Clientes na base', value: s.totalClientes.toLocaleString('pt-BR'), icon: 'mdi-account-group' },
      { label: 'Clientes ativos', value: s.clientesAtivos.toLocaleString('pt-BR'), icon: 'mdi-account-check' },
      { label: 'Clientes inativos', value: s.clientesInativos.toLocaleString('pt-BR'), icon: 'mdi-account-off' },
      { label: 'Realizado no ano', value: formatCurrency(s.totalRealizado, true), icon: 'mdi-currency-usd' },
    ]
  })

  const derivedMetrics = [
    { from: 'REALIZADO (ano corrente)', to: 'Faturamento histórico / vs cotado' },
    { from: 'STATUS = INATIVO', to: 'Clientes inativos' },
    { from: 'Última Compra', to: 'Dias sem compra / risco de churn' },
    { from: 'COTADO vs REALIZADO', to: 'Taxa de conversão' },
    { from: 'Vendedor', to: 'Ranking comercial' },
    { from: 'Segmento / UF / Cidade', to: 'Mix e concentração regional' },
  ]

  const dataSources = [
    {
      title: 'Upload de planilhas',
      icon: 'mdi-cloud-upload',
      desc: 'Base comercial (cotado x realizado) no layout Ipanema.',
      action: 'upload',
    },
    {
      title: 'Carteiras de clientes',
      icon: 'mdi-account-group',
      desc: 'Clientes já vêm identificados na planilha, com vendedor e status.',
      action: 'clientes',
    },
    {
      title: 'Indicadores comerciais',
      icon: 'mdi-chart-bar',
      desc: 'Conversão, clientes inativos e receita em risco.',
      action: 'indicadores',
    },
    {
      title: 'Base para análises',
      icon: 'mdi-database',
      desc: 'Histórico único para comparativos e IA preditiva.',
      action: 'base',
    },
  ]

  async function runImport () {
    const file = selectedFile.value
    if (!file) return
    successMsg.value = ''
    try {
      await commercial.importFromFile(file)
      await dashboard.load()
      const syncNote = commercial.syncToDirectus
        ? ' · sincronizado com Directus'
        : ''
      successMsg.value = `Importação concluída: ${commercial.stats?.totalClientes.toLocaleString('pt-BR')} clientes (${commercial.stats?.clientesAtivos} ativos)${syncNote}.`
      uploadFiles.value = null
    } catch {
      // error already in commercial.error
    }
  }

  async function reloadSeed () {
    successMsg.value = ''
    commercial.clearCache()
    await commercial.importFromUrl(`${import.meta.env.BASE_URL}data/base-teste.xlsx`, 'base-teste.xlsx')
    await dashboard.load()
    successMsg.value = commercial.syncToDirectus
      ? 'Base seed recarregada e sincronizada com Directus.'
      : 'Base seed recarregada com sucesso.'
  }

  onMounted(async () => {
    loading.value = true
    try {
      await commercial.ensureLoaded()
      sellers.value = await fetchSellers()
    } finally {
      loading.value = false
    }
  })
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-h5 font-weight-bold mb-1">Base de Dados</h1>

      <p class="text-body-2 text-medium-emphasis mb-0">
        Área para vendedores e equipe comercial — importação e consolidação de informações.
      </p>
    </div>

    <v-row class="mb-6">
      <v-col
        v-for="source in dataSources"
        :key="source.title"
        cols="12"
        lg="3"
        sm="6"
      >
        <v-card
          class="h-100 source-card"
          hover
          rounded="lg"
          variant="outlined"
          @click="tab = source.action"
        >
          <v-card-text class="pa-5 text-center">
            <v-avatar
              class="mb-3"
              color="primary"
              rounded="lg"
              size="56"
              variant="tonal"
            >
              <v-icon size="28">{{ source.icon }}</v-icon>
            </v-avatar>

            <div class="text-subtitle-1 font-weight-bold mb-1">{{ source.title }}</div>
            <div class="text-body-2 text-medium-emphasis">{{ source.desc }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="lg" variant="outlined">
      <v-tabs v-model="tab" color="primary" grow>
        <v-tab prepend-icon="mdi-cloud-upload" value="upload">Upload</v-tab>
        <v-tab prepend-icon="mdi-account-group" value="clientes">Clientes</v-tab>
        <v-tab prepend-icon="mdi-badge-account" value="vendedores">Vendedores</v-tab>
        <v-tab prepend-icon="mdi-chart-bar" value="indicadores">Indicadores</v-tab>
        <v-tab prepend-icon="mdi-api" value="base">API / Integração</v-tab>
      </v-tabs>

      <v-divider />

      <v-tabs-window v-model="tab">
        <v-tabs-window-item value="upload">
          <v-card-text class="pa-6">
            <v-alert
              v-if="commercial.stats"
              class="mb-4"
              type="success"
              variant="tonal"
            >
              Base ativa:
              <strong>{{ commercial.stats.sourceName }}</strong>
              · {{ commercial.stats.totalClientes.toLocaleString('pt-BR') }} clientes
              · realizado {{ formatCurrency(commercial.stats.totalRealizado, true) }}
            </v-alert>

            <v-file-input
              v-model="uploadFiles"
              accept=".xlsx,.xls,.csv"
              chips
              label="Selecione a base de clientes (Excel)"
              prepend-icon="mdi-file-excel"
              show-size
              variant="outlined"
              :disabled="commercial.importing || commercial.syncing"
            />

            <v-alert
              v-if="commercial.syncToDirectus"
              class="mt-2"
              type="info"
              variant="tonal"
            >
              Modo Directus ativo — o import recalcula indicadores e popula a API
              (<code>{{ directusUrl }}</code>).
            </v-alert>

            <v-alert
              v-if="commercial.progress"
              class="mt-2"
              type="info"
              variant="tonal"
            >
              {{ commercial.progress }}
            </v-alert>

            <v-alert
              v-if="commercial.error"
              class="mt-2"
              type="error"
              variant="tonal"
            >
              {{ commercial.error }}
            </v-alert>

            <v-alert
              v-if="successMsg"
              class="mt-2"
              type="success"
              variant="tonal"
            >
              {{ successMsg }}
            </v-alert>

            <div class="d-flex flex-wrap ga-2 mt-4">
              <v-btn
                color="primary"
                :disabled="!canImport"
                :loading="commercial.importing || commercial.syncing"
                prepend-icon="mdi-upload"
                @click="runImport"
              >
                Importar e consolidar
              </v-btn>

              <v-btn
                :disabled="commercial.syncing"
                :loading="commercial.importing || commercial.syncing"
                prepend-icon="mdi-database-refresh"
                variant="tonal"
                @click="reloadSeed"
              >
                Recarregar base seed
              </v-btn>
            </div>

            <v-alert class="mt-4" type="info" variant="tonal">
              Layout: 1 linha = 1 cliente (cotado x realizado por mês/ano). O import
              recalcula Health Score, CII, alertas, recomendações e a carteira de
              clientes
              <template v-if="commercial.syncToDirectus">
                e grava em Directus (linhas_comerciais, clientes, KPIs)
              </template>.
            </v-alert>

            <div class="text-subtitle-2 font-weight-bold mt-6 mb-2">
              Colunas reconhecidas ({{ excelColumns.length }} fixas + cotado/realizado por mês e ano)
            </div>

            <div class="d-flex flex-wrap ga-1 mb-4">
              <v-chip
                v-for="col in excelColumns"
                :key="col"
                size="small"
                variant="outlined"
              >
                {{ col }}
              </v-chip>
            </div>

            <div class="text-subtitle-2 font-weight-bold mb-2">
              Como a IA usa esta base
            </div>

            <v-table class="mb-4" density="compact">
              <thead>
                <tr>
                  <th>Campo / regra</th>
                  <th>Indicador derivado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in derivedMetrics" :key="m.to">
                  <td><code>{{ m.from }}</code></td>
                  <td>{{ m.to }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-tabs-window-item>

        <v-tabs-window-item value="clientes">
          <v-card-text class="pa-6">
            <p class="text-body-2 mb-4">
              Clientes já vêm identificados na planilha (<code>Cód. Cliente</code> /
              <code>Razao Social</code>), com vendedor e status. Carteira em
              <router-link to="/clientes">Clientes</router-link>.
            </p>

            <v-row>
              <v-col
                v-for="item in [
                  'Faturamento (cotado x realizado por mês/ano)',
                  'Status (ATIVO / INATIVO)',
                  'Segmento, cidade e UF',
                  'Vendedor e representante',
                ]"
                :key="item"
                cols="12"
                sm="6"
              >
                <v-card class="pa-4" color="primary" rounded="lg" variant="tonal">
                  <div class="d-flex align-center ga-3">
                    <v-icon>mdi-check-circle</v-icon>
                    <span class="font-weight-medium">{{ item }}</span>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-tabs-window-item>

        <v-tabs-window-item value="vendedores">
          <v-card-text class="pa-0">
            <v-data-table
              density="comfortable"
              :headers="[
                { title: 'Vendedor', key: 'nome' },
                { title: 'Clientes', key: 'clientesAtivos' },
                { title: 'Faturamento', key: 'faturamentoMes' },
                { title: 'Meta', key: 'metaMes' },
                { title: 'Eficiência', key: 'eficiencia' },
                { title: 'Conversão', key: 'conversao' },
              ]"
              item-value="id"
              :items="sellers"
              :loading="loading"
            >
              <template #item.faturamentoMes="{ item }">
                {{ formatCurrency(item.faturamentoMes, true) }}
              </template>

              <template #item.metaMes="{ item }">
                {{ formatCurrency(item.metaMes, true) }}
              </template>

              <template #item.eficiencia="{ item }">
                <v-chip
                  :color="item.eficiencia >= 80 ? 'success' : item.eficiencia >= 60 ? 'warning' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  {{ item.eficiencia }}
                </v-chip>
              </template>

              <template #item.conversao="{ item }">
                {{ formatPercent(item.conversao) }}
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>

        <v-tabs-window-item value="indicadores">
          <v-card-text class="pa-6">
            <v-row>
              <v-col
                v-for="kpi in statsCards"
                :key="kpi.label"
                cols="6"
                md="3"
              >
                <v-card class="text-center pa-4" rounded="lg" variant="outlined">
                  <v-icon class="mb-2" color="primary">{{ kpi.icon }}</v-icon>
                  <div class="text-h5 font-weight-bold">{{ kpi.value }}</div>
                  <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-tabs-window-item>

        <v-tabs-window-item value="base">
          <v-card-text class="pa-6">
            <v-alert class="mb-4" icon="mdi-api" type="success" variant="tonal">
              Conectada ao sistema da Ipanema via API. Dashboard + alertas + insights.
            </v-alert>

            <p class="text-body-2 mb-2">
              Endpoint Directus configurado em <code>VITE_DIRECTUS_URL</code>.
            </p>

            <p class="text-body-2 text-medium-emphasis mb-2">
              Collection principal: <code>linhas_comerciais</code> (espelho da
              planilha de clientes). Derivadas: <code>clientes</code> (agregado),
              <code>dashboard_kpis</code>, <code>insights</code>,
              <code>recomendacoes</code>, <code>alertas</code>.
            </p>

            <v-alert type="info" variant="tonal">
              A base já traz vendedor por cliente. O ranking de vendedores nesta
              tela ainda usa dados de exemplo até o cálculo real (já pronto no
              motor de análise) ser conectado aqui.
            </v-alert>
          </v-card-text>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>
  </div>
</template>

<style scoped>
.source-card {
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
.source-card:hover {
  border-color: rgb(var(--v-theme-primary)) !important;
  transform: translateY(-2px);
}
</style>