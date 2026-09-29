import type { ClientRepository, ClientSummary, IncomingMail, ProductRepository, ProductSummary } from '../domain/types'
import Anthropic from '@anthropic-ai/sdk'
import { ZodError } from 'zod'
import { type Extraction, type ExtractionResult, extractionSchema } from '../domain/extraction'
import { buildUserMessage, SYSTEM_PROMPT } from '../domain/prompts'
import { EMIT_EXTRACTION, TOOL_DEFINITIONS } from '../domain/tools'
import { prepareAttachments } from './attachments'

export interface ExtractorConfig {
  apiKey: string
  model: string
  maxTokens: number
  maxToolRounds: number
  maxAttachments: number
  maxAttachmentBytes: number
}

export interface QuoteExtraction extends ExtractionResult {
  /** Produtos e clientes retornados pelas tools (evita reler do banco). */
  seenProducts: Map<string, ProductSummary>
  seenClients: Map<string, ClientSummary>
  skippedAttachments: string[]
}

export type MailInput = Pick<IncomingMail, 'from' | 'fromName' | 'subject' | 'text' | 'receivedAt' | 'attachments'>

export class QuoteExtractor {
  private client: Anthropic

  constructor (
    private config: ExtractorConfig,
    private products: ProductRepository,
    private clients: ClientRepository,
  ) {
    this.client = new Anthropic({ apiKey: config.apiKey })
  }

  async extract (mail: MailInput): Promise<QuoteExtraction> {
    const seenProducts = new Map<string, ProductSummary>()
    const seenClients = new Map<string, ClientSummary>()

    const prepared = prepareAttachments(mail.attachments, {
      maxAttachments: this.config.maxAttachments,
      maxBytes: this.config.maxAttachmentBytes,
    })

    const userContent: Anthropic.ContentBlockParam[] = [
      ...prepared.pdfs.map((pdf): Anthropic.DocumentBlockParam => ({
        type: 'document',
        title: pdf.filename,
        source: { type: 'base64', media_type: 'application/pdf', data: pdf.base64 },
      })),
      {
        type: 'text',
        text: buildUserMessage({
          from: mail.from,
          fromName: mail.fromName,
          subject: mail.subject,
          receivedAt: mail.receivedAt ? mail.receivedAt.toISOString() : null,
          text: mail.text,
          attachmentTexts: prepared.texts,
          skippedAttachments: prepared.skipped,
        }),
      },
    ]

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }]
    let extraction: Extraction | null = null
    let rounds = 0
    let tokenInput = 0
    let tokenOutput = 0
    let forceEmit = false

    while (!extraction && rounds < this.config.maxToolRounds + 1) {
      rounds += 1
      const lastChance = forceEmit || rounds >= this.config.maxToolRounds

      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFINITIONS,
        tool_choice: lastChance ? { type: 'tool', name: EMIT_EXTRACTION } : { type: 'auto' },
        messages,
      })
      tokenInput += response.usage.input_tokens
      tokenOutput += response.usage.output_tokens

      messages.push({ role: 'assistant', content: response.content })

      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      if (toolUses.length === 0) {
        forceEmit = true
        messages.push({ role: 'user', content: 'Finalize agora chamando emit_extraction.' })
        continue
      }

      const results: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolUses) {
        const input = (block.input ?? {}) as Record<string, unknown>
        try {
          if (block.name === EMIT_EXTRACTION) {
            extraction = extractionSchema.parse(input)
            results.push({ type: 'tool_result', tool_use_id: block.id, content: '{"ok":true}' })
            continue
          }
          const output = await this.runTool(block.name, input, seenProducts, seenClients)
          results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(output) })
        } catch (error_) {
          const message = error_ instanceof ZodError
            ? `Payload inválido: ${error_.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`
            : (error_ instanceof Error ? error_.message : 'Erro na tool')
          results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: message })
        }
      }
      messages.push({ role: 'user', content: results })
    }

    if (!extraction) {
      throw new Error('O modelo não produziu uma extração estruturada')
    }

    return {
      extraction,
      model: this.config.model,
      rounds,
      tokenInput,
      tokenOutput,
      seenProducts,
      seenClients,
      skippedAttachments: prepared.skipped,
    }
  }

  private async runTool (
    name: string,
    input: Record<string, unknown>,
    seenProducts: Map<string, ProductSummary>,
    seenClients: Map<string, ClientSummary>,
  ): Promise<unknown> {
    switch (name) {
      case 'search_products': {
        const products = await this.products.search({
          codigo: typeof input.codigo === 'string' ? input.codigo : undefined,
          query: typeof input.query === 'string' ? input.query : undefined,
          marca: typeof input.marca === 'string' ? input.marca : undefined,
          limit: typeof input.limit === 'number' ? input.limit : undefined,
        })
        for (const p of products) {
          seenProducts.set(p.id, p)
        }
        return {
          total: products.length,
          produtos: products,
          dica: products.length === 0 ? 'Nada encontrado. Tente outro código, parte da descrição ou medidas.' : undefined,
        }
      }
      case 'find_client': {
        const clients = await this.clients.find({
          email_domain: typeof input.email_domain === 'string' ? input.email_domain : undefined,
          nome: typeof input.nome === 'string' ? input.nome : undefined,
        })
        for (const c of clients) {
          seenClients.set(c.id, c)
        }
        return { total: clients.length, clientes: clients.map(c => ({ id: c.id, codigo: c.codigo, nome: c.nome })) }
      }
      default: {
        return { error: `Tool desconhecida: ${name}` }
      }
    }
  }
}
