import * as XLSX from 'xlsx'

export interface ParsedSheet {
  sheetName: string
  headers: string[]
  rows: Record<string, unknown>[]
}

function decodeText (buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  // Planilhas exportadas pelo Excel em PT-BR costumam vir em Windows-1252
  return utf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(buffer) : utf8
}

/** Células formatadas como % no Excel vêm como fração (0,18); o import espera 18 (igual ao CSV "18%"). */
function normalizePercentCells (sheet: XLSX.WorkSheet) {
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith('!')) {
      continue
    }
    const c = cell as XLSX.CellObject
    if (c.t === 'n' && typeof c.z === 'string' && c.z.includes('%') && typeof c.v === 'number') {
      c.v = Math.round(c.v * 10_000) / 100
      delete c.w
    }
  }
}

/** Primeira linha (entre as 10 iniciais) com pelo menos 2 textos não numéricos. */
function findHeaderRow (matrix: unknown[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const texts = (matrix[i] ?? []).filter(v => typeof v === 'string' && v.trim() && Number.isNaN(Number(v)))
    if (texts.length >= 2) {
      return i
    }
  }
  return 0
}

/**
 * Lê a planilha de produtos (xlsx/xls/csv) e devolve as linhas com os cabeçalhos originais.
 * O mapeamento de colunas é feito no backend (`POST /email-oportunidades/produtos/import`).
 */
export async function parseProductsFile (file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer()
  const isCsv = /\.(?:csv|txt)$/i.test(file.name)

  const wb = isCsv
    ? XLSX.read(decodeText(buffer), { type: 'string', raw: true })
    : XLSX.read(buffer, { type: 'array', cellDates: true })

  const sheetName = wb.SheetNames[0]
  if (!sheetName) {
    throw new Error('Planilha vazia')
  }
  const sheet = wb.Sheets[sheetName]!
  if (!isCsv) {
    normalizePercentCells(sheet)
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false })
  const headerIdx = findHeaderRow(matrix)
  const columns = (matrix[headerIdx] ?? [])
    .map((h, index) => ({ name: String(h ?? '').trim(), index }))
    .filter(c => c.name)
  const headers = columns.map(c => c.name)

  const rows = matrix.slice(headerIdx + 1)
    .filter(r => r.some(v => v !== '' && v != null))
    .map(r => Object.fromEntries(columns.map(({ name, index }) => {
      const v = r[index]
      return [name, v instanceof Date ? v.toISOString().slice(0, 10) : v ?? '']
    })))

  return { sheetName, headers, rows }
}
