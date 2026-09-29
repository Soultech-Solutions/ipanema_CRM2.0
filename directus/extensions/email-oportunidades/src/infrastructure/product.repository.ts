import type { ProductRepository, ProductSearchInput, ProductSummary } from '../domain/types'
import type { ItemsFactory, Query, Row } from './directus'
import { normalizeCode, searchTokens } from '../domain/normalize'
import { type MappedProduct, productKey } from '../domain/product-columns'
import { clampLimit, type RankedProduct, rankProducts, sapCode } from '../domain/ranking'
import { num, str } from './directus'

const FIELDS = ['id', 'codigo', 'codigo_sap', 'descricao', 'marca', 'unidade', 'preco', 'custo', 'estoque', 'atributos']

export function toProductSummary (row: Row): ProductSummary {
  return {
    id: String(row.id),
    codigo: String(row.codigo ?? ''),
    codigo_sap: str(row.codigo_sap),
    descricao: str(row.descricao),
    marca: str(row.marca),
    unidade: str(row.unidade),
    preco: num(row.preco),
    custo: num(row.custo),
    estoque: num(row.estoque),
    atributos: row.atributos && typeof row.atributos === 'object' ? row.atributos as Record<string, unknown> : null,
  }
}

function tokenFilter (token: string): Query {
  const code = normalizeCode(token)
  const sap = sapCode(token)
  return {
    _or: [
      { descricao: { _icontains: token } },
      { codigo: { _icontains: token } },
      { marca: { _icontains: token } },
      ...(code.length >= 3 ? [{ codigo_normalizado: { _contains: code } }] : []),
      ...(sap ? [{ codigo_sap: { _starts_with: sap } }] : []),
    ],
  }
}

export class DirectusProductRepository implements ProductRepository {
  constructor (private items: ItemsFactory) {}

  async search (input: ProductSearchInput): Promise<RankedProduct[]> {
    const limit = clampLimit(input.limit)
    const candidates: ProductSummary[] = []

    const code = normalizeCode(input.codigo)
    const sap = sapCode(input.codigo)
    if (sap) {
      candidates.push(...await this.read({ codigo_sap: { _starts_with: sap } }, limit))
    }
    if (code) {
      candidates.push(...await this.read({ codigo_normalizado: { _eq: code } }, limit * 2))
      if (code.length >= 4) {
        // Cliente às vezes manda o código com sufixos a mais (22320E1KC3TVPB) ou de outro fabricante (NU222ECP)
        const prefixes = [...new Set([code.length - 2, code.length - 3].map(n => code.slice(0, Math.max(4, n))))]
        const found = await Promise.all([
          this.read({ codigo_normalizado: { _contains: code } }, limit * 3),
          ...prefixes.map(prefix => this.read({ codigo_normalizado: { _starts_with: prefix } }, limit * 3)),
        ])
        candidates.push(...found.flat())
      }
    }

    const tokens = input.query ? searchTokens(input.query) : []
    if (tokens.length > 0) {
      candidates.push(...await this.read({ _and: tokens.map(t => tokenFilter(t)) }, limit * 3))
      if (tokens.length > 1) {
        candidates.push(...await this.read({ _or: tokens.map(t => tokenFilter(t)) }, 100))
      }
    }

    if (!code && tokens.length === 0 && input.marca) {
      candidates.push(...await this.read({ marca: { _icontains: input.marca } }, limit))
    }

    return rankProducts(candidates, input, limit)
  }

  async getByIds (ids: string[]): Promise<ProductSummary[]> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) {
      return []
    }
    return this.read({ id: { _in: unique } }, unique.length)
  }

  /** Upsert por `codigo_erp` quando existir, senão por `codigo` (entre os itens sem id do ERP). */
  async upsert (products: MappedProduct[], fonte: string): Promise<{ created: number, updated: number }> {
    let created = 0
    let updated = 0
    const service = this.items('produtos')

    for (let i = 0; i < products.length; i += 200) {
      const chunk = products.slice(i, i + 200)
      const erpCodes = chunk.flatMap(p => p.codigo_erp ? [p.codigo_erp] : [])
      const plainCodes = chunk.flatMap(p => p.codigo_erp ? [] : [p.codigo])
      const filters: Query[] = []
      if (erpCodes.length > 0) {
        filters.push({ codigo_erp: { _in: erpCodes } })
      }
      if (plainCodes.length > 0) {
        filters.push({ _and: [{ codigo: { _in: plainCodes } }, { codigo_erp: { _null: true } }] })
      }
      const existing = await service.readByQuery({
        filter: { _or: filters },
        fields: ['id', 'codigo', 'codigo_erp'],
        limit: -1,
      })
      const idByKey = new Map(existing.map(r => [
        productKey({ codigo: String(r.codigo), codigo_erp: str(r.codigo_erp) }),
        r.id,
      ]))

      const toCreate: Row[] = []
      const toUpdate: Row[] = []
      for (const product of chunk) {
        const data: Row = { ...product, fonte }
        const id = idByKey.get(productKey(product))
        if (id == null) {
          toCreate.push(data)
        } else {
          toUpdate.push({ ...data, id })
        }
      }

      if (toCreate.length > 0) {
        await service.createMany(toCreate)
        created += toCreate.length
      }
      if (toUpdate.length > 0) {
        await service.updateBatch(toUpdate)
        updated += toUpdate.length
      }
    }

    return { created, updated }
  }

  private read (filter: Query, limit: number): Promise<ProductSummary[]> {
    return this.items('produtos')
      .readByQuery({ filter, limit, fields: FIELDS })
      .then(rows => rows.map(row => toProductSummary(row)))
  }
}
