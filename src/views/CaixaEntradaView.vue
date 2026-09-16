<script lang="ts" setup>
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()

  interface AiExtract {
    cliente: string
    itens: number
    prazo: string
    canal: string
  }

  interface MailItem {
    id: string
    remetente: string
    hora: string
    assunto: string
    tag: string
    tagTone: 'error' | 'info'
    corpo: string[]
    de: string
    anexo?: string
    extract: AiExtract
  }

  const tabs = [
    { key: 'todos', label: 'Todos 24' },
    { key: 'nao-lidos', label: 'Não lidos 8' },
    { key: 'com-anexo', label: 'Com anexo 11' },
    { key: 'precisa-cotar', label: 'Precisa cotar 6', tone: 'warning' as const },
  ]
  const activeTab = ref('todos')

  const mails: MailItem[] = [
    {
      id: 'vale',
      remetente: 'VALE',
      hora: '10:42',
      assunto: 'Solicitação cotação rolamentos',
      tag: 'Novo pedido',
      tagTone: 'error',
      de: 'compras@vale.com',
      anexo: 'PDF RFQ_Vale_0926.pdf',
      corpo: [
        'Boa tarde, precisamos de cotação para os itens abaixo para parada programada da planta.',
        '• 10x FAG 22320-E1-K',
        '• 8x INA NK45/20',
        '• Entrega necessária: 25/09',
        'Favor informar prazo, impostos e condição de pagamento.',
      ],
      extract: { cliente: 'Vale', itens: 2, prazo: '25/09/2026', canal: 'Portal do cliente' },
    },
    {
      id: 'klabin',
      remetente: 'Klabin',
      hora: '09:18',
      assunto: 'RFQ – parada programada',
      tag: 'Anexo identificado',
      tagTone: 'error',
      de: 'suprimentos@klabin.com',
      anexo: 'PDF RFQ_Klabin_parada.pdf',
      corpo: [
        'Segue solicitação de cotação em anexo para a parada programada de setembro.',
        'Precisamos de retorno com prazo e condições até o fim da semana.',
      ],
      extract: { cliente: 'Klabin', itens: 5, prazo: '30/09/2026', canal: 'E-mail' },
    },
    {
      id: 'suzano',
      remetente: 'Suzano',
      hora: 'Ontem',
      assunto: 'Necessidade urgente FAG',
      tag: 'E-mail',
      tagTone: 'error',
      de: 'compras@suzano.com',
      corpo: [
        'Precisamos com urgência de rolamentos FAG para reposição de linha.',
        'Podem cotar ainda hoje?',
      ],
      extract: { cliente: 'Suzano', itens: 1, prazo: 'Urgente', canal: 'E-mail' },
    },
    {
      id: 'gerdau',
      remetente: 'Gerdau',
      hora: 'Ontem',
      assunto: 'Re: proposta #9814',
      tag: 'E-mail',
      tagTone: 'error',
      de: 'engenharia@gerdau.com',
      corpo: [
        'Recebemos a proposta #9814, estamos avaliando internamente.',
        'Retornamos em breve.',
      ],
      extract: { cliente: 'Gerdau', itens: 0, prazo: '—', canal: 'E-mail' },
    },
    {
      id: 'usl',
      remetente: 'Usina Santa Luzia',
      hora: '12 set',
      assunto: 'Cotação rolamento agulha',
      tag: 'E-mail',
      tagTone: 'error',
      de: 'compras@usinasantaluzia.com',
      corpo: [
        'Solicitamos cotação de rolamento agulha, modelo conforme desenho anexo.',
      ],
      extract: { cliente: 'Usina Santa Luzia', itens: 1, prazo: 'A confirmar', canal: 'Portal do cliente' },
    },
  ]

  const selectedId = ref(mails[0].id)
  const selected = computed(() => mails.find(m => m.id === selectedId.value) ?? mails[0])
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
          Cada novo pedido recebido por e-mail vira uma oportunidade estruturada.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-btn color="secondary" rounded="lg" variant="outlined">Exportar</v-btn>
        <v-btn color="primary" rounded="lg" variant="flat" @click="router.push('/pipeline')">
          + Nova oportunidade
        </v-btn>
      </div>
    </div>

    <v-alert class="mb-4" density="compact" type="info" variant="tonal">
      Tela de exemplo — ainda não conectada à caixa de e-mail real nem à IA de extração. Layout segue o Figma aprovado.
    </v-alert>

    <!-- Tabs -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        v-for="tab in tabs"
        :key="tab.key"
        :color="activeTab === tab.key ? (tab.tone || 'error') : undefined"
        rounded="pill"
        :variant="activeTab === tab.key ? 'tonal' : 'flat'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </v-chip>
    </div>

    <!-- 3 colunas -->
    <div class="d-flex flex-wrap align-start ga-4">
      <!-- Lista de e-mails -->
      <v-card class="inbox-col" rounded="xl" variant="outlined">
        <template v-for="(mail, i) in mails" :key="mail.id">
          <div
            class="pa-4 mail-row cursor-pointer"
            :class="{ 'mail-row--active': selectedId === mail.id }"
            @click="selectedId = mail.id"
          >
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-bold">{{ mail.remetente }}</span>
              <span class="text-caption text-medium-emphasis">{{ mail.hora }}</span>
            </div>
            <div class="text-body-2 mb-2">{{ mail.assunto }}</div>
            <v-chip :color="mail.tagTone" rounded="pill" size="small" variant="tonal">
              {{ mail.tag }}
            </v-chip>
          </div>
          <v-divider v-if="i < mails.length - 1" />
        </template>
      </v-card>

      <!-- Detalhe do e-mail -->
      <v-card class="detail-col pa-5" rounded="xl" variant="outlined">
        <v-chip class="mb-3" :color="selected.tagTone" rounded="pill" size="small" variant="tonal">
          {{ selected.tag }}
        </v-chip>
        <div class="text-h6 font-weight-bold mb-2">{{ selected.assunto }}</div>
        <div class="text-caption text-medium-emphasis mb-3">
          De: {{ selected.de }} • Para: leo@ipanemarolamentos.com.br
        </div>
        <v-divider class="mb-3" />
        <p v-for="(linha, i) in selected.corpo" :key="i" class="text-body-2 mb-2">
          {{ linha }}
        </p>
        <v-chip v-if="selected.anexo" class="mt-2" color="info" rounded="pill" size="small" variant="tonal">
          {{ selected.anexo }}
        </v-chip>
      </v-card>

      <!-- IA extract -->
      <v-card class="extract-col pa-5" rounded="xl" variant="outlined">
        <div class="text-subtitle-1 font-weight-bold mb-3">IA interpretou o pedido</div>

        <div class="mb-3">
          <div class="text-caption text-medium-emphasis">Cliente</div>
          <div class="text-body-1 font-weight-medium">{{ selected.extract.cliente }}</div>
        </div>
        <div class="mb-3">
          <div class="text-caption text-medium-emphasis">Itens identificados</div>
          <div class="text-body-1 font-weight-medium">{{ selected.extract.itens }}</div>
        </div>
        <div class="mb-3">
          <div class="text-caption text-medium-emphasis">Prazo solicitado</div>
          <div class="text-body-1 font-weight-medium">{{ selected.extract.prazo }}</div>
        </div>
        <div class="mb-4">
          <div class="text-caption text-medium-emphasis">Canal de resposta</div>
          <div class="text-body-1 font-weight-medium">{{ selected.extract.canal }}</div>
        </div>

        <v-divider class="mb-4" />

        <v-btn block class="mb-2" color="primary" rounded="lg" @click="router.push('/cotacao')">
          Criar cotação
        </v-btn>
        <v-btn block color="secondary" rounded="lg" variant="outlined">
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
}
.detail-col {
  flex: 1 1 420px;
  max-width: 480px;
}
.extract-col {
  flex: 1 1 280px;
  max-width: 306px;
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