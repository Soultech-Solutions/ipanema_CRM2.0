import { z } from 'zod'

const nullableString = z.string().trim().nullish().transform(v => v || null)

export const extractedItemSchema = z.object({
  texto_original: z.string().trim().min(1),
  quantidade: z.preprocess(v => (v == null || v === '' ? 1 : Number(v)), z.number().positive().catch(1)),
  unidade: nullableString,
  produto_id: nullableString,
  confianca: z.coerce.number().min(0).max(1).catch(0),
  alternativas: z.array(z.string()).nullish().transform(v => v ?? []),
  observacao: nullableString,
})

export const extractionSchema = z.object({
  is_quote_request: z.boolean(),
  motivo: z.string().trim().default(''),
  cliente: z.object({
    id: nullableString,
    nome: nullableString,
  }).nullish().transform(v => v ?? { id: null, nome: null }),
  contato: z.object({
    nome: nullableString,
    email: nullableString,
  }).nullish().transform(v => v ?? { nome: null, email: null }),
  prazo_entrega: nullableString,
  itens: z.array(extractedItemSchema).default([]),
  observacoes: nullableString,
})

export type ExtractedItem = z.infer<typeof extractedItemSchema>
export type Extraction = z.infer<typeof extractionSchema>

export interface ExtractionResult {
  extraction: Extraction
  model: string
  rounds: number
  tokenInput: number
  tokenOutput: number
}
