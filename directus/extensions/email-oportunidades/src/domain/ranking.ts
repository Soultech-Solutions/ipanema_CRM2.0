import type { ProductSearchInput, ProductSummary } from './types'
import { normalizeCode, searchTokens, stripAccents } from './normalize'

export type RankedProduct = ProductSummary & { score: number }

/** Código de material SAP (só dígitos, 6+) — clientes como Vale/Suzano pedem por ele. */
export function sapCode (value: unknown): string | null {
  const s = value == null ? '' : String(value).trim()
  return /^\d{6,18}$/.test(s) ? s : null
}

function haystackOf (product: ProductSummary): string {
  const attrs = product.atributos ? Object.values(product.atributos).join(' ') : ''
  return stripAccents(
    [product.codigo, product.codigo_sap, product.descricao, product.marca, attrs].filter(Boolean).join(' '),
  ).toLowerCase()
}

/** Pontuação usada tanto na busca em memória quanto para ordenar candidatos vindos do Directus. */
export function scoreProduct (product: ProductSummary, input: ProductSearchInput): number {
  let score = 0

  if (input.codigo) {
    const wanted = normalizeCode(input.codigo)
    const code = normalizeCode(product.codigo)
    const sap = sapCode(input.codigo)
    if (sap && product.codigo_sap === sap) {
      score += 100
    } else if (wanted && code) {
      if (code === wanted) {
        score += 100
      } else if (wanted.length >= 4 && (code.startsWith(wanted) || wanted.startsWith(code))) {
        score += 70
      } else if (wanted.length >= 4 && (code.includes(wanted) || wanted.includes(code))) {
        score += 50
      }
    }
  }

  if (input.query) {
    const tokens = searchTokens(input.query)
    if (tokens.length > 0) {
      const hay = haystackOf(product)
      const hayCode = normalizeCode(hay)
      let hits = 0
      for (const token of tokens) {
        if (hay.includes(token)) {
          hits += 1
          score += 10
        } else {
          const tokenCode = normalizeCode(token)
          if (tokenCode.length >= 3 && hayCode.includes(tokenCode)) {
            hits += 1
            score += 8
          }
        }
      }
      if (hits === tokens.length) {
        score += 15
      }
    }
  }

  if (input.marca && score > 0) {
    const marca = stripAccents(input.marca).toLowerCase()
    if (product.marca && stripAccents(product.marca).toLowerCase().includes(marca)) {
      score += 15
    }
  }

  if (!input.codigo && !input.query && input.marca) {
    const marca = stripAccents(input.marca).toLowerCase()
    if (product.marca && stripAccents(product.marca).toLowerCase().includes(marca)) {
      score += 1
    }
  }

  return score
}

export function rankProducts (products: ProductSummary[], input: ProductSearchInput, limit: number): RankedProduct[] {
  const seen = new Set<string>()
  return products
    .filter(p => {
      if (seen.has(p.id)) {
        return false
      }
      seen.add(p.id)
      return true
    })
    .map(p => ({ ...p, score: scoreProduct(p, input) }))
    .filter(p => p.score > 0)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function clampLimit (limit: number | undefined, fallback = 8, max = 15): number {
  const n = Number(limit)
  if (!Number.isFinite(n) || n < 1) {
    return fallback
  }
  return Math.min(Math.floor(n), max)
}
