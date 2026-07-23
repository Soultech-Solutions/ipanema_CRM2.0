<script lang="ts" setup>
  import type { Seller } from '@/types/commercial'
  import { CTE_COLUMN_MAP } from '@/types/cte'
  import { computed, onMounted, ref } from 'vue'
  import { fetchSellers } from '@/api/directus'
  import { useCommercialStore } from '@/stores/commercial'
  import { useDashboardStore } from '@/stores/dashboard'
  import { formatCurrency, formatPercent } from '@/utils/format'

  const tab = ref('upload')
  const sellers = ref<Seller[]>([])
  const loading = ref(false)
  const uploadFiles = ref<File[]>([])
  const successMsg = ref('')
  const commercial = useCommercialStore()
  const dashboard = useDashboardStore()
  const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'http://localhost:8055'

  const excelColumns = Object.keys(CTE_COLUMN_MAP)

  const statsCards = computed(() => {
    const s = commercial.stats
    if (!s) {
      return [
        { label: 'CT-es na base', value: '—', icon: 'mdi-file-document' },
        { label: 'Clientes pagadores', value: '—', icon: 'mdi-account-group' },
        { label: 'CT-es em aberto', value: '—', icon: 'mdi-file-clock' },
        { label: 'Reentregas', value: '—', icon: 'mdi-truck-delivery' },
      ]
    }
    return [
      { label: 'CT-es na base', value: s.totalCtes.toLocaleString('pt-BR'), icon: 'mdi-file-document' },
      { label: 'Clientes pagadores', value: s.totalClientes.toLocaleString('pt-BR'), icon: 'mdi-account-group' },
      { label: 'CT-es em aberto', value: s.ctesAbertos.toLocaleString('pt-BR'), icon: 'mdi-file-clock' },
      { label: 'Reentregas', value: s.reentregas.toLocaleString('pt-BR'), icon: 'mdi-truck-delivery' },
    ]
  })

  const derivedMetrics = [
    { from: 'VALOR + DT. CADASTRO', to: 'Faturamento histórico / vs meta' },
    { from: 'TIPO CTE = DEVOLUÇÃO*', to: 'Taxa de devoluções' },
    { from: 'TIPO CTE = REENTREGA', to: 'Taxa de reentregas' },
    { from: 'NÚM. FATURA vazio', to: 'CT-es em aberto (giro)' },
    { from: 'VALOR / PESO KG', to: 'Yield comercial (R$/ton)' },
    { from: 'UF/MUN ORIGEM→DESTINO', to: 'Rotas e concentração regional' },
    { from: 'CLIENTE + DESTINATÁRIO', to: 'Carteira e destinatários' },
    { from: 'CLASSIFICAÇÃO / TABELA', to: 'Mix e oportunidades de repricing' },
  ]

  const dataSources = [
    {
      title: 'Upload de planilhas',
      icon: 'mdi-cloud-upload',
      desc: 'Base LOG FALA (CT-es / faturamento) no layout Raça.',
      action: 'upload',
    },
    {
      title: 'Carteiras de clientes',
      icon: 'mdi-account-group',
      desc: 'Agrega CLIENTE / GRUPO CLIENTE a partir dos CT-es.',
      action: 'clientes',
    },
    {
      title: 'Indicadores comerciais',
      icon: 'mdi-chart-bar',
      desc: 'Yield, devoluções, reentregas e CT-es abertos.',
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
    const file = uploadFiles.value?.[0]
    if (!file) return
    successMsg.value = ''
    try {
      await commercial.importFromFile(file)
      await dashboard.load()
      const syncNote = commercial.syncToDirectus
        ? ' · sincronizado com Directus'
        : ''
      successMsg.value = `Importação concluída: ${commercial.stats?.totalCtes.toLocaleString('pt-BR')} CT-es · ${commercial.stats?.totalClientes} clientes${syncNote}.`
      uploadFiles.value = []
    } catch {
      // error already in commercial.error
    }
  }

  async function reloadSeed () {
    successMsg.value = ''
    commercial.clearCache()
    await commercial.importFromUrl('/data/base-fat-raca.xlsx', 'base-fat-raca.xlsx')
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
              · {{ commercial.stats.totalCtes.toLocaleString('pt-BR') }} CT-es
              · {{ commercial.stats.totalClientes }} clientes
              · faturamento {{ formatCurrency(commercial.stats.totalValor, true) }}
            </v-alert>

            <v-file-input
              v-model="uploadFiles"
              accept=".xlsx,.xls,.csv"
              chips
              label="Selecione a base LOG FALA (Excel)"
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
                :disabled="!uploadFiles?.length || commercial.syncing"
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
              Layout: 1 linha = 1 CT-e. O import recalcula Health Score, CII,
              alertas, recomendações e a carteira de clientes
              <template v-if="commercial.syncToDirectus">
                e grava em Directus (ctes, clientes, KPIs)
              </template>.
            </v-alert>

            <div class="text-subtitle-2 font-weight-bold mt-6 mb-2">
              Colunas reconhecidas ({{ excelColumns.length }})
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
              Clientes são agregados de <code>CLIENTE</code> /
              <code>GRUPO CLIENTE</code> na base de CT-es. Carteira em
              <router-link to="/clientes">Clientes</router-link>.
            </p>

            <v-row>
              <v-col
                v-for="item in [
                  'Faturamento (VALOR por período)',
                  'CT-es e tipos (NORMAL, DEVOLUÇÃO, REENTREGA)',
                  'Rotas (origem → destino / itinerário)',
                  'Yield, fatura aberta e destinatários',
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
              Conectada ao sistema da Raça via API. Dashboard + alertas + insights.
            </v-alert>

            <p class="text-body-2 mb-2">
              Endpoint Directus configurado em <code>VITE_DIRECTUS_URL</code>.
            </p>

            <p class="text-body-2 text-medium-emphasis mb-2">
              Collection principal: <code>ctes</code> (espelho da LOG FALA).
              Derivadas: <code>clientes</code> (agregado),
              <code>dashboard_kpis</code>, <code>insights</code>,
              <code>recomendacoes</code>, <code>alertas</code>.
            </p>

            <v-alert type="warning" variant="tonal">
              A base atual <strong>não traz vendedor</strong>, visitas, propostas
              nem metas. Eficiência comercial e cadastro de vendedores exigem
              outra fonte (CRM / ERP / planilha complementar).
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
