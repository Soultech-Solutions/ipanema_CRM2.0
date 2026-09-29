import type { Extraction } from '../domain/extraction'
import type { ClientSummary, MatchStatus, ProductSummary } from '../domain/types'
import { emailDomain } from '../domain/normalize'

/** Abaixo disso o item vai para revisão como "ambíguo". */
export const CONFIDENCE_THRESHOLD = 0.8

export interface OpportunityItemDraft {
  produto: string | null
  texto_original: string
  quantidade: number
  unidade: string | null
  preco_unitario: number | null
  subtotal: number | null
  confianca: number
  status_match: MatchStatus
  alternativas: { id: string, codigo: string, descricao: string | null, preco: number | null }[]
  ordem: number
}

export interface OpportunityDraft {
  opportunity: {
    titulo: string
    cliente: string | null
    cliente_nome: string | null
    contato_nome: string | null
    contato_email: string | null
    etapa: 'novo'
    origem: 'email'
    email: string | null
    prazo_entrega: string | null
    valor_estimado: number
    confianca: number | null
    vendedor: string | null
    observacoes: string | null
  }
  items: OpportunityItemDraft[]
}

function round2 (value: number): number {
  return Math.round(value * 100) / 100
}

export function buildOpportunity (input: {
  extraction: Extraction
  products: Map<string, ProductSummary>
  client: ClientSummary | null
  emailId: string | null
  from: string
  fromName: string | null
  subject: string
}): OpportunityDraft {
  const { extraction, products, client } = input

  const items: OpportunityItemDraft[] = extraction.itens.map((item, index) => {
    const product = item.produto_id ? products.get(item.produto_id) ?? null : null
    const alternativas = item.alternativas
      .filter(id => id !== product?.id)
      .map(id => products.get(id))
      .filter((p): p is ProductSummary => p !== undefined)
      .map(p => ({ id: p.id, codigo: p.codigo, descricao: p.descricao, preco: p.preco }))

    const confianca = product ? item.confianca : 0
    let status: MatchStatus = 'nao_encontrado'
    if (product) {
      status = confianca >= CONFIDENCE_THRESHOLD ? 'encontrado' : 'ambiguo'
    }

    const preco = product?.preco ?? null
    return {
      produto: product?.id ?? null,
      texto_original: item.texto_original,
      quantidade: item.quantidade,
      unidade: item.unidade ?? product?.unidade ?? null,
      preco_unitario: preco,
      subtotal: preco == null ? null : round2(preco * item.quantidade),
      confianca: round2(confianca),
      status_match: status,
      alternativas,
      ordem: index + 1,
    }
  })

  const valor = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0)
  const confiancaMedia = items.length > 0
    ? round2(items.reduce((sum, item) => sum + item.confianca, 0) / items.length)
    : null

  const clienteNome = client?.nome || extraction.cliente.nome || input.fromName || emailDomain(input.from) || input.from
  const titulo = `${clienteNome} • ${input.subject || 'Pedido de orçamento'}`.slice(0, 250)

  return {
    opportunity: {
      titulo,
      cliente: client?.id ?? null,
      cliente_nome: clienteNome,
      contato_nome: extraction.contato.nome ?? input.fromName,
      contato_email: extraction.contato.email ?? input.from,
      etapa: 'novo',
      origem: 'email',
      email: input.emailId,
      prazo_entrega: extraction.prazo_entrega,
      valor_estimado: round2(valor),
      confianca: confiancaMedia,
      vendedor: client?.vendedorId ?? null,
      observacoes: extraction.observacoes,
    },
    items,
  }
}
