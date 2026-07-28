import { defineEndpoint } from '@directus/extensions-sdk'
import { askHandler } from './routes/ask'

/**
 * Monta em: POST /analista-comercial/ask
 * (o nome da pasta da extension vira o prefixo da rota)
 */
export default defineEndpoint((router, context) => {
  router.post('/ask', askHandler(context))

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'analista-comercial',
      anthropicConfigured: Boolean(context.env.ANTHROPIC_API_KEY),
      enabled: context.env.ANALISTA_ENABLED !== 'false',
    })
  })
})
