<script lang="ts" setup>
  import { nextTick, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAnalystStore } from '@/stores/analyst'

  const store = useAnalystStore()
  const router = useRouter()
  const input = ref('')
  const listEl = ref<HTMLElement | null>(null)
  const endpointMode = import.meta.env.VITE_USE_MOCK === 'false' ? 'Directus' : 'Modo local'

  async function scrollBottom () {
    await nextTick()
    if (listEl.value) {
      listEl.value.scrollTop = listEl.value.scrollHeight
    }
  }

  watch(() => store.messages.length, () => {
    void scrollBottom()
  })

  onMounted(() => {
    void scrollBottom()
  })

  async function submit () {
    const q = input.value
    input.value = ''
    await store.send(q)
    await scrollBottom()
  }

  async function useSuggestion (text: string) {
    input.value = ''
    await store.send(text)
    await scrollBottom()
  }

  function goAction (route?: string) {
    if (route) router.push(route)
  }

  /** Renderiza markdown leve (**bold** e quebras de linha) */
  function formatContent (text: string): string {
    const escaped = text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
    return escaped
      .replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replaceAll(/_(.+?)_/g, '<em>$1</em>')
      .replaceAll('\n', '<br>')
  }
</script>

<template>
  <div class="analyst-page">
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <div>
        <h1 class="text-h5 font-weight-bold mb-1 brand-title">
          Analista Comercial
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Pergunte em linguagem natural — a IA consulta a base e responde com dados.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-chip
          color="secondary"
          size="small"
          variant="tonal"
        >
          {{ endpointMode }}
        </v-chip>
        <v-btn
          prepend-icon="mdi-refresh"
          size="small"
          variant="tonal"
          @click="store.clear()"
        >
          Nova conversa
        </v-btn>
      </div>
    </div>

    <v-card class="analyst-shell" rounded="lg" variant="outlined">
      <div class="analyst-banner px-4 py-3">
        <div class="d-flex align-center ga-3">
          <v-avatar color="primary" size="40">
            <v-icon color="white">mdi-robot-outline</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-2 font-weight-bold text-white">
              Raça · Analista virtual
            </div>
            <div class="text-caption" style="color: rgba(255,255,255,0.65)">
              Endpoint futuro: <code style="color: #ff8a80">POST /analista-comercial/ask</code>
            </div>
          </div>
        </div>
      </div>

      <div ref="listEl" class="analyst-messages pa-4">
        <div
          v-for="msg in store.messages"
          :key="msg.id"
          class="msg"
          :class="`msg--${msg.role}`"
        >
          <div
            class="msg__bubble"
            :class="{
              'msg__bubble--pending': msg.pending,
              'msg__bubble--error': msg.error,
            }"
          >
            <div
              class="msg__content"
              v-html="formatContent(msg.content)"
            />

            <div
              v-if="msg.sources?.length"
              class="msg__sources mt-3"
            >
              <div class="text-caption text-medium-emphasis mb-1">Fontes</div>
              <div class="d-flex flex-wrap ga-1">
                <v-chip
                  v-for="(src, i) in msg.sources"
                  :key="`${msg.id}-src-${i}`"
                  size="x-small"
                  variant="outlined"
                >
                  {{ src.label }}
                </v-chip>
              </div>
            </div>

            <div
              v-if="msg.suggestedActions?.length"
              class="d-flex flex-wrap ga-2 mt-3"
            >
              <v-btn
                v-for="(action, i) in msg.suggestedActions"
                :key="`${msg.id}-act-${i}`"
                color="primary"
                size="small"
                variant="tonal"
                @click="goAction(action.route)"
              >
                {{ action.label }}
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <v-divider />

      <div class="pa-3 pa-md-4">
        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-chip
            v-for="s in store.suggestions"
            :key="s"
            class="suggestion-chip"
            size="small"
            variant="outlined"
            @click="useSuggestion(s)"
          >
            {{ s }}
          </v-chip>
        </div>

        <v-textarea
          v-model="input"
          auto-grow
          class="analyst-input"
          hide-details
          :disabled="!store.canSend"
          label="Faça uma pergunta comercial…"
          max-rows="4"
          placeholder="Ex.: Quais clientes têm maior risco de churn?"
          rows="1"
          variant="outlined"
          @keydown.enter.exact.prevent="submit"
        >
          <template #append-inner>
            <v-btn
              class="mt-1"
              color="primary"
              :disabled="!input.trim() || !store.canSend"
              icon
              :loading="store.sending"
              size="small"
              @click="submit"
            >
              <v-icon>mdi-send</v-icon>
            </v-btn>
          </template>
        </v-textarea>

        <div class="text-caption text-medium-emphasis mt-2">
          Enter envia · Shift+Enter quebra linha · Respostas locais até o endpoint Directus + Claude/GPT.
        </div>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
.analyst-page {
  max-width: 920px;
  margin: 0 auto;
}

.analyst-shell {
  display: flex;
  flex-direction: column;
  min-height: min(72vh, 720px);
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.analyst-banner {
  background: linear-gradient(120deg, #000 0%, #1a1a1a 55%, #3b0a0d 100%);
  border-bottom: 3px solid #eb1823;
}

.analyst-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background:
    radial-gradient(ellipse 60% 40% at 100% 0%, rgba(235, 24, 35, 0.04), transparent 50%),
    rgb(var(--v-theme-background));
}

.msg {
  display: flex;
  max-width: 92%;
}

.msg--user {
  align-self: flex-end;
}

.msg--assistant,
.msg--system {
  align-self: flex-start;
}

.msg__bubble {
  padding: 12px 14px;
  border-radius: 14px;
  line-height: 1.45;
  font-size: 0.925rem;
}

.msg--user .msg__bubble {
  background: #eb1823;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.msg--assistant .msg__bubble {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom-left-radius: 4px;
}

.msg__bubble--pending {
  opacity: 0.75;
  font-style: italic;
}

.msg__bubble--error {
  border-color: rgb(var(--v-theme-error)) !important;
}

.msg__content :deep(strong) {
  font-weight: 700;
}

.msg__sources {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 8px;
}

.suggestion-chip {
  cursor: pointer;
  max-width: 100%;
}

.suggestion-chip:hover {
  border-color: #eb1823 !important;
  color: #eb1823;
}

.analyst-input :deep(textarea) {
  padding-right: 8px;
}
</style>
