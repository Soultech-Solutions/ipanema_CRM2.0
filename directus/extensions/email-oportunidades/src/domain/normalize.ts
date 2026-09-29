export function stripAccents (value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036F]/g, '')
}

/** `22320-E1-K`, `22320 e1 k` e `22320E1K` viram `22320E1K`. */
export function normalizeCode (value: unknown): string {
  if (value == null) {
    return ''
  }
  return stripAccents(String(value)).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Cabeçalho de planilha para comparação com aliases. */
export function normalizeHeader (value: unknown): string {
  return stripAccents(String(value ?? ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Converte valores de planilha em número, aceitando formato brasileiro:
 * `R$ 4.280,00` → 4280, `9,25%` → 9.25, `1,234.5` → 1234.5.
 */
export function parseNumber (value: unknown): number | null {
  if (value == null || value === '') {
    return null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  let s = String(value).replace(/R\$|%|\s/gi, '').trim()
  if (!s) {
    return null
  }

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '')
  } else if (hasComma) {
    s = s.replace(',', '.')
  } else if (hasDot && /^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function emailDomain (email: string): string {
  const at = email.lastIndexOf('@')
  return at === -1 ? '' : email.slice(at + 1).toLowerCase()
}

/** Tokens de busca com pelo menos 2 caracteres, sem acentos. */
export function searchTokens (query: string): string[] {
  return stripAccents(query)
    .toLowerCase()
    .split(/[^a-z0-9/.-]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2)
    .slice(0, 8)
}
