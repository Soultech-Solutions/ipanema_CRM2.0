import type { ProductSearchInput, ProductSummary } from './types'
import { normalizeCode, searchTokens, stripAccents } from './normalize'

export type RankedProduct = ProductSummary & { score: number }

/**
 * Código de material SAP (6+ dígitos, com ou sem sufixos `-0000-02`) — clientes como Vale/Suzano pedem por ele.
 * O cliente costuma mandar só a raiz (`019006381`) de um material cadastrado como `019006381-0000-02`.
 */
export function sapCode (value: unknown): string | null {
  const s = value == null ? '' : String(value).trim()
  return /^\d{6}[\d-]{0,20}$/.test(s) ? s : null
}

function commonPrefixLength (a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i += 1
  }
  return i
}

function haystackOf (product: ProductSummary): string {
  const attrs = product.atributos ? Object.values(product.atributos).join(' ') : ''
  return stripAccents(
    [product.codigo, product.codigo_sap, product.descricao, product.marca, attrs].filter(Boolean).join(' '),
  ).toLowerCase()
}

function codeScore (product: ProductSummary, codigo: string): number {
  const sap = sapCode(codigo)
  if (sap && product.codigo_sap === sap) {
    return 100
  }
  if (sap && product.codigo_sap?.startsWith(`${sap}-`)) {
    return 90
  }

  const wanted = normalizeCode(codigo)
  const code = normalizeCode(product.codigo)
  if (!wanted || !code) {
    return 0
  }
  if (code === wanted) {
    return 100
  }
  if (wanted.length < 4 || code.length < 4) {
    return 0
  }
  if (code.startsWith(wanted) || wanted.startsWith(code)) {
    return 70
  }
  if (code.includes(wanted) || wanted.includes(code)) {
    return 50
  }
  // Mesma peça com sufixo de outro fabricante (NU 222 ECP x NU222E.TVP2): prefixo mais longo pesa mais.
  // Se a divergência ainda está no bloco numérico (NU222|8 x NU222|E), é outro tamanho de peça.
  const prefix = commonPrefixLength(code, wanted)
  const isDigit = (c: string | undefined) => c != null && c >= '0' && c <= '9'
  const otherSize = isDigit(code[prefix - 1]) && (isDigit(code[prefix]) || isDigit(wanted[prefix]))
  return !otherSize && prefix >= Math.max(5, wanted.length - 3) ? Math.min(45, 30 + prefix * 2) : 0
}

/** Pontuação usada tanto na busca em memória quanto para ordenar candidatos vindos do Directus. */
export function scoreProduct (product: ProductSummary, input: ProductSearchInput): number {
  let score = input.codigo ? codeScore(product, input.codigo) : 0

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
      // Marca só desempata; não pode pôr outra peça da marca pedida à frente de um código equivalente
      score += score >= 70 ? 15 : 3
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
