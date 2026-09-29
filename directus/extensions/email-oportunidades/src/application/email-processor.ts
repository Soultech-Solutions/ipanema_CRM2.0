import type { ClientSummary, ProductRepository, ProductSummary } from '../domain/types'
import type { MailInput, QuoteExtractor } from '../infrastructure/anthropic.extractor'
import type { EmailRepository } from '../infrastructure/email.repository'
import type { OpportunityRepository } from '../infrastructure/opportunity.repository'
import { buildOpportunity } from './build-opportunity'

export interface ProcessOutcome {
  status: 'processado' | 'ignorado'
  opportunityId: string | null
  itens: number
}

/** Extrai o pedido de um email já gravado em `emails_recebidos` e cria/atualiza a oportunidade. */
export class EmailProcessor {
  constructor (private deps: {
    extractor: QuoteExtractor
    products: ProductRepository
    emails: EmailRepository
    opportunities: OpportunityRepository
  }) {}

  async process (emailId: string, mail: MailInput, existingOpportunityId?: string | null): Promise<ProcessOutcome> {
    const { extractor, emails, opportunities } = this.deps
    await emails.update(emailId, { status: 'processando', erro: null })

    const result = await extractor.extract(mail)
    const { extraction } = result
    const extracao = {
      ...extraction,
      modelo: result.model,
      rodadas: result.rounds,
      tokens: { entrada: result.tokenInput, saida: result.tokenOutput },
      anexos_ignorados: result.skippedAttachments,
    }

    if (!extraction.is_quote_request) {
      await emails.update(emailId, {
        status: 'ignorado',
        classificacao: 'nao_comercial',
        extracao,
      })
      return { status: 'ignorado', opportunityId: existingOpportunityId ?? null, itens: 0 }
    }

    const products = await this.resolveProducts(result.seenProducts, extraction.itens.flatMap(i => [
      i.produto_id,
      ...i.alternativas,
    ]))
    const client = this.resolveClient(result.seenClients, extraction.cliente.id)

    const draft = buildOpportunity({
      extraction,
      products,
      client,
      emailId,
      from: mail.from,
      fromName: mail.fromName,
      subject: mail.subject,
    })

    const opportunityId = await opportunities.save(draft, existingOpportunityId)
    await emails.update(emailId, {
      status: 'processado',
      classificacao: 'pedido_orcamento',
      extracao,
      oportunidade: opportunityId,
    })

    return { status: 'processado', opportunityId, itens: draft.items.length }
  }

  /** Só aceita ids que existem de fato no catálogo. */
  private async resolveProducts (seen: Map<string, ProductSummary>, ids: (string | null)[]): Promise<Map<string, ProductSummary>> {
    const wanted = [...new Set(ids.filter((id): id is string => id !== null && id !== ''))]
    const map = new Map<string, ProductSummary>()
    const missing: string[] = []
    for (const id of wanted) {
      const p = seen.get(id)
      if (p) {
        map.set(id, p)
      } else {
        missing.push(id)
      }
    }
    if (missing.length > 0) {
      for (const p of await this.deps.products.getByIds(missing).catch(() => [])) {
        map.set(p.id, p)
      }
    }
    return map
  }

  private resolveClient (seen: Map<string, ClientSummary>, id: string | null): ClientSummary | null {
    return id ? seen.get(id) ?? null : null
  }
}
