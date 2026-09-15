/**
 * Schema alinhado à planilha "Base Teste" — Ipanema Rolamentos
 * (grain: 1 linha = 1 cliente, com cotado/realizado mensal do ano
 * corrente e cotado/realizado anual histórico 2022–2026)
 *
 * Substitui src/types/cte.ts para o novo domínio (venda cotada x
 * realizada), já que a base LOG FALA (CT-e/frete) não se aplica mais
 * ao cliente Ipanema Rolamentos.
 */

export type StatusCliente = 'ATIVO' | 'INATIVO' | string

export interface PeriodoComercial {
  cotado: number
  realizado: number
}

export interface ClienteComercialRow {
  codCliente: string
  razaoSocial: string
  segmento: string
  vendedor: string
  representante: string
  /** ISO date, null se a planilha trouxer vazio */
  ultimaCompra: string | null
  dataCadastro: string | null
  status: StatusCliente
  cidade: string
  uf: string
  tipoEstabelecimento: string
  origemCliente: string
  /** Chave: 'YYYY-MM' (ex.: '2026-01') — meses presentes na planilha */
  mensal: Record<string, PeriodoComercial>
  /** Chave: ano como string (ex.: '2026') — histórico anual */
  anual: Record<string, PeriodoComercial>
}

/** Colunas fixas (não repetidas por mês/ano) da planilha */
export const BASE_COLUMN_MAP: Record<string, keyof Omit<ClienteComercialRow, 'mensal' | 'anual'>> = {
  'Cód. Cliente': 'codCliente',
  'Razao Social': 'razaoSocial',
  Segmento: 'segmento',
  Vendedor: 'vendedor',
  Representante: 'representante',
  'Última Compra': 'ultimaCompra',
  'Data Cadastro': 'dataCadastro',
  STATUS: 'status',
  Cidade: 'cidade',
  UF: 'uf',
  'Tipo Estabelecimento': 'tipoEstabelecimento',
  'Origem Cliente': 'origemCliente',
}

const MESES: Record<string, string> = {
  JAN: '01', FEV: '02', MAR: '03', ABR: '04', MAI: '05', JUN: '06',
  JUL: '07', AGO: '08', SET: '09', OUT: '10', NOV: '11', DEZ: '12',
}

/** Reconhece "Cotado JAN/2026" / "Realizado JAN/2026" (case-insensitive) */
const MONTHLY_RE = /^(Cotado|Realizado)\s+([A-Z]{3})\/(\d{4})$/i

/** Reconhece "COTADO 2022" / "REALIZADO 2022" */
const ANNUAL_RE = /^(COTADO|REALIZADO)\s+(\d{4})$/i

export type ParsedColumn =
  | { kind: 'fixed'; field: keyof Omit<ClienteComercialRow, 'mensal' | 'anual'> }
  | { kind: 'monthly'; tipo: 'cotado' | 'realizado'; key: string }
  | { kind: 'annual'; tipo: 'cotado' | 'realizado'; key: string }

/** Classifica um cabeçalho de coluna da planilha */
export function parseColumnHeader (header: string): ParsedColumn | null {
  const fixed = BASE_COLUMN_MAP[header]
  if (fixed) return { kind: 'fixed', field: fixed }

  const m = header.match(MONTHLY_RE)
  if (m) {
    const [, tipoRaw, mesRaw, ano] = m
    const mes = MESES[mesRaw.toUpperCase()]
    if (mes) {
      return { kind: 'monthly', tipo: tipoRaw.toLowerCase() as 'cotado' | 'realizado', key: `${ano}-${mes}` }
    }
  }

  const a = header.match(ANNUAL_RE)
  if (a) {
    const [, tipoRaw, ano] = a
    return { kind: 'annual', tipo: tipoRaw.toLowerCase() as 'cotado' | 'realizado', key: ano }
  }

  return null
}

export function isAtivo (row: Pick<ClienteComercialRow, 'status'>): boolean {
  return String(row.status).trim().toUpperCase() === 'ATIVO'
}

/** Soma cotado/realizado de um conjunto de períodos (mensal ou anual) */
export function somaPeriodos (periodos: Record<string, PeriodoComercial>): PeriodoComercial {
  let cotado = 0
  let realizado = 0
  for (const p of Object.values(periodos)) {
    cotado += p.cotado
    realizado += p.realizado
  }
  return { cotado, realizado }
}

/** Taxa de conversão 0–1 (realizado / cotado). Se não houve cotação mas houve venda, considera 100%. */
export function taxaConversao (periodo: PeriodoComercial): number {
  if (periodo.cotado <= 0) return periodo.realizado > 0 ? 1 : 0
  return periodo.realizado / periodo.cotado
}
