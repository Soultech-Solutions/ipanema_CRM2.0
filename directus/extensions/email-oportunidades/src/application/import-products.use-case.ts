import type { DirectusContext } from '../infrastructure/directus'
import { type MappedProduct, mapProductRow, productKey, resolveColumns } from '../domain/product-columns'
import { AppError } from '../http/map-error'
import { createServices } from '../infrastructure/directus'
import { DirectusProductRepository } from '../infrastructure/product.repository'

export interface ImportProductsInput {
  rows: Record<string, unknown>[]
  fonte?: string
}

export interface ImportProductsOutput {
  recebidos: number
  criados: number
  atualizados: number
  ignorados: number
  mapeamento: Record<string, string>
  colunasExtras: string[]
}

export function headersOf (rows: Record<string, unknown>[]): string[] {
  const headers = new Set<string>()
  for (const row of rows.slice(0, 50)) {
    for (const key of Object.keys(row)) {
      headers.add(key)
    }
  }
  return [...headers]
}

/** Mapeia colunas da planilha para `produtos` e deduplica por id do ERP/código (última linha vence). */
export function mapProducts (rows: Record<string, unknown>[]) {
  const columns = resolveColumns(headersOf(rows))
  const byKey = new Map<string, MappedProduct>()
  let ignorados = 0
  for (const row of rows) {
    const product = mapProductRow(row, columns)
    if (product) {
      byKey.set(productKey(product), product)
    } else {
      ignorados += 1
    }
  }
  return { columns, products: [...byKey.values()], ignorados }
}

export class ImportProductsUseCase {
  constructor (private ctx: DirectusContext) {}

  async execute (input: ImportProductsInput): Promise<ImportProductsOutput> {
    const { columns, products, ignorados } = mapProducts(input.rows)
    if (!columns.mapping.codigo) {
      throw new AppError(
        'Coluna de código não encontrada. Cabeçalhos aceitos: Código, Cod, Referência, SKU, Part Number…',
        400,
        'INVALID_REQUEST',
      )
    }

    const services = await createServices(this.ctx)
    const repo = new DirectusProductRepository(services.items)
    const { created, updated } = await repo.upsert(products, input.fonte?.trim() || 'Planilha')

    return {
      recebidos: input.rows.length,
      criados: created,
      atualizados: updated,
      ignorados,
      mapeamento: columns.mapping as Record<string, string>,
      colunasExtras: columns.unmapped,
    }
  }
}
