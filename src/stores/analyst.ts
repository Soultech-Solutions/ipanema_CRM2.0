import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { askAnalyst } from '@/api/analyst'
import type { ChatMessage } from '@/types/analyst'

function uid () {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const SUGGESTIONS = [
  'Quais clientes possuem maior risco de perda?',
  'Onde existe maior potencial de crescimento?',
  'Quais clientes estão diminuindo o faturamento?',
  'O que deve ser priorizado hoje?',
  'Como está o CII e a saúde da carteira?',
]

export const useAnalystStore = defineStore('analyst', () => {
  const messages = ref<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Sou o **Analista Comercial** da Raça. Pergunte sobre riscos, oportunidades, prioridades ou indicadores da carteira — vou consultar a base e responder com dados.',
      createdAt: new Date().toISOString(),
    },
  ])
  const conversationId = ref<string | undefined>()
  const sending = ref(false)
  const error = ref<string | null>(null)

  const suggestions = computed(() => SUGGESTIONS)
  const canSend = computed(() => !sending.value)

  async function send (question: string, clienteId?: string) {
    const text = question.trim()
    if (!text || sending.value) return

    error.value = null
    messages.value.push({
      id: uid(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    })

    const pendingId = uid()
    messages.value.push({
      id: pendingId,
      role: 'assistant',
      content: 'Consultando a base e preparando a resposta…',
      createdAt: new Date().toISOString(),
      pending: true,
    })

    sending.value = true
    try {
      const response = await askAnalyst({
        question: text,
        conversationId: conversationId.value,
        context: clienteId ? { clienteId } : undefined,
      })

      conversationId.value = response.conversationId
      const idx = messages.value.findIndex(m => m.id === pendingId)
      const assistantMsg: ChatMessage = {
        id: pendingId,
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
        sources: response.sources,
        suggestedActions: response.suggestedActions,
      }
      if (idx >= 0) messages.value[idx] = assistantMsg
      else messages.value.push(assistantMsg)
    } catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'Falha ao consultar o analista'
      const idx = messages.value.findIndex(m => m.id === pendingId)
      if (idx >= 0) {
        messages.value[idx] = {
          id: pendingId,
          role: 'assistant',
          content: `Não consegui processar a pergunta. ${error.value}`,
          createdAt: new Date().toISOString(),
          error: true,
        }
      }
    } finally {
      sending.value = false
    }
  }

  function clear () {
    conversationId.value = undefined
    error.value = null
    messages.value = [{
      id: 'welcome',
      role: 'assistant',
      content: 'Conversa reiniciada. Em que posso ajudar na carteira comercial?',
      createdAt: new Date().toISOString(),
    }]
  }

  return {
    messages,
    conversationId,
    sending,
    error,
    suggestions,
    canSend,
    send,
    clear,
  }
})
