import type { Response } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor (
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function mapError (res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      errors: [{
        message: error.errors.map(e => e.message).join('; ') || 'Pergunta inválida',
        extensions: { code: 'INVALID_REQUEST' },
      }],
    })
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({
      errors: [{
        message: error.message,
        extensions: { code: error.code },
      }],
    })
  }

  const message = error instanceof Error ? error.message : 'Erro interno'
  const isAnthropic = /anthropic|api key|rate_limit|overloaded/i.test(message)

  return res.status(isAnthropic ? 502 : 500).json({
    errors: [{
      message: isAnthropic ? 'Falha ao consultar o modelo de IA' : message,
      extensions: { code: isAnthropic ? 'LLM_UPSTREAM' : 'INTERNAL' },
    }],
  })
}
