import type { AskInput, AskOutput } from '../domain/types'
import { AppError } from '../http/map-error'
import { AnthropicClient } from '../infrastructure/anthropic.client'
import { ContextRepository } from '../infrastructure/context.repository'
import { ConversationRepository } from '../infrastructure/conversation.repository'
import { ToolExecutor } from '../infrastructure/tool.executor'

type DirectusContext = {
  services: {
    ItemsService: new (collection: string, opts: Record<string, unknown>) => {
      createOne: (data: Record<string, unknown>) => Promise<string | { id: string }>
      readOne: (id: string, query?: Record<string, unknown>) => Promise<unknown>
      readByQuery: (query: Record<string, unknown>) => Promise<unknown[]>
      updateOne?: (id: string, data: Record<string, unknown>) => Promise<unknown>
    }
  }
  getSchema: () => Promise<unknown>
  env: Record<string, string | undefined>
  logger: { info: Function, warn: Function, error: Function }
}

export class AskAnalystUseCase {
  constructor (private ctx: DirectusContext) {}

  async execute (input: AskInput): Promise<AskOutput> {
    const started = Date.now()
    const apiKey = this.ctx.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new AppError(
        'ANTHROPIC_API_KEY não configurada no Directus',
        500,
        'INTERNAL',
      )
    }

    if (this.ctx.env.ANALISTA_ENABLED === 'false') {
      throw new AppError('Analista comercial desabilitado', 403, 'FORBIDDEN')
    }

    const schema = await this.ctx.getSchema()
    const itemsFactory = (collection: string) => new this.ctx.services.ItemsService(collection, {
      schema,
      // system scope for tool reads; auth is enforced at HTTP layer
      accountability: null,
    })

    const contextRepo = new ContextRepository(itemsFactory)
    const conversationRepo = new ConversationRepository(itemsFactory)
    const toolExecutor = new ToolExecutor(contextRepo)
    const llm = new AnthropicClient({
      apiKey,
      model: this.ctx.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',
      maxTokens: Number(this.ctx.env.ANTHROPIC_MAX_TOKENS || 2048),
      maxToolRounds: Number(this.ctx.env.ANALISTA_MAX_TOOL_ROUNDS || 6),
    }, toolExecutor)

    let conversationId: string
    try {
      conversationId = await conversationRepo.resolveConversation(
        input.userId,
        input.conversationId,
      )
    } catch (error_) {
      if (error_ instanceof Error && error_.message === 'FORBIDDEN') {
        throw new AppError('Conversa não pertence ao usuário', 403, 'FORBIDDEN')
      }
      // Collections de chat ainda não existem — gera id efêmero
      conversationId = input.conversationId || `ephemeral-${Date.now()}`
      this.ctx.logger.warn?.('[analista] chat collections indisponíveis; conversa efêmera')
    }

    const [baseline, history] = await Promise.all([
      contextRepo.getBaseline(input.context?.clienteId),
      conversationId.startsWith('ephemeral-')
        ? Promise.resolve([])
        : conversationRepo.getHistory(conversationId),
    ])

    const result = await llm.ask({
      question: input.question,
      baseline,
      history,
    })

    const latencyMs = Date.now() - started

    if (!conversationId.startsWith('ephemeral-')) {
      await conversationRepo.appendMessages({
        conversationId,
        userId: input.userId,
        question: input.question,
        answer: result.answer,
        sources: result.sources,
        suggestedActions: result.suggestedActions,
        model: result.model,
        latencyMs,
      })
    }

    this.ctx.logger.info?.({
      event: 'analista.ask',
      conversationId,
      userId: input.userId,
      latencyMs,
      model: result.model,
      ok: true,
    })

    return {
      ...result,
      conversationId,
      latencyMs,
    }
  }
}
