import { randomUUID } from 'node:crypto'
import type { AnalystSuggestedAction, AnalystSource, ChatMessageRow } from '../domain/types'

type ItemsService = {
  createOne: (data: Record<string, unknown>) => Promise<string | { id: string }>
  readOne: (id: string, query?: Record<string, unknown>) => Promise<unknown>
  readByQuery: (query: Record<string, unknown>) => Promise<unknown[]>
  updateOne: (id: string, data: Record<string, unknown>) => Promise<unknown>
}

type ItemsServiceFactory = (collection: string) => ItemsService

function idOf (value: string | { id: string }): string {
  return typeof value === 'string' ? value : value.id
}

export class ConversationRepository {
  constructor (private items: ItemsServiceFactory) {}

  async resolveConversation (userId: string, conversationId?: string): Promise<string> {
    if (conversationId) {
      try {
        const row = await this.items('chat_conversations').readOne(conversationId, {
          fields: ['id', 'user_created', 'status'],
        }) as { id: string, user_created?: string, status?: string }

        if (row?.user_created && row.user_created !== userId) {
          throw new Error('FORBIDDEN')
        }
        return row.id
      } catch (error_) {
        if (error_ instanceof Error && error_.message === 'FORBIDDEN') throw error_
        // cria nova se id inválido
      }
    }

    const created = await this.items('chat_conversations').createOne({
      id: randomUUID(),
      status: 'active',
      title: null,
      user_created: userId,
    })
    return idOf(created)
  }

  async getHistory (conversationId: string, limit = 12): Promise<ChatMessageRow[]> {
    try {
      const rows = await this.items('chat_messages').readByQuery({
        filter: { conversation: { _eq: conversationId } },
        sort: ['date_created'],
        limit: 100,
        fields: ['id', 'role', 'content', 'date_created'],
      }) as Array<{ id: string, role: string, content: string }>

      return rows
        .filter(r => r.role === 'user' || r.role === 'assistant')
        .slice(-limit)
        .map(r => ({
          id: r.id,
          role: r.role as 'user' | 'assistant',
          content: r.content,
        }))
    } catch {
      return []
    }
  }

  async appendMessages (params: {
    conversationId: string
    userId: string
    question: string
    answer: string
    sources: AnalystSource[]
    suggestedActions: AnalystSuggestedAction[]
    model: string
    latencyMs: number
  }) {
    const messages = this.items('chat_messages')

    try {
      await messages.createOne({
        id: randomUUID(),
        conversation: params.conversationId,
        role: 'user',
        content: params.question,
      })

      await messages.createOne({
        id: randomUUID(),
        conversation: params.conversationId,
        role: 'assistant',
        content: params.answer,
        sources: params.sources,
        suggested_actions: params.suggestedActions,
        model: params.model,
        latency_ms: params.latencyMs,
      })

      try {
        await this.items('chat_conversations').updateOne(params.conversationId, {
          title: params.question.slice(0, 80),
        })
      } catch {
        // ignore
      }
    } catch {
      // Chat collections podem ainda não existir — não quebra a resposta
    }
  }
}
