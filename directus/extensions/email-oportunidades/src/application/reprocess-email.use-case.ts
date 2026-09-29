import type { DirectusContext } from '../infrastructure/directus'
import type { ProcessOutcome } from './email-processor'
import { loadConfig } from '../config'
import { AppError } from '../http/map-error'
import { errMsg } from '../infrastructure/directus'
import { createContainer } from './container'

export class ReprocessEmailUseCase {
  constructor (private ctx: DirectusContext) {}

  async execute (emailId: string): Promise<ProcessOutcome> {
    const config = loadConfig(this.ctx.env)
    if (!config.anthropic.apiKey) {
      throw new AppError('ANTHROPIC_API_KEY não configurada no Directus', 500, 'NOT_CONFIGURED')
    }

    const c = await createContainer(this.ctx, config)
    const email = await c.emails.get(emailId).catch(() => null)
    if (!email) {
      throw new AppError('Email não encontrado', 404, 'NOT_FOUND')
    }

    const attachments = await c.attachments.load(email.anexos)
    try {
      return await c.processor.process(email.id, {
        from: email.remetente,
        fromName: email.remetente_nome,
        subject: email.assunto ?? '',
        text: email.corpo_texto ?? '',
        receivedAt: email.recebido_em ? new Date(email.recebido_em) : null,
        attachments,
      }, email.oportunidade)
    } catch (error_) {
      await c.emails.update(email.id, { status: 'erro', erro: errMsg(error_) }).catch(() => undefined)
      throw error_
    }
  }
}
