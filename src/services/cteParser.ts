import type { CteDocument } from '@/types/cte'
import { CTE_COLUMN_MAP } from '@/types/cte'
import * as XLSX from 'xlsx'

function toNumber (value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const cleaned = String(value).replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  // Excel may already use US format "904.31" or BR "904,31" or "2,333,990"
  const asUs = String(value).replace(/,/g, '')
  const n = Number(asUs)
  if (Number.isFinite(n)) return n
  const n2 = Number(cleaned)
  return Number.isFinite(n2) ? n2 : 0
}

function toNullableString (value: unknown): string | null {
  if (value == null || value === '') return null
  return String(value).trim()
}

function toDateIso (value: unknown): string {
  if (value == null || value === '') return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0)).toISOString()
    }
  }
  const d = new Date(String(value))
  if (!Number.isNaN(d.getTime())) return d.toISOString()
  return String(value)
}

function rowToCte (row: Record<string, unknown>): CteDocument | null {
  const mapped: Partial<CteDocument> = {}

  for (const [excelCol, field] of Object.entries(CTE_COLUMN_MAP)) {
    const raw = row[excelCol]
    switch (field) {
      case 'valor':
      case 'impostos':
      case 'pesoKg':
      case 'valorMercadoria':
        mapped[field] = toNumber(raw)
        break
      case 'pesoCalc':
      case 'valorPedagio':
      case 'fretePeso':
        mapped[field] = raw == null || raw === '' ? null : toNumber(raw)
        break
      case 'dtCadastro':
        mapped.dtCadastro = toDateIso(raw)
        break
      case 'dtVencimento':
        mapped.dtVencimento = raw == null || raw === '' ? null : toDateIso(raw)
        break
      case 'dtEntrega':
        mapped.dtEntrega = raw == null || raw === '' ? null : toDateIso(raw)
        break
      case 'filFatura':
      case 'numFatura':
      case 'codUnn':
      case 'codCus':
      case 'codRegiao':
      case 'regiao':
      case 'observacoes':
        mapped[field] = toNullableString(raw)
        break
      default:
        mapped[field] = toNullableString(raw) ?? ''
    }
  }

  if (!mapped.clienteCodigo || !mapped.codigo) return null

  return mapped as CteDocument
}

export function parseCteWorkbook (buffer: ArrayBuffer): CteDocument[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: null,
    raw: true,
  })

  const ctes: CteDocument[] = []
  for (const row of rows) {
    const cte = rowToCte(row)
    if (cte) ctes.push(cte)
  }
  return ctes
}

export async function parseCteFile (file: File | Blob): Promise<CteDocument[]> {
  const buffer = await file.arrayBuffer()
  return parseCteWorkbook(buffer)
}

export async function fetchAndParseCteUrl (url: string): Promise<CteDocument[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Falha ao carregar planilha (${response.status})`)
  }
  const buffer = await response.arrayBuffer()
  return parseCteWorkbook(buffer)
}
