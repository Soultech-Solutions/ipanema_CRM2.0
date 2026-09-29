import type { ClientRepository, ClientSearchInput, ClientSummary } from '../domain/types'
import type { ItemsFactory, Query, Row } from './directus'
import { str } from './directus'

const GENERIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'yahoo.com.br',
  'icloud.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'msn.com', 'ig.com.br',
])

/** `compras.vale.com.br` → `vale` (parte que costuma aparecer no nome da empresa). */
export function domainKeyword (domain: string): string | null {
  const clean = domain.toLowerCase().trim()
  if (!clean || GENERIC_DOMAINS.has(clean)) {
    return null
  }
  const parts = clean.split('.').filter(p => !['com', 'br', 'net', 'org', 'ind', 'www', 'gov', 'co'].includes(p))
  const keyword = parts.at(-1)
  return keyword && keyword.length >= 3 ? keyword : null
}

function toSummary (row: Row): ClientSummary {
  const vendedor = row.vendedorId
  return {
    id: String(row.id),
    codigo: str(row.codigo),
    nome: String(row.nome ?? ''),
    vendedorId: vendedor && typeof vendedor === 'object'
      ? str((vendedor as Row).id)
      : str(vendedor),
    vendedorNome: str(row.vendedorNome),
  }
}

export class DirectusClientRepository implements ClientRepository {
  constructor (private items: ItemsFactory) {}

  async find (input: ClientSearchInput): Promise<ClientSummary[]> {
    const terms: string[] = []
    const keyword = input.email_domain ? domainKeyword(input.email_domain) : null
    if (keyword) {
      terms.push(keyword)
    }
    if (input.nome?.trim()) {
      terms.push(input.nome.trim())
    }
    if (terms.length === 0) {
      return []
    }

    const filter: Query = {
      _or: terms.flatMap(term => [
        { nome: { _icontains: term } },
        { grupoCliente: { _icontains: term } },
        { codigo: { _icontains: term } },
      ]),
    }

    const rows = await this.items('clientes').readByQuery({
      filter,
      limit: 10,
      fields: ['id', 'codigo', 'nome', 'vendedorId', 'vendedorNome'],
      sort: ['-receitaAnual'],
    })
    return rows.map(row => toSummary(row))
  }
}
