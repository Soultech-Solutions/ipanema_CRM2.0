import type { DirectusContext } from '../infrastructure/directus'
import { defineHook } from '@directus/extensions-sdk'
import { ProcessInboxUseCase } from '../application/process-inbox.use-case'
import { loadConfig, missingMailConfig } from '../config'

export default defineHook(({ schedule }, context) => {
  const ctx = context as unknown as DirectusContext
  const config = loadConfig(ctx.env)

  if (!config.enabled) {
    ctx.logger.info('[email-oportunidades] leitura automática desabilitada (EMAIL_INGEST_ENABLED != true)')
    return
  }

  const missing = missingMailConfig(config)
  if (missing.length > 0) {
    ctx.logger.warn(`[email-oportunidades] leitura automática sem configuração: ${missing.join(', ')}`)
  }

  ctx.logger.info(`[email-oportunidades] leitura ${config.provider} agendada (${config.pollCron})`)
  schedule(config.pollCron, async () => {
    try {
      await new ProcessInboxUseCase(ctx).run('cron')
    } catch (error_) {
      ctx.logger.error(`[email-oportunidades] ciclo falhou: ${error_ instanceof Error ? error_.message : String(error_)}`)
    }
  })
})
