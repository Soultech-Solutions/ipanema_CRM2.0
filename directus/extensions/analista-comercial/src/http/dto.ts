import { z } from 'zod'

export const AskRequestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  conversationId: z.string().trim().min(1).max(64).optional(),
  context: z.object({
    clienteId: z.string().trim().min(1).max(120).optional(),
  }).optional(),
})

export type AskRequestDto = z.infer<typeof AskRequestSchema>

export function parseAskRequest (body: unknown): AskRequestDto {
  return AskRequestSchema.parse(body)
}
