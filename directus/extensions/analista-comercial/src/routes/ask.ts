import type { Request, Response } from 'express'
import { AskAnalystUseCase } from '../application/ask-analyst.use-case'
import { parseAskRequest } from '../http/dto'
import { mapError } from '../http/map-error'

export function askHandler (context: any) {
  return async (req: Request, res: Response) => {
    try {
      const userId = req.accountability?.user
      if (!userId) {
        return res.status(401).json({
          errors: [{
            message: 'Unauthorized',
            extensions: { code: 'UNAUTHORIZED' },
          }],
        })
      }

      const dto = parseAskRequest(req.body)
      const useCase = new AskAnalystUseCase(context)
      const result = await useCase.execute({
        question: dto.question,
        conversationId: dto.conversationId,
        context: dto.context,
        userId: String(userId),
      })

      return res.json(result)
    } catch (error_) {
      context.logger?.error?.({
        event: 'analista.ask.error',
        message: error_ instanceof Error ? error_.message : String(error_),
      })
      return mapError(res, error_)
    }
  }
}
