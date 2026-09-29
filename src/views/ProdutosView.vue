<script lang="ts" setup>
  import type { IngestHealth } from '@/api/opportunities'
  import type { Product, ProductImportResult } from '@/types/opportunity'
  import { computed, onMounted, ref, watch } from 'vue'
  import {
    apiErrorMessage,
    countProducts,
    fetchIngestHealth,
    importProducts,
    opportunitiesEnabled,
    searchProducts,
  } from '@/api/opportunities'
  import { parseProductsFile } from '@/services/produtosParser'

  type Tone = 'success' | 'warning' | 'info' | 'error'

  const produtos = ref<Product[]>([])
  const total = ref(0)
  const busca = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fileInput = ref<HTMLInputElement | null>(null)
  const importing = ref(false)
  const progress = ref(0)
  const importResult = ref<ProductImportResult | null>(null)

  const health = ref<IngestHealth | null>(null)
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  const fieldLabels: Record<string, string> = {
    codigo: 'Código',
    codigo_erp: 'Id ERP',
    codigo_sap: 'Código SAP',
    descricao: 'Descrição',
    marca: 'Marca',
    unidade: 'Unidade',
    preco: 'Preço',
    custo: 'Último preço de compra',
    icms: 'ICMS',
    pis_cofins: 'PIS/COFINS',
    estoque: 'Estoque',
  }

  const showTaxes = computed(() => produtos.value.some(p => p.icms != null || p.pis_cofins != null))

  function money (value: number | null) {
    return value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function percent (value: number | null) {
    return value == null ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
  }

  async function load () {
    if (!opportunitiesEnabled) return
    loading.value = true
    error.value = null
    try {
      const [list, count] = await Promise.all([searchProducts(busca.value, 50), countProducts()])
      produtos.value = list
      total.value = count
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Erro ao carregar produtos')
    } finally {
      loading.value = false
    }
  }

  watch(busca, () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(load, 350)
  })

  async function onFile (event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return

    importing.value = true
    progress.value = 0
    importResult.value = null
    error.value = null
    try {
      const sheet = await parseProductsFile(file)
      if (sheet.rows.length === 0) throw new Error('Nenhuma linha encontrada na planilha')
      importResult.value = await importProducts(sheet.rows, file.name, (done, all) => {
        progress.value = Math.round((done / all) * 100)
      })
      await load()
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Erro ao importar planilha')
    } finally {
      importing.value = false
    }
  }

  const integracoes = computed<{ nome: string, status: string, tone: Tone }[]>(() => {
    const h = health.value
    let email: { status: string, tone: Tone } = { status: 'Não verificado', tone: 'info' }
    if (h) {
      const nome = h.provider === 'o365' ? 'Office 365' : 'IMAP'
      if (h.missingConfig.length > 0) email = { status: `${nome}: configurar`, tone: 'warning' }
      else if (h.lastRun?.error) email = { status: `${nome}: erro`, tone: 'error' }
      else email = { status: h.pollingEnabled ? `${nome}: automático` : `${nome}: manual`, tone: 'success' }
    }
    return [
      { nome: 'Caixa de e-mail', ...email },
      { nome: 'IA de extração', status: h && h.missingConfig.includes('ANTHROPIC_API_KEY') ? 'Sem chave' : 'Claude', tone: h && h.missingConfig.includes('ANTHROPIC_API_KEY') ? 'warning' : 'success' },
      { nome: 'ERP', status: 'Futuro', tone: 'info' },
      { nome: 'Portal Vale', status: 'Conceito assistido', tone: 'info' },
    ]
  })

  onMounted(async () => {
    await load()
    if (opportunitiesEnabled) {
      health.value = await fetchIngestHealth().catch(() => null)
    }
  })
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Produtos, preços e integrações
        </h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          Catálogo usado pela IA para casar os itens pedidos por e-mail; ERP oficial na evolução do projeto.
        </p>
      </div>
    </div>

    <v-alert
      v-if="!opportunitiesEnabled"
      class="mb-4"
      density="compact"
      type="info"
      variant="tonal"
    >
      O catálogo fica no Directus. Configure <code>VITE_USE_MOCK=false</code> e faça login para importar e consultar produtos.
    </v-alert>

    <v-alert
      v-if="error"
      class="mb-4"
      closable
      density="compact"
      type="error"
      variant="tonal"
    >
      {{ error }}
    </v-alert>

    <!-- POC atual + Evolução -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card class="h-100 pa-4" color="success" rounded="xl" variant="tonal">
          <v-chip
            class="mb-3"
            color="success"
            rounded="pill"
            size="small"
            variant="flat"
          >
            POC atual
          </v-chip>

          <div class="text-subtitle-1 font-weight-bold mb-2">Base importada de produtos</div>

          <div class="text-body-2 mb-4">
            Importe a planilha exportada do ERP (.xlsx ou .csv). Produtos são atualizados pelo código; colunas extras ficam guardadas.
          </div>

          <input
            ref="fileInput"
            accept=".xlsx,.xls,.csv"
            class="d-none"
            type="file"
            @change="onFile"
          >

          <v-btn
            color="success"
            :disabled="!opportunitiesEnabled"
            :loading="importing"
            prepend-icon="mdi-file-upload-outline"
            rounded="lg"
            @click="fileInput?.click()"
          >
            Importar base de produtos
          </v-btn>

          <v-progress-linear
            v-if="importing"
            class="mt-3"
            color="success"
            :model-value="progress"
            rounded
          />

          <div v-if="importResult" class="text-body-2 mt-3">
            <strong>{{ importResult.criados }}</strong> criados · <strong>{{ importResult.atualizados }}</strong> atualizados
            <template v-if="importResult.ignorados"> · {{ importResult.ignorados }} linhas sem código</template>

            <div class="text-caption mt-1">
              Colunas reconhecidas:
              {{ Object.entries(importResult.mapeamento).map(([campo, col]) => `${fieldLabels[campo] ?? campo} ← "${col}"`).join(', ') }}
            </div>

            <div v-if="importResult.colunasExtras.length > 0" class="text-caption">
              Guardadas como atributos: {{ importResult.colunasExtras.join(', ') }}
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="h-100 pa-4" color="info" rounded="xl" variant="tonal">
          <v-chip
            class="mb-3"
            color="info"
            rounded="pill"
            size="small"
            variant="flat"
          >
            Evolução
          </v-chip>

          <div class="text-subtitle-1 font-weight-bold mb-2">Integração direta com ERP</div>

          <div class="text-body-2 mb-4">
            Depois da validação, preços, impostos, disponibilidade e demais regras poderão ser sincronizados via integração oficial.
          </div>

          <v-btn color="info" disabled rounded="lg" variant="outlined">Configurar integração</v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Catálogo comercial -->
    <v-card class="mb-4 pa-4" rounded="xl" variant="outlined">
      <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
        <div>
          <div class="text-subtitle-1 font-weight-bold">Catálogo comercial</div>

          <div class="text-caption text-medium-emphasis">
            {{ total.toLocaleString('pt-BR') }} produtos cadastrados
          </div>
        </div>

        <v-text-field
          v-model="busca"
          clearable
          density="compact"
          hide-details
          placeholder="Buscar código, descrição ou marca"
          prepend-inner-icon="mdi-magnify"
          style="max-width: 360px"
          variant="outlined"
        />
      </div>

      <v-progress-linear v-if="loading" class="mb-2" color="primary" indeterminate />

      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Código</th>
            <th>SAP</th>
            <th>Descrição</th>
            <th>Marca</th>
            <th>Preço base</th>
            <th>Últ. compra</th>

            <template v-if="showTaxes">
              <th>ICMS</th>
              <th>PIS/COFINS</th>
            </template>

            <th>Estoque</th>
            <th>Fonte</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="p in produtos" :key="p.id">
            <td class="font-weight-medium">{{ p.codigo }}</td>
            <td>{{ p.codigo_sap || '—' }}</td>
            <td>{{ p.descricao || '—' }}</td>
            <td>{{ p.marca || '—' }}</td>
            <td>{{ money(p.preco) }}</td>
            <td>{{ money(p.custo ?? null) }}</td>

            <template v-if="showTaxes">
              <td>{{ percent(p.icms) }}</td>
              <td>{{ percent(p.pis_cofins) }}</td>
            </template>

            <td>{{ p.estoque ?? '—' }}</td>
            <td class="text-caption">{{ p.fonte || '—' }}</td>
          </tr>

          <tr v-if="!loading && produtos.length === 0">
            <td class="text-center text-medium-emphasis py-6" :colspan="showTaxes ? 10 : 8">
              {{ busca ? 'Nenhum produto encontrado' : 'Nenhum produto importado ainda' }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Integrações -->
    <v-card class="pa-4" rounded="xl" variant="outlined">
      <div class="text-subtitle-1 font-weight-bold mb-1">Integrações</div>
      <div class="text-caption text-medium-emphasis mb-4">Status do ecossistema</div>

      <v-row>
        <v-col v-for="i in integracoes" :key="i.nome" cols="6" md="3">
          <v-card class="pa-3" rounded="lg" variant="outlined">
            <div class="text-body-2 font-weight-medium mb-2">{{ i.nome }}</div>

            <v-chip :color="i.tone" rounded="pill" size="small" variant="tonal">
              {{ i.status }}
            </v-chip>
          </v-card>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>
