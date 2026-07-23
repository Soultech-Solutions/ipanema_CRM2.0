/**
 * Schema alinhado à base de faturamento Raça
 * (LOG FALA BASE FAT RAÇA — grain: 1 linha = 1 CT-e)
 */
export interface CteDocument {
  tipoDocumento: string
  filial: string
  serie: string
  codigo: string
  tipoCte: TipoCte
  dtCadastro: string
  filFatura: string | null
  numFatura: string | null
  dtVencimento: string | null
  codUnn: string | null
  codCus: string | null
  clienteCodigo: string
  grupoCliente: string
  codItinerario: string
  valor: number
  impostos: number
  munOrigem: string
  ufOrigem: string
  munDestino: string
  ufDestino: string
  codRegiao: string | null
  regiao: string | null
  unidadeNegocio: string
  centroCusto: string
  centroGasto: string
  classificacao: ClassificacaoCarga
  tipoTabela: string
  tabelaFrete: string
  remetente: string
  destinatario: string
  pesoKg: number
  pesoCalc: number | null
  valorPedagio: number | null
  valorMercadoria: number
  dtEntrega: string | null
  fretePeso: number | null
  observacoes: string | null
}

/** Valores observados em TIPO CTE */
export type TipoCte =
  | 'NORMAL'
  | 'DEVOLUÇÃO PARCIAL'
  | 'DEVOLUÇÃO TOTAL'
  | 'REENTREGA'
  | 'REDESPACHO PARCIAL'
  | 'REDESPACHO TOTAL'
  | 'VINCULADO A MULTIMODAL'
  | 'NEGOCIADO'
  | 'SUBCONTRATAÇÃO'
  | 'SUBSTITUTO'
  | 'TRANSF. ACT'
  | string

/** Valores observados em CLASSIFICAÇÃO */
export type ClassificacaoCarga =
  | 'FRACIONADO'
  | 'OPERAÇÃO LOCAL'
  | 'CORTESIA'
  | 'CARRETA'
  | 'COMBINADO'
  | 'BITREM'
  | 'TRUCK'
  | 'SEM CLASSIFICAÇÃO'
  | string

/** Mapeamento coluna Excel → campo tipado (upload / Directus) */
export const CTE_COLUMN_MAP: Record<string, keyof CteDocument> = {
  'TIPO DE DOCUMENTO': 'tipoDocumento',
  'FILIAL': 'filial',
  'SÉRIE': 'serie',
  'CÓDIGO': 'codigo',
  'TIPO CTE': 'tipoCte',
  'DT. CADASTRO': 'dtCadastro',
  'FIL. FATURA': 'filFatura',
  'NÚM. FATURA': 'numFatura',
  'DT. VCTO.': 'dtVencimento',
  'CÓD. UNN': 'codUnn',
  'CÓD. CUS.': 'codCus',
  'CLIENTE': 'clienteCodigo',
  'GRUPO CLIENTE': 'grupoCliente',
  'CÓD. ITINERÁRIO': 'codItinerario',
  'VALOR': 'valor',
  'IMPOSTOS': 'impostos',
  'MUN. ORIGEM': 'munOrigem',
  'UF ORIGEM': 'ufOrigem',
  'MUN. DESTINO': 'munDestino',
  'UF DESTINO': 'ufDestino',
  'CÓD. REGIÃO': 'codRegiao',
  'REGIÃO': 'regiao',
  'UNIDADE NEGÓCIO': 'unidadeNegocio',
  'CENTRO CUSTO': 'centroCusto',
  'CENTRO GASTO': 'centroGasto',
  'CLASSIFICAÇÃO': 'classificacao',
  'TIPO TABELA': 'tipoTabela',
  'TABELA DE FRETE': 'tabelaFrete',
  'REMETENTE': 'remetente',
  'DESTINATÁRIO': 'destinatario',
  'PESO KG': 'pesoKg',
  'PESO CALC.': 'pesoCalc',
  'VALOR PEDÁGIO': 'valorPedagio',
  'VALOR MERCADORIA': 'valorMercadoria',
  'DT. ENTREGA': 'dtEntrega',
  'FRETE PESO': 'fretePeso',
  'OBSERVAÇÕES': 'observacoes',
}

export const TIPOS_CTE_DEVOLUCAO = ['DEVOLUÇÃO PARCIAL', 'DEVOLUÇÃO TOTAL'] as const
export const TIPOS_CTE_REENTREGA = ['REENTREGA'] as const

/** CT-e sem fatura = em aberto (giro) */
export function isCteAberto (cte: Pick<CteDocument, 'numFatura'>): boolean {
  return cte.numFatura == null || cte.numFatura === ''
}

/**
 * Yield comercial R$/ton.
 * Na base, PESO KG vem em gramas (ex.: 2.333.990 → 2,33 ton).
 */
export function calcYieldRsTon (valor: number, pesoKgRaw: number): number {
  const toneladas = pesoKgRaw / 1_000_000
  if (toneladas <= 0) return 0
  return valor / toneladas
}
