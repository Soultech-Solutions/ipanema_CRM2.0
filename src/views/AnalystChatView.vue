<script lang="ts" setup>
  import DOMPurify from 'dompurify'
  import { marked } from 'marked'
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import StatusChip from '@/components/StatusChip.vue'
  import { useAnalystStore } from '@/stores/analyst'

  marked.setOptions({
    breaks: true,
    gfm: true,
  })

  const store = useAnalystStore()
  const router = useRouter()
  const input = ref('')
  const listEl = ref<HTMLElement | null>(null)
  const endpointMode = import.meta.env.VITE_USE_MOCK === 'false' ? 'Directus' : 'Modo local'

  // Última resposta da IA (alimenta o card "Fontes analisadas")
  const lastAnswer = computed(() =>
    store.messages.findLast(m => m.role === 'assistant' && !m.pending) ?? null)

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
    if (!q.trim()) return
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

  /** Renderiza markdown (títulos, listas, negrito, etc.) de forma segura */
  function formatContent (text: string): string {
    const html = marked.parse(text, { async: false }) as string
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
    })
  }
</script>

<template>
  <v-row>
    <v-col cols="12" lg="8">
      <!-- Caixa de pergunta -->
      <v-card class="ask" rounded="xl" variant="flat">
        <v-text-field
          v-model="input"
          class="ask__input"
          density="comfortable"
          :disabled="!store.canSend"
          hide-details
          placeholder="Pergunte algo sobre a operação comercial…"
          variant="plain"
          @keydown.enter.prevent="submit"
        />

        <v-btn
          class="ask__btn"
          :disabled="!input.trim() || !store.canSend"
          :loading="store.sending"
          variant="flat"
          @click="submit"
        >
          Perguntar
        </v-btn>
      </v-card>

      <!-- Perguntas rápidas -->
      <div class="quick-label">Perguntas rápidas</div>

      <div class="quick">
        <button
          v-for="s in store.suggestions"
          :key="s"
          class="quick__chip"
          type="button"
          @click="useSuggestion(s)"
        >
          {{ s }}
        </button>
      </div>

      <!-- Conversa -->
      <div ref="listEl" class="messages">
        <div
          v-for="msg in store.messages"
          :key="msg.id"
          class="msg"
          :class="`msg--${msg.role}`"
        >
          <!-- Pergunta do usuário -->
          <div v-if="msg.role === 'user'" class="msg__user">
            <div class="msg__content" v-html="formatContent(msg.content)" />
          </div>

          <!-- Resposta da IA -->
          <v-card
            v-else
            class="msg__answer"
            :class="{ 'msg__answer--pending': msg.pending, 'msg__answer--error': msg.error }"
            rounded="xl"
            variant="flat"
          >
            <StatusChip class="mb-3" label="RESPOSTA IA" tone="success" />
            <div class="msg__content" v-html="formatContent(msg.content)" />

            <div v-if="msg.suggestedActions?.length" class="msg__actions">
              <v-btn
                v-for="(action, i) in msg.suggestedActions"
                :key="`${msg.id}-act-${i}`"
                class="msg__action"
                size="small"
                variant="flat"
                @click="goAction(action.route)"
              >
                {{ action.label }}
              </v-btn>
            </div>
          </v-card>
        </div>
      </div>
    </v-col>

    <!-- Fontes analisadas -->
    <v-col cols="12" lg="4">
      <v-card class="sources" rounded="xl" variant="flat">
        <div class="sources__title">Fontes analisadas</div>

        <template v-if="lastAnswer?.sources?.length">
          <div
            v-for="(src, i) in lastAnswer.sources"
            :key="`src-${i}`"
            class="sources__item"
          >
            <span class="sources__check"><v-icon icon="mdi-check" size="14" /></span>
            {{ src.label }}
          </div>
        </template>

        <p v-else class="sources__empty">As fontes usadas pela IA aparecem aqui depois da resposta.</p>

        <div class="sources__footer">
          <div class="sources__mode">Modo: {{ endpointMode }}</div>

          <v-btn
            class="sources__btn"
            prepend-icon="mdi-refresh"
            size="small"
            variant="flat"
            @click="store.clear()"
          >
            Nova conversa
          </v-btn>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.ask { display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 22px; }
.ask__input { flex: 1; font-size: 14px; }
.ask__btn { background: var(--ip-navy) !important; color: #fff !important; }

.quick-label { margin: 22px 0 10px; font-size: 12px; color: var(--ip-text-muted); }
.quick { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
.quick__chip { padding: 8px 16px; border-radius: 16px; background: var(--ip-tint-blue); color: var(--ip-navy); font-size: 12px; font-weight: 600; cursor: pointer; border: 0; text-align: left; }
.quick__chip:hover { background: #dbe8f2; }

.messages { display: flex; flex-direction: column; gap: 16px; max-height: 620px; overflow-y: auto; padding-right: 4px; }
.msg { display: flex; }
.msg--user { justify-content: flex-end; }
.msg__user { max-width: 85%; padding: 12px 16px; border-radius: 16px 16px 4px 16px; background: var(--ip-navy); color: #fff; font-size: 14px; line-height: 1.45; }
.msg__answer { width: 100%; padding: 24px; }
.msg__answer--pending { opacity: 0.75; font-style: italic; }
.msg__answer--error { border-color: var(--ip-red) !important; }
.msg__actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.msg__action { background: var(--ip-navy) !important; color: #fff !important; }

.msg__content { font-size: 14px; line-height: 1.5; color: inherit; }
.msg__answer .msg__content { color: var(--ip-text); }
.msg__content :deep(p) { margin: 0 0 0.65em; }
.msg__content :deep(p:last-child) { margin-bottom: 0; }
.msg__content :deep(h1),
.msg__content :deep(h2),
.msg__content :deep(h3),
.msg__content :deep(h4) { margin: 0.85em 0 0.4em; font-weight: 700; line-height: 1.3; }
.msg__content :deep(h1) { font-size: 1.3rem; }
.msg__content :deep(h2) { font-size: 1.15rem; }
.msg__content :deep(h3),
.msg__content :deep(h4) { font-size: 1rem; }
.msg__content :deep(h1:first-child),
.msg__content :deep(h2:first-child),
.msg__content :deep(h3:first-child),
.msg__content :deep(h4:first-child) { margin-top: 0; }
.msg__content :deep(ul),
.msg__content :deep(ol) { margin: 0.4em 0 0.75em; padding-left: 1.35em; }
.msg__content :deep(li) { margin: 0.2em 0; }
.msg__content :deep(li > p) { margin: 0; }
.msg__content :deep(strong) { font-weight: 700; }
.msg__content :deep(em) { font-style: italic; }
.msg__content :deep(code) { font-size: 0.88em; padding: 0.1em 0.35em; border-radius: 4px; background: rgba(var(--v-theme-on-surface), 0.08); }
.msg__content :deep(pre) { margin: 0.5em 0; padding: 0.75em 0.9em; overflow-x: auto; border-radius: 8px; background: rgba(var(--v-theme-on-surface), 0.06); }
.msg__content :deep(pre code) { padding: 0; background: transparent; }
.msg__content :deep(blockquote) { margin: 0.5em 0; padding-left: 0.85em; border-left: 3px solid var(--ip-border); color: var(--ip-text-muted); }
.msg__content :deep(a) { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.msg__content :deep(hr) { margin: 0.85em 0; border: 0; border-top: 1px solid var(--ip-border); }
.msg__content :deep(table) { border-collapse: collapse; margin: 0.6em 0; font-size: 13px; }
.msg__content :deep(th),
.msg__content :deep(td) { padding: 6px 10px; border: 1px solid var(--ip-border); text-align: left; }

.sources { padding: 24px; background: #102338 !important; border-color: #102338 !important; }
.sources__title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 18px; }
.sources__item { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; font-size: 12px; font-weight: 600; color: #fff; }
.sources__check { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: var(--ip-tint-green); color: var(--ip-green); flex-shrink: 0; }
.sources__empty { font-size: 12px; line-height: 1.5; color: rgba(255, 255, 255, 0.7); margin: 0; }
.sources__footer { margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(255, 255, 255, 0.15); }
.sources__mode { margin-bottom: 12px; font-size: 11px; color: rgba(255, 255, 255, 0.6); }
.sources__btn { background: var(--ip-navy) !important; color: #fff !important; }
</style>
