import type { DirectusContext } from '../infrastructure/directus'
import type { NextFunction, Request, Response } from 'express'
import { defineEndpoint } from '@directus/extensions-sdk'
import { ImportProductsUseCase } from '../application/import-products.use-case'
import { ProcessInboxUseCase } from '../application/process-inbox.use-case'
import { ReprocessEmailUseCase } from '../application/reprocess-email.use-case'
import { runState } from '../application/run-state'
import { loadConfig, missingMailConfig } from '../config'
import { emailIdSchema, importProductsSchema } from '../http/dto'
import { mapError } from '../http/map-error'

function requireUser (req: Request, res: Response, next: NextFunction) {
  const accountability = (req as Request & { accountability?: { user?: string | null } }).accountability
  if (!accountability?.user) {
    res.status(401).json({ errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHORIZED' } }] })
    return
  }
  next()
}

/**
 * Rotas em /email-oportunidades:
 * - GET  /health
 * - POST /sync
 * - POST /emails/:id/reprocess
 * - POST /produtos/import
 */
export default defineEndpoint({
  id: 'email-oportunidades',
  handler: (router, context) => {
    const ctx = context as unknown as DirectusContext

    router.get('/health', (_req, res) => {
      const config = loadConfig(ctx.env)
      res.json({
        ok: true,
        service: 'email-oportunidades',
        pollingEnabled: config.enabled,
        provider: config.provider,
        cron: config.pollCron,
        missingConfig: missingMailConfig(config),
        running: runState.running,
        lastRun: runState.lastRun,
      })
    })

    router.post('/sync', requireUser, async (_req, res) => {
      try {
        const summary = await new ProcessInboxUseCase(ctx).run('manual')
        res.json(summary)
      } catch (error_) {
        mapError(res, error_)
      }
    })

    router.post('/emails/:id/reprocess', requireUser, async (req, res) => {
      try {
        const id = emailIdSchema.parse(req.params.id)
        const outcome = await new ReprocessEmailUseCase(ctx).execute(id)
        res.json(outcome)
      } catch (error_) {
        ctx.logger.error(`[email-oportunidades] reprocess: ${error_ instanceof Error ? error_.message : String(error_)}`)
        mapError(res, error_)
      }
    })

    router.post('/produtos/import', requireUser, async (req, res) => {
      try {
        const input = importProductsSchema.parse(req.body)
        const result = await new ImportProductsUseCase(ctx).execute(input)
        res.json(result)
      } catch (error_) {
        mapError(res, error_)
      }
    })
  },
})
