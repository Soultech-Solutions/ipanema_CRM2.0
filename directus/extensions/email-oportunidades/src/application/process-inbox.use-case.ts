import type { IncomingMail } from '../domain/types'
import type { DirectusContext } from '../infrastructure/directus'
import type { MailProvider } from '../infrastructure/mail/types'
import { loadConfig, missingMailConfig } from '../config'
import { errMsg } from '../infrastructure/directus'
import { acquireLock } from '../infrastructure/lock'
import { createMailProvider } from '../infrastructure/mail/factory'
import { type Container, createContainer } from './container'
import { runState, type RunSummary } from './run-state'

const LOCK_KEY = 'email-oportunidades:poll'
const LOCK_TTL_SECONDS = 15 * 60

/** Lê emails não lidos, grava em `emails_recebidos` e gera as oportunidades. */
export class ProcessInboxUseCase {
  constructor (private ctx: DirectusContext) {}

  async run (trigger: RunSummary['trigger']): Promise<RunSummary> {
    const config = loadConfig(this.ctx.env)
    const summary: RunSummary = {
      trigger,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      lidos: 0,
      processados: 0,
      ignorados: 0,
      duplicados: 0,
      erros: 0,
    }

    const missing = missingMailConfig(config)
    if (missing.length > 0) {
      summary.skipped = 'not_configured'
      summary.error = `Configuração ausente: ${missing.join(', ')}`
      summary.finishedAt = new Date().toISOString()
      runState.lastRun = summary
      return summary
    }

    const release = await acquireLock(config.redisUrl, LOCK_KEY, LOCK_TTL_SECONDS)
    if (!release) {
      summary.skipped = 'locked'
      summary.finishedAt = new Date().toISOString()
      return summary
    }

    runState.running = true
    const provider = createMailProvider(config)
    try {
      const container = await createContainer(this.ctx, config)
      const mails = await provider.fetchNew(config.batchSize)
      summary.lidos = mails.length

      for (const mail of mails) {
        await this.handleMail(mail, provider, container, summary)
      }
    } catch (error_) {
      summary.error = errMsg(error_)
      this.ctx.logger.error(`[email-oportunidades] falha na leitura da caixa: ${summary.error}`)
    } finally {
      await provider.close().catch(() => undefined)
      await release()
      runState.running = false
      summary.finishedAt = new Date().toISOString()
      runState.lastRun = summary
    }

    this.ctx.logger.info({ event: 'email-oportunidades.run', ...summary })
    return summary
  }

  private async handleMail (mail: IncomingMail, provider: MailProvider, c: Container, summary: RunSummary) {
    const existing = await c.emails.findByMessageId(mail.messageId)
    if (existing) {
      summary.duplicados += 1
      await provider.markProcessed(mail.providerId, false).catch(() => undefined)
      return
    }

    const anexos = await c.attachments.save(mail.attachments, mail.subject || mail.from)
    const emailId = await c.emails.create({
      message_id: mail.messageId,
      provider: provider.kind,
      remetente: mail.from || 'desconhecido',
      remetente_nome: mail.fromName,
      assunto: mail.subject.slice(0, 998),
      corpo_texto: mail.text,
      recebido_em: mail.receivedAt?.toISOString() ?? null,
      anexos,
      status: 'novo',
    })

    try {
      const outcome = await c.processor.process(emailId, mail)
      if (outcome.status === 'processado') {
        summary.processados += 1
      } else {
        summary.ignorados += 1
      }
      await provider.markProcessed(mail.providerId, true)
    } catch (error_) {
      summary.erros += 1
      const message = errMsg(error_)
      c.logger.error(`[email-oportunidades] erro ao processar ${mail.messageId}: ${message}`)
      await c.emails.update(emailId, { status: 'erro', erro: message }).catch(() => undefined)
      // Marca como lido para não voltar no próximo ciclo; reprocessamento é feito pela tela
      await provider.markProcessed(mail.providerId, false).catch(() => undefined)
    }
  }
}
