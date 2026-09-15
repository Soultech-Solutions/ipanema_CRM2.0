import type { ClienteComercialRow, PeriodoComercial } from '@/types/base-comercial'
import { parseColumnHeader } from '@/types/base-comercial'
import * as XLSX from 'xlsx'

function toNumber (value: unknown): number {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const asUs = String(value).replace(/,/g, '')
  const n = Number(asUs)
  return Number.isFinite(n) ? n : 0
}

function toDateIso (value: unknown): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString()
    }
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function rowToCliente (row: Record<string, unknown>): ClienteComercialRow | null {
  const mensal: Record<string, PeriodoComercial> = {}
  const anual: Record<string, PeriodoComercial> = {}
  const fixed: Record<string, unknown> = {}

  for (const [header, raw] of Object.entries(row)) {
    const parsed = parseColumnHeader(header)
    if (!parsed) continue

    if (parsed.kind === 'fixed') {
      fixed[parsed.field] = raw
      continue
    }

    const bucket = parsed.kind === 'monthly' ? mensal : anual
    if (!bucket[parsed.key]) bucket[parsed.key] = { cotado: 0, realizado: 0 }
    bucket[parsed.key][parsed.tipo] = toNumber(raw)
  }

  // Linha vazia / lixo de rodapé: sem código nem razão social, descarta
  if (!fixed.codCliente && !fixed.razaoSocial) return null

  return {
    codCliente: String(fixed.codCliente ?? '').trim(),
    razaoSocial: String(fixed.razaoSocial ?? '').trim(),
    segmento: String(fixed.segmento ?? 'NÃO CADASTRADO').trim(),
    vendedor: String(fixed.vendedor ?? 'SEM VENDEDOR').trim(),
    representante: String(fixed.representante ?? 'SEM CAD').trim(),
    ultimaCompra: toDateIso(fixed.ultimaCompra),
    dataCadastro: toDateIso(fixed.dataCadastro),
    status: String(fixed.status ?? 'INATIVO').trim().toUpperCase(),
    cidade: String(fixed.cidade ?? '').trim(),
    uf: String(fixed.uf ?? '').trim(),
    tipoEstabelecimento: String(fixed.tipoEstabelecimento ?? '').trim(),
    origemCliente: String(fixed.origemCliente ?? '').trim(),
    mensal,
    anual,
  }
}

export function parseBaseComercialWorkbook (buffer: ArrayBuffer): ClienteComercialRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: null,
    raw: true,
  })

  const clientes: ClienteComercialRow[] = []
  for (const row of rows) {
    const cliente = rowToCliente(row)
    if (cliente) clientes.push(cliente)
  }
  return clientes
}

export async function parseBaseComercialFile (file: File | Blob): Promise<ClienteComercialRow[]> {
  const buffer = await file.arrayBuffer()
  return parseBaseComercialWorkbook(buffer)
}

export async function fetchAndParseBaseComercialUrl (url: string): Promise<ClienteComercialRow[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Falha ao carregar planilha (${response.status})`)
  }
  const buffer = await response.arrayBuffer()
  return parseBaseComercialWorkbook(buffer)
}
