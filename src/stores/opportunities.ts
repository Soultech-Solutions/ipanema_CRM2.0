import type {
  InboxEmail,
  InboxEmailStatus,
  InboxSyncSummary,
  Opportunity,
  OpportunityItem,
  OpportunityListItem,
  OpportunityStage,
  Product,
} from '@/types/opportunity'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  apiErrorMessage,
  fetchInboxEmails,
  fetchIngestHealth,
  fetchOpportunities,
  fetchOpportunity,
  opportunitiesEnabled,
  reprocessEmail,
  syncInbox,
  updateInboxEmailStatus,
  updateOpportunity,
  updateOpportunityItem,
  updateOpportunityStage,
} from '@/api/opportunities'

const POLL_INTERVAL_MS = 60_000

const DEFAULT_MARKUP_PCT = 40

function round2 (value: number) {
  return Math.round(value * 100) / 100
}

/** Mesma regra do backend: preço base ou último custo + markup. */
function suggestedPrice (produto: Product, markupPct: number) {
  if (produto.preco != null) {
    return produto.preco
  }
  if (produto.custo == null || produto.custo <= 0) {
    return null
  }
  return round2(produto.custo * (1 + markupPct / 100))
}

export const useOpportunitiesStore = defineStore('opportunities', () => {
  const list = ref<OpportunityListItem[]>([])
  const current = ref<Opportunity | null>(null)
  const inbox = ref<InboxEmail[]>([])
  const loading = ref(false)
  const inboxLoading = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)
  const lastSync = ref<InboxSyncSummary | null>(null)
  const markupPct = ref(DEFAULT_MARKUP_PCT)
  let markupLoaded = false
  let pollTimer: ReturnType<typeof setInterval> | null = null

  const enabled = computed(() => opportunitiesEnabled)

  async function loadAll (silent = false) {
    if (!opportunitiesEnabled) {
      return
    }
    if (!silent) {
      loading.value = true
    }
    error.value = null
    try {
      list.value = await fetchOpportunities()
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Erro ao carregar oportunidades')
    } finally {
      loading.value = false
    }
  }

  function startPolling () {
    stopPolling()
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadAll(true)
      }
    }, POLL_INTERVAL_MS)
  }

  function stopPolling () {
    if (pollTimer) {
      clearInterval(pollTimer)
    }
    pollTimer = null
  }

  async function moveStage (id: string, etapa: OpportunityStage) {
    const item = list.value.find(o => o.id === id)
    const previous = item?.etapa
    if (item) {
      item.etapa = etapa
    }
    if (current.value?.id === id) {
      current.value.etapa = etapa
    }
    try {
      await updateOpportunityStage(id, etapa)
    } catch (error_) {
      if (item && previous) {
        item.etapa = previous
      }
      error.value = apiErrorMessage(error_, 'Erro ao mover oportunidade')
    }
  }

  async function loadMarkup () {
    if (markupLoaded) {
      return
    }
    const health = await fetchIngestHealth().catch(() => null)
    if (typeof health?.priceMarkupPct === 'number') {
      markupPct.value = health.priceMarkupPct
      markupLoaded = true
    }
  }

  async function loadById (id: string) {
    loading.value = true
    error.value = null
    current.value = null
    try {
      const [opportunity] = await Promise.all([fetchOpportunity(id), loadMarkup()])
      current.value = opportunity
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Oportunidade não encontrada')
    } finally {
      loading.value = false
    }
  }

  async function recalcTotal () {
    if (!current.value) {
      return
    }
    const total = round2(current.value.itens.reduce((sum, i) => sum + (i.subtotal ?? 0), 0))
    current.value.valor_estimado = total
    await updateOpportunity(current.value.id, { valor_estimado: total })
  }

  async function saveItem (item: OpportunityItem, patch: { quantidade?: number, preco_unitario?: number | null, produto?: Product | null }) {
    const quantidade = patch.quantidade ?? item.quantidade
    const produto = patch.produto === undefined ? item.produto : patch.produto
    let preco = patch.preco_unitario === undefined ? item.preco_unitario : patch.preco_unitario
    if (patch.produto !== undefined) {
      preco = produto ? suggestedPrice(produto, markupPct.value) : null
    }

    const subtotal = preco == null ? null : round2(preco * quantidade)
    const changes: Parameters<typeof updateOpportunityItem>[1] = { quantidade, preco_unitario: preco, subtotal }
    if (patch.produto !== undefined) {
      changes.produto = produto?.id ?? null
      changes.status_match = produto ? 'encontrado' : 'nao_encontrado'
      changes.confianca = produto ? 1 : 0
    }

    try {
      await updateOpportunityItem(item.id, changes)
      Object.assign(item, {
        quantidade,
        preco_unitario: preco,
        subtotal,
        produto,
        ...(changes.status_match ? { status_match: changes.status_match, confianca: changes.confianca } : {}),
      })
      await recalcTotal()
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Erro ao salvar item')
    }
  }

  async function loadInbox () {
    if (!opportunitiesEnabled) {
      return
    }
    inboxLoading.value = true
    error.value = null
    try {
      inbox.value = await fetchInboxEmails()
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Erro ao carregar emails')
    } finally {
      inboxLoading.value = false
    }
  }

  async function syncNow () {
    syncing.value = true
    error.value = null
    try {
      lastSync.value = await syncInbox()
      if (lastSync.value.error) {
        error.value = lastSync.value.error
      }
      await Promise.all([loadInbox(), loadAll(true)])
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Erro ao sincronizar a caixa de email')
    } finally {
      syncing.value = false
    }
  }

  async function reprocess (emailId: string) {
    error.value = null
    try {
      const result = await reprocessEmail(emailId)
      await loadInbox()
      if (current.value?.email?.id === emailId) {
        await loadById(current.value.id)
      }
      return result
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Erro ao reprocessar email')
      await loadInbox()
      return null
    }
  }

  async function setEmailStatus (emailId: string, status: InboxEmailStatus) {
    try {
      await updateInboxEmailStatus(emailId, status)
      const mail = inbox.value.find(m => m.id === emailId)
      if (mail) {
        mail.status = status
      }
    } catch (error_) {
      error.value = apiErrorMessage(error_, 'Erro ao atualizar email')
    }
  }

  return {
    list,
    current,
    inbox,
    loading,
    inboxLoading,
    syncing,
    error,
    lastSync,
    enabled,
    loadAll,
    startPolling,
    stopPolling,
    moveStage,
    loadById,
    saveItem,
    loadInbox,
    syncNow,
    reprocess,
    setEmailStatus,
  }
})
