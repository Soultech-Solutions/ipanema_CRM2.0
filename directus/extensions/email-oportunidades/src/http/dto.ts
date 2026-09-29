import { z } from 'zod'

export const importProductsSchema = z.object({
  rows: z.array(z.record(z.unknown())).min(1, 'Nenhuma linha enviada').max(5000, 'Envie no máximo 5000 linhas por requisição'),
  fonte: z.string().max(255).optional(),
})

export const emailIdSchema = z.string().uuid('id de email inválido')
