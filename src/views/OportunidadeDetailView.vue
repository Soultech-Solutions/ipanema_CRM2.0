<script lang="ts" setup>
  import type { MatchStatus, OpportunityItem, OpportunityStage, Product } from '@/types/opportunity'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { assetUrl } from '@/api/opportunities'
  import ProductPicker from '@/components/opportunity/ProductPicker.vue'
  import { useOpportunitiesStore } from '@/stores/opportunities'
  import { OPPORTUNITY_STAGES } from '@/types/opportunity'
  import { formatCurrency } from '@/utils/format'

  const route = useRoute()
  const router = useRouter()
  const store = useOpportunitiesStore()
  const reprocessing = ref(false)

  const id = computed(() => route.params.id as string)
  const opp = computed(() => store.current)
  const email = computed(() => opp.value?.email ?? null)

  const matchInfo: Record<MatchStatus, { label: string, tone: 'success' | 'warning' | 'error' }> = {
    encontrado: { label: 'Encontrado', tone: 'success' },
    ambiguo: { label: 'Revisar', tone: 'warning' },
    nao_encontrado: { label: 'Não encontrado', tone: 'error' },
  }

  const pendentes = computed(() => (opp.value?.itens ?? []).filter(i => i.status_match !== 'encontrado').length)

  function money (value: number | null | undefined) {
    return value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function formatDateTime (iso: string | null | undefined) {
    return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
  }

  function formatPrazo (value: string | null) {
    if (!value) return '—'
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : value
  }

  async function onStage (etapa: OpportunityStage) {
    if (opp.value) await store.moveStage(opp.value.id, etapa)
  }

  function onProduct (item: OpportunityItem, produto: Product | null) {
    void store.saveItem(item, { produto })
  }

  function onQuantity (item: OpportunityItem, value: string) {
    const n = Number(String(value).replace(',', '.'))
    if (Number.isFinite(n) && n > 0 && n !== item.quantidade) void store.saveItem(item, { quantidade: n })
  }

  function onPrice (item: OpportunityItem, value: string) {
    const trimmed = String(value).trim()
    const n = trimmed === '' ? null : Number(trimmed.replace(/\./g, '').replace(',', '.'))
    if ((n === null || (Number.isFinite(n) && n >= 0)) && n !== item.preco_unitario) void store.saveItem(item, { preco_unitario: n })
  }

  function useAlternative (item: OpportunityItem, alt: { id: string, codigo: string, descricao: string | null, preco: number | null }) {
    void store.saveItem(item, {
      produto: {
        id: alt.id,
        codigo: alt.codigo,
        descricao: alt.descricao,
        preco: alt.preco,
        marca: null,
        unidade: null,
        icms: null,
        pis_cofins: null,
        estoque: null,
        fonte: null,
      },
    })
  }

  async function reprocess () {
    if (!email.value) return
    reprocessing.value = true
    try {
      await store.reprocess(email.value.id)
    } finally {
      reprocessing.value = false
    }
  }

  onMounted(() => store.loadById(id.value))
  watch(id, value => store.loadById(value))
</script>

<template>
  <div>
    <v-btn class="mb-4" prepend-icon="mdi-arrow-left" variant="text" @click="router.push('/pipeline')">
      Pipeline
    </v-btn>

    <v-alert
      v-if="store.error"
      class="mb-4"
      closable
      density="compact"
      type="error"
      variant="tonal"
    >
      {{ store.error }}
    </v-alert>

    <v-progress-linear v-if="store.loading && !opp" color="primary" indeterminate />

    <template v-if="opp">
      <!-- Header -->
      <div class="d-flex flex-wrap align-start justify-space-between ga-3 mb-4">
        <div class="flex-1-1">
          <h1 class="text-h5 font-weight-bold mb-1 brand-title">{{ opp.titulo }}</h1>

          <div class="text-body-2 text-medium-emphasis">
            <template v-if="opp.cliente">
              <router-link :to="`/clientes/${opp.cliente.codigo || opp.cliente.id}`">{{ opp.cliente.nome }}</router-link>
            </template>

            <template v-else>{{ opp.cliente_nome || 'Cliente não identificado' }}</template>

            <span v-if="opp.contato_nome || opp.contato_email">
              • {{ opp.contato_nome }} {{ opp.contato_email ? `<${opp.contato_email}>` : '' }}
            </span>
          </div>
        </div>

        <div class="d-flex flex-wrap align-center ga-2">
          <v-select
            density="compact"
            hide-details
            item-title="titulo"
            item-value="id"
            :items="OPPORTUNITY_STAGES"
            label="Etapa"
            :model-value="opp.etapa"
            style="min-width: 210px"
            variant="outlined"
            @update:model-value="onStage"
          />

          <v-btn
            v-if="email"
            color="secondary"
            :loading="reprocessing"
            prepend-icon="mdi-robot-outline"
            rounded="lg"
            variant="outlined"
            @click="reprocess"
          >
            Reprocessar com IA
          </v-btn>
        </div>
      </div>

      <!-- Resumo -->
      <v-row class="mb-2">
        <v-col cols="6" md="3">
          <v-card class="pa-4" rounded="xl" variant="outlined">
            <div class="text-caption text-medium-emphasis">Valor estimado</div>
            <div class="text-h6 font-weight-bold">{{ formatCurrency(opp.valor_estimado ?? 0) }}</div>
          </v-card>
        </v-col>

        <v-col cols="6" md="3">
          <v-card class="pa-4" rounded="xl" variant="outlined">
            <div class="text-caption text-medium-emphasis">Itens</div>

            <div class="text-h6 font-weight-bold">
              {{ opp.itens.length }}
              <v-chip
                v-if="pendentes"
                class="ml-1"
                color="warning"
                size="small"
                variant="tonal"
              >
                {{ pendentes }} a revisar
              </v-chip>
            </div>
          </v-card>
        </v-col>

        <v-col cols="6" md="3">
          <v-card class="pa-4" rounded="xl" variant="outlined">
            <div class="text-caption text-medium-emphasis">Prazo solicitado</div>
            <div class="text-h6 font-weight-bold">{{ formatPrazo(opp.prazo_entrega) }}</div>
          </v-card>
        </v-col>

        <v-col cols="6" md="3">
          <v-card class="pa-4" rounded="xl" variant="outlined">
            <div class="text-caption text-medium-emphasis">Confiança da IA</div>

            <div class="text-h6 font-weight-bold">
              {{ opp.confianca == null ? '—' : `${Math.round(opp.confianca * 100)}%` }}
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <!-- Itens -->
        <v-col cols="12" lg="8">
          <v-card class="pa-4" rounded="xl" variant="outlined">
            <div class="text-subtitle-1 font-weight-bold mb-1">Itens do pedido</div>

            <div class="text-caption text-medium-emphasis mb-4">
              Confira o produto casado pela IA. Ao trocar o produto, o preço vem do catálogo.
            </div>

            <v-table density="comfortable">
              <thead>
                <tr>
                  <th style="min-width: 180px">Pedido do cliente</th>
                  <th style="min-width: 260px">Produto do catálogo</th>
                  <th style="min-width: 96px">Qtd</th>
                  <th style="min-width: 150px">Preço unit.</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="item in opp.itens" :key="item.id">
                  <td class="py-2">
                    <div class="text-body-2">{{ item.texto_original }}</div>

                    <v-chip class="mt-1" :color="matchInfo[item.status_match].tone" size="x-small" variant="tonal">
                      {{ matchInfo[item.status_match].label }}
                      <template v-if="item.confianca != null && item.status_match !== 'nao_encontrado'">
                        · {{ Math.round(item.confianca * 100) }}%
                      </template>
                    </v-chip>
                  </td>

                  <td class="py-2">
                    <ProductPicker :product="item.produto" @select="onProduct(item, $event)" />

                    <div v-if="item.alternativas?.length" class="d-flex flex-wrap ga-1 mt-1">
                      <span class="text-caption text-medium-emphasis">Alternativas:</span>

                      <v-chip
                        v-for="alt in item.alternativas"
                        :key="alt.id"
                        size="x-small"
                        variant="outlined"
                        @click="useAlternative(item, alt)"
                      >
                        {{ alt.codigo }}
                      </v-chip>
                    </div>
                  </td>

                  <td class="py-2">
                    <v-text-field
                      density="compact"
                      hide-details
                      :model-value="item.quantidade"
                      variant="outlined"
                      @change="onQuantity(item, ($event.target as HTMLInputElement).value)"
                    />
                  </td>

                  <td class="py-2">
                    <v-text-field
                      density="compact"
                      hide-details
                      :model-value="item.preco_unitario ?? ''"
                      prefix="R$"
                      variant="outlined"
                      @change="onPrice(item, ($event.target as HTMLInputElement).value)"
                    />
                  </td>

                  <td class="text-right font-weight-medium">{{ money(item.subtotal) }}</td>
                </tr>

                <tr v-if="opp.itens.length === 0">
                  <td class="text-center text-medium-emphasis py-6" colspan="5">Nenhum item identificado</td>
                </tr>
              </tbody>

              <tfoot v-if="opp.itens.length > 0">
                <tr>
                  <td class="text-right font-weight-bold" colspan="4">Total</td>
                  <td class="text-right font-weight-bold">{{ money(opp.valor_estimado) }}</td>
                </tr>
              </tfoot>
            </v-table>

            <v-alert
              v-if="opp.observacoes"
              class="mt-4"
              density="compact"
              icon="mdi-note-text-outline"
              variant="tonal"
            >
              {{ opp.observacoes }}
            </v-alert>
          </v-card>
        </v-col>

        <!-- Email de origem -->
        <v-col cols="12" lg="4">
          <v-card v-if="email" class="pa-4" rounded="xl" variant="outlined">
            <div class="text-subtitle-1 font-weight-bold mb-1">E-mail de origem</div>

            <div class="text-caption text-medium-emphasis mb-3">
              {{ email.remetente_nome ? `${email.remetente_nome} <${email.remetente}>` : email.remetente }}
              • {{ formatDateTime(email.recebido_em) }}
            </div>

            <div class="text-body-2 font-weight-bold mb-2">{{ email.assunto }}</div>
            <v-divider class="mb-3" />
            <div class="text-body-2 email-body">{{ email.corpo_texto }}</div>

            <div v-if="email.anexos?.length" class="d-flex flex-wrap ga-2 mt-4">
              <v-chip
                v-for="anexo in email.anexos"
                :key="anexo.nome"
                color="info"
                :href="anexo.arquivo ? assetUrl(anexo.arquivo) : undefined"
                prepend-icon="mdi-paperclip"
                rounded="pill"
                size="small"
                target="_blank"
                variant="tonal"
              >
                {{ anexo.nome }}
              </v-chip>
            </div>

            <v-alert
              v-if="email.extracao?.motivo"
              class="mt-4"
              density="compact"
              icon="mdi-robot-outline"
              variant="tonal"
            >
              {{ email.extracao.motivo }}
            </v-alert>
          </v-card>

          <v-card v-else class="pa-4" rounded="xl" variant="outlined">
            <div class="text-body-2 text-medium-emphasis">Oportunidade criada manualmente.</div>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </div>
</template>

<style scoped>
.email-body {
  white-space: pre-wrap;
  max-height: 420px;
  overflow-y: auto;
}
</style>
