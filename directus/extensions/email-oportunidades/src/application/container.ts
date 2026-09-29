import type { DirectusContext } from '../infrastructure/directus'
import { type ExtensionConfig, loadConfig } from '../config'
import { QuoteExtractor } from '../infrastructure/anthropic.extractor'
import { AttachmentStorage } from '../infrastructure/attachment.storage'
import { DirectusClientRepository } from '../infrastructure/client.repository'
import { createServices } from '../infrastructure/directus'
import { EmailRepository } from '../infrastructure/email.repository'
import { OpportunityRepository } from '../infrastructure/opportunity.repository'
import { DirectusProductRepository } from '../infrastructure/product.repository'
import { EmailProcessor } from './email-processor'

export async function createContainer (ctx: DirectusContext, config: ExtensionConfig = loadConfig(ctx.env)) {
  const services = await createServices(ctx)
  const products = new DirectusProductRepository(services.items)
  const clients = new DirectusClientRepository(services.items)
  const emails = new EmailRepository(services.items)
  const opportunities = new OpportunityRepository(services.items)
  const attachments = new AttachmentStorage(services.files, services.assets, config.storage, ctx.logger)

  const extractor = new QuoteExtractor({
    apiKey: config.anthropic.apiKey,
    model: config.anthropic.model,
    maxTokens: config.anthropic.maxTokens,
    maxToolRounds: config.anthropic.maxToolRounds,
    maxAttachments: config.maxAttachments,
    maxAttachmentBytes: config.maxAttachmentBytes,
  }, products, clients)

  const processor = new EmailProcessor({ extractor, products, emails, opportunities })

  return { config, services, products, clients, emails, opportunities, attachments, processor, logger: ctx.logger }
}

export type Container = Awaited<ReturnType<typeof createContainer>>
