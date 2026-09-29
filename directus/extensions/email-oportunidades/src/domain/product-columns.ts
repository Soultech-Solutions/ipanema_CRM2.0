import { normalizeCode, normalizeHeader, parseNumber } from './normalize'

export type ProductField
  = | 'codigo'
    | 'codigo_erp'
    | 'codigo_sap'
    | 'descricao'
    | 'marca'
    | 'unidade'
    | 'preco'
    | 'custo'
    | 'icms'
    | 'pis_cofins'
    | 'estoque'

/** Aliases de cabeçalho (já normalizados: minúsculas, sem acento, só alfanumérico). */
export const PRODUCT_COLUMN_ALIASES: Record<ProductField, string[]> = {
  codigo: [
    'codigo', 'cod', 'cod produto', 'codigo produto', 'codigo do produto', 'cod item',
    'codigo item', 'referencia', 'ref', 'sku', 'part number', 'pn', 'codigo interno',
    'cod conversao', 'codigo conversao',
  ],
  codigo_erp: ['idconversao', 'id conversao', 'id erp', 'codigo erp', 'cod erp', 'id produto', 'id'],
  codigo_sap: ['sap', 'codigo sap', 'cod sap', 'material sap', 'sap material'],
  descricao: [
    'descricao', 'desc', 'descricao produto', 'descricao do produto', 'produto', 'nome',
    'nome produto', 'denominacao',
  ],
  marca: ['marca', 'fabricante', 'brand'],
  unidade: ['unidade', 'un', 'und', 'unid', 'um', 'unidade medida', 'unidade de medida'],
  preco: [
    'preco', 'preco base', 'preco venda', 'preco de venda', 'preco unitario', 'preco tabela',
    'preco lista', 'valor', 'valor unitario', 'vl unitario', 'vlr unit', 'vlr unitario',
  ],
  custo: [
    'custo', 'preco custo', 'preco de custo', 'custo medio', 'custo unitario',
    'ultimaprecocompra', 'ultima preco compra', 'ultimo preco compra', 'preco ultima compra',
  ],
  icms: ['icms', 'aliquota icms', 'icms aliquota'],
  pis_cofins: ['pis cofins', 'piscofins', 'pis e cofins'],
  estoque: [
    'estoque', 'saldo', 'qtd estoque', 'quantidade estoque', 'disponivel', 'saldo estoque',
    'estoqueatual', 'estoque atual',
  ],
}

const NUMERIC_FIELDS = ['preco', 'custo', 'icms', 'pis_cofins', 'estoque'] as const

/** Valores que o ERP usa para "sem informação". */
const EMPTY_MARKERS = new Set(['-', '--', '0001-01-01', '01/01/1900', '1900-01-01'])

export interface MappedProduct {
  codigo: string
  codigo_normalizado: string
  codigo_erp: string | null
  codigo_sap: string | null
  descricao: string | null
  marca: string | null
  unidade: string | null
  preco: number | null
  custo: number | null
  icms: number | null
  pis_cofins: number | null
  estoque: number | null
  atributos: Record<string, unknown> | null
}

export interface ColumnMapping {
  /** campo → cabeçalho original */
  mapping: Partial<Record<ProductField, string>>
  unmapped: string[]
}

export function resolveColumns (headers: string[]): ColumnMapping {
  const mapping: Partial<Record<ProductField, string>> = {}
  const used = new Set<string>()

  for (const field of Object.keys(PRODUCT_COLUMN_ALIASES) as ProductField[]) {
    const aliases = PRODUCT_COLUMN_ALIASES[field]
    const header = headers.find(h => !used.has(h) && aliases.includes(normalizeHeader(h)))
    if (header) {
      mapping[field] = header
      used.add(header)
    }
  }

  return { mapping, unmapped: headers.filter(h => !used.has(h) && h.trim() !== '') }
}

function text (value: unknown): string | null {
  if (value == null) {
    return null
  }
  const s = String(value).trim().replace(/\s+/g, ' ')
  return s && !EMPTY_MARKERS.has(s) ? s : null
}

function attributeValue (value: unknown): unknown {
  return typeof value === 'string' ? text(value) : value ?? null
}

/** Chave de upsert: id do ERP quando a planilha traz, senão o código. */
export function productKey (product: Pick<MappedProduct, 'codigo' | 'codigo_erp'>): string {
  return product.codigo_erp ? `erp:${product.codigo_erp}` : `cod:${product.codigo}`
}

export function mapProductRow (row: Record<string, unknown>, columns: ColumnMapping): MappedProduct | null {
  const get = (field: ProductField) => {
    const header = columns.mapping[field]
    return header ? row[header] : undefined
  }

  const codigo = text(get('codigo'))
  const codigoNormalizado = normalizeCode(codigo)
  if (!codigo || !codigoNormalizado) {
    return null
  }

  const numbers = Object.fromEntries(
    NUMERIC_FIELDS.map(f => [f, parseNumber(get(f))]),
  ) as Record<typeof NUMERIC_FIELDS[number], number | null>
  for (const f of ['preco', 'custo'] as const) {
    if (numbers[f] === 0) {
      numbers[f] = null
    }
  }

  const atributos: Record<string, unknown> = {}
  for (const header of columns.unmapped) {
    const value = attributeValue(row[header])
    if (value != null && value !== '') {
      atributos[header] = value
    }
  }

  return {
    codigo,
    codigo_normalizado: codigoNormalizado,
    codigo_erp: text(get('codigo_erp')),
    codigo_sap: text(get('codigo_sap')),
    descricao: text(get('descricao')),
    marca: text(get('marca')),
    unidade: text(get('unidade'))?.toUpperCase() ?? null,
    ...numbers,
    atributos: Object.keys(atributos).length > 0 ? atributos : null,
  }
}
