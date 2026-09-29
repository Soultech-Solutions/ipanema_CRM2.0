<script lang="ts" setup>
  import type { InboxEmail, InboxEmailStatus } from '@/types/opportunity'
  import { computed, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { assetUrl } from '@/api/opportunities'
  import { useOpportunitiesStore } from '@/stores/opportunities'

  const router = useRouter()
  const store = useOpportunitiesStore()

  type Tone = 'error' | 'warning' | 'success' | 'info' | undefined

  const statusInfo: Record<InboxEmailStatus, { label: string, tone: Tone }> = {
    novo: { label: 'Na fila', tone: 'info' },
    processando: { label: 'Processando', tone: 'info' },
    processado: { label: 'Pedido de orçamento', tone: 'success' },
    ignorado: { label: 'Não comercial', tone: undefined },
    erro: { label: 'Erro na leitura', tone: 'error' },
  }

  const activeTab = ref<'todos' | 'processado' | 'ignorado' | 'erro'>('todos')
  const reprocessingId = ref<string | null>(null)

  const tabs = computed(() => {
    const count = (s: InboxEmailStatus) => store.inbox.filter(m => m.status === s).length
    return [
      { key: 'todos' as const, label: `Todos ${store.inbox.length}`, tone: 'primary' as Tone },
      { key: 'processado' as const, label: `Pedidos ${count('processado')}`, tone: 'success' as Tone },
      { key: 'ignorado' as const, label: `Não comerciais ${count('ignorado')}`, tone: undefined },
      { key: 'erro' as const, label: `Com erro ${count('erro')}`, tone: 'error' as Tone },
    ]
  })

  const mails = computed(() => activeTab.value === 'todos'
    ? store.inbox
    : store.inbox.filter(m => m.status === activeTab.value))

  const selectedId = ref<string | null>(null)
  const selected = computed<InboxEmail | null>(() =>
    mails.value.find(m => m.id === selectedId.value) ?? mails.value[0] ?? null)

  watch(mails, list => {
    if (!list.some(m => m.id === selectedId.value)) selectedId.value = list[0]?.id ?? null
  })

  function hora (mail: InboxEmail) {
    const iso = mail.recebido_em || mail.created_at
    if (!iso) return ''
    const d = new Date(iso)
    const today = new Date()
    return d.toDateString() === today.toDateString()
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  function formatPrazo (value: string | null | undefined) {
    if (!value) return '—'
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : value
  }

  async function reprocess (mail: InboxEmail) {
    reprocessingId.value = mail.id
    try {
      await store.reprocess(mail.id)
    } finally {
      reprocessingId.value = null
    }
  }

  const syncMessage = computed(() => {
    const s = store.lastSync
    if (!s) return null
    if (s.skipped === 'locked') return 'Já existe uma leitura em andamento. Tente novamente em instantes.'
    if (s.skipped === 'not_configured') return null
    return `${s.lidos} lidos · ${s.processados} pedidos · ${s.ignorados} não comerciais${s.erros ? ` · ${s.erros} com erro` : ''}`
  })

  onMounted(() => store.loadInbox())
</script>

<template>
  <div>
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1 brand-title">
          Caixa de entrada comercial
        </h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          Cada pedido de orçamento recebido por e-mail vira uma oportunidade estruturada no Pipeline.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined" @click="router.push('/pipeline')">
          Pipeline
        </v-btn>

        <v-btn
          color="primary"
          :disabled="!store.enabled"
          :loading="store.syncing"
          prepend-icon="mdi-email-sync-outline"
          rounded="lg"
          variant="flat"
          @click="store.syncNow()"
        >
          Sincronizar agora
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="!store.enabled"
      class="mb-4"
      density="compact"
      type="info"
      variant="tonal"
    >
      A caixa de entrada lê os e-mails processados pelo Directus. Configure <code>VITE_USE_MOCK=false</code> e faça login.
    </v-alert>

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

    <v-alert
      v-if="syncMessage"
      class="mb-4"
      closable
      density="compact"
      type="success"
      variant="tonal"
    >
      {{ syncMessage }}
    </v-alert>

    <!-- Tabs -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        v-for="tab in tabs"
        :key="tab.key"
        :color="activeTab === tab.key ? (tab.tone || 'default') : undefined"
        rounded="pill"
        :variant="activeTab === tab.key ? 'tonal' : 'flat'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </v-chip>
    </div>

    <v-progress-linear v-if="store.inboxLoading" class="mb-4" color="primary" indeterminate />

    <v-card v-if="!store.inboxLoading && mails.length === 0" class="pa-8 text-center" rounded="xl" variant="outlined">
      <v-icon class="mb-2" color="medium-emphasis" icon="mdi-email-open-outline" size="40" />

      <div class="text-body-2 text-medium-emphasis">
        Nenhum e-mail por aqui. Use "Sincronizar agora" para ler a caixa comercial.
      </div>
    </v-card>

    <!-- 3 colunas -->
    <div v-if="selected" class="d-flex flex-wrap align-start ga-4">
      <!-- Lista de e-mails -->
      <v-card class="inbox-col" rounded="xl" variant="outlined">
        <template v-for="(mail, i) in mails" :key="mail.id">
          <div
            class="pa-4 mail-row cursor-pointer"
            :class="{ 'mail-row--active': selected.id === mail.id }"
            @click="selectedId = mail.id"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold text-truncate">{{ mail.remetente_nome || mail.remetente }}</span>
              <span class="text-caption text-medium-emphasis ml-2">{{ hora(mail) }}</span>
            </div>

            <div class="text-body-2 mb-2 text-truncate">{{ mail.assunto || '(sem assunto)' }}</div>

            <div class="d-flex ga-1">
              <v-chip :color="statusInfo[mail.status].tone" rounded="pill" size="small" variant="tonal">
                {{ statusInfo[mail.status].label }}
              </v-chip>

              <v-chip
                v-if="mail.anexos?.length"
                prepend-icon="mdi-paperclip"
                rounded="pill"
                size="small"
                variant="tonal"
              >
                {{ mail.anexos.length }}
              </v-chip>
            </div>
          </div>

          <v-divider v-if="i < mails.length - 1" />
        </template>
      </v-card>

      <!-- Detalhe do e-mail -->
      <v-card class="detail-col pa-5" rounded="xl" variant="outlined">
        <v-chip
          class="mb-3"
          :color="statusInfo[selected.status].tone"
          rounded="pill"
          size="small"
          variant="tonal"
        >
          {{ statusInfo[selected.status].label }}
        </v-chip>

        <div class="text-h6 font-weight-bold mb-2">{{ selected.assunto || '(sem assunto)' }}</div>

        <div class="text-caption text-medium-emphasis mb-3">
          De: {{ selected.remetente_nome ? `${selected.remetente_nome} <${selected.remetente}>` : selected.remetente }}
        </div>

        <v-divider class="mb-3" />
        <div class="text-body-2 email-body">{{ selected.corpo_texto }}</div>

        <div v-if="selected.anexos?.length" class="d-flex flex-wrap ga-2 mt-3">
          <v-chip
            v-for="anexo in selected.anexos"
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
      </v-card>

      <!-- IA extract -->
      <v-card class="extract-col pa-5" rounded="xl" variant="outlined">
        <div class="text-subtitle-1 font-weight-bold mb-3">IA interpretou o pedido</div>

        <v-alert
          v-if="selected.status === 'erro'"
          class="mb-3"
          density="compact"
          type="error"
          variant="tonal"
        >
          {{ selected.erro || 'Falha ao processar' }}
        </v-alert>

        <template v-if="selected.extracao">
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Cliente</div>
            <div class="text-body-1 font-weight-medium">{{ selected.extracao.cliente?.nome || '—' }}</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Itens identificados</div>
            <div class="text-body-1 font-weight-medium">{{ selected.extracao.itens?.length ?? 0 }}</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Prazo solicitado</div>
            <div class="text-body-1 font-weight-medium">{{ formatPrazo(selected.extracao.prazo_entrega) }}</div>
          </div>

          <div class="mb-4">
            <div class="text-caption text-medium-emphasis">Análise</div>
            <div class="text-body-2">{{ selected.extracao.motivo || '—' }}</div>
          </div>
        </template>

        <div v-else-if="selected.status !== 'erro'" class="text-body-2 text-medium-emphasis mb-4">
          Aguardando processamento.
        </div>

        <v-divider class="mb-4" />

        <v-btn
          v-if="selected.oportunidade"
          block
          class="mb-2"
          color="primary"
          rounded="lg"
          @click="router.push(`/oportunidades/${selected.oportunidade}`)"
        >
          Abrir oportunidade
        </v-btn>

        <v-btn
          block
          class="mb-2"
          color="secondary"
          :loading="reprocessingId === selected.id"
          prepend-icon="mdi-robot-outline"
          rounded="lg"
          variant="outlined"
          @click="reprocess(selected)"
        >
          Reprocessar com IA
        </v-btn>

        <v-btn
          v-if="selected.status !== 'ignorado'"
          block
          color="secondary"
          rounded="lg"
          variant="text"
          @click="store.setEmailStatus(selected.id, 'ignorado')"
        >
          Marcar como não comercial
        </v-btn>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
.inbox-col {
  flex: 1 1 320px;
  max-width: 340px;
  max-height: 72vh;
  overflow-y: auto;
}
.detail-col {
  flex: 1 1 420px;
  max-width: 480px;
}
.extract-col {
  flex: 1 1 280px;
  max-width: 306px;
}
.email-body {
  white-space: pre-wrap;
  max-height: 480px;
  overflow-y: auto;
}
.mail-row--active {
  background: rgba(var(--v-theme-primary), 0.06);
}
.cursor-pointer {
  cursor: pointer;
}
.cursor-pointer:hover {
  background: rgba(var(--v-theme-primary), 0.04);
}
</style>
