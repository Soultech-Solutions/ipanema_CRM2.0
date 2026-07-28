import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '../domain/prompts'
import { TOOL_DEFINITIONS, type EmitAnswerPayload } from '../domain/tools'
import type { AskOutput, BaselineContext, ChatMessageRow } from '../domain/types'
import { AppError } from '../http/map-error'
import type { ToolExecutor } from './tool.executor'

export interface LlmConfig {
  apiKey: string
  model: string
  maxTokens: number
  maxToolRounds: number
}

export class AnthropicClient {
  private client: Anthropic

  constructor (
    private config: LlmConfig,
    private tools: ToolExecutor,
  ) {
    this.client = new Anthropic({ apiKey: config.apiKey })
  }

  async ask (params: {
    question: string
    baseline: BaselineContext
    history: ChatMessageRow[]
  }): Promise<Omit<AskOutput, 'conversationId' | 'latencyMs'>> {
    const messages: Anthropic.MessageParam[] = []

    for (const msg of params.history) {
      if (msg.role === 'system') continue
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })
    }

    messages.push({
      role: 'user',
      content: [
        '## Contexto baseline (JSON)',
        JSON.stringify(params.baseline),
        '',
        '## Pergunta do usuário',
        params.question,
        '',
        'Use tools se precisar de mais dados. Ao final, chame emit_answer.',
      ].join('\n'),
    })

    let final: EmitAnswerPayload | null = null
    let rounds = 0

    while (rounds < this.config.maxToolRounds) {
      rounds += 1

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFINITIONS,
        messages,
      })

      if (response.stop_reason === 'end_turn' || response.stop_reason === 'max_tokens') {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('\n')
          .trim()

        if (!final && text) {
          final = {
            answer: text,
            sources: [{ type: 'kpi', label: 'Contexto baseline' }],
            suggestedActions: [{ label: 'Abrir dashboard', route: '/' }],
          }
        }
        break
      }

      if (response.stop_reason !== 'tool_use') break

      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        if (block.name === 'emit_answer') {
          final = block.input as EmitAnswerPayload
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ ok: true }),
          })
          continue
        }

        try {
          const result = await this.tools.execute(block.name, block.input as Record<string, unknown>)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        } catch (error_) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            is_error: true,
            content: error_ instanceof Error ? error_.message : 'Erro na tool',
          })
        }
      }

      messages.push({ role: 'user', content: toolResults })

      if (final) break
    }

    if (!final?.answer) {
      throw new AppError('O modelo não produziu uma resposta estruturada', 502, 'LLM_UPSTREAM')
    }

    return {
      answer: final.answer,
      sources: final.sources ?? [],
      suggestedActions: final.suggestedActions ?? [],
      model: this.config.model,
    }
  }
}
