import type { BaselineContext, BaselineClientSummary, BaselineKpis } from '../domain/types'

type ItemsServiceFactory = (collection: string) => {
  readByQuery: (query: Record<string, unknown>) => Promise<unknown[]>
  readOne: (id: string, query?: Record<string, unknown>) => Promise<unknown>
}

function asRecord (value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function num (value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function str (value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value)
}

export class ContextRepository {
  constructor (private items: ItemsServiceFactory) {}

  async getBaseline (clienteId?: string): Promise<BaselineContext> {
    const notes: string[] = []

    const kpis = await this.safeReadKpis(notes)
    const topRisco = await this.safeSearchClients({
      orderBy: 'receita_em_risco',
      order: 'desc',
      limit: 10,
    }, notes)
    const topPotencial = await this.safeSearchClients({
      orderBy: 'receita_potencial',
      order: 'desc',
      limit: 10,
    }, notes)
    const alertasAbertos = await this.safeListAlerts({ unreadOnly: true, limit: 10 }, notes)

    let scopedClient: Record<string, unknown> | null = null
    if (clienteId) {
      scopedClient = await this.safeGetClient(clienteId, notes)
    }

    return {
      generatedAt: new Date().toISOString(),
      kpis,
      stats: null,
      topRisco,
      topPotencial,
      alertasAbertos,
      scopedClient,
      notes: notes.length ? notes : undefined,
    }
  }

  async getDashboardKpis () {
    const notes: string[] = []
    return this.safeReadKpis(notes)
  }

  async searchClients (input: {
    query?: string
    status?: string
    regiao?: string
    orderBy?: string
    order?: 'asc' | 'desc'
    limit?: number
  }) {
    const notes: string[] = []
    return this.safeSearchClients(input, notes)
  }

  async getClient (clienteId: string) {
    const notes: string[] = []
    return this.safeGetClient(clienteId, notes)
  }

  async listAlerts (input: { unreadOnly?: boolean, limit?: number }) {
    const notes: string[] = []
    return this.safeListAlerts(input, notes)
  }

  async listRecommendations (input: { prioridade?: string, limit?: number }) {
    const notes: string[] = []
    try {
      const filter: Record<string, unknown> = {}
      if (input.prioridade) filter.prioridade = { _eq: input.prioridade }

      const rows = await this.items('recomendacoes').readByQuery({
        filter: Object.keys(filter).length ? filter : undefined,
        sort: ['-impactoEstimado', '-date_created'],
        limit: Math.min(input.limit ?? 10, 20),
        fields: [
          'id', 'titulo', 'prioridade', 'status', 'acao', 'regiao',
          'clienteId', 'cliente_id', 'clienteNome', 'cliente_nome',
          'impactoEstimado', 'impacto_estimado',
        ],
      })

      return rows.map(row => {
        const r = asRecord(row)
        return {
          id: str(r.id),
          titulo: str(r.titulo),
          prioridade: str(r.prioridade),
          clienteId: str(r.cliente_id || r.clienteId),
          clienteNome: str(r.cliente_nome || r.clienteNome),
          regiao: str(r.regiao) || undefined,
          acao: str(r.acao),
          impactoEstimado: num(r.impacto_estimado ?? r.impactoEstimado),
          status: str(r.status),
        }
      })
    } catch {
      notes.push('Collection recomendacoes indisponível')
      return []
    }
  }

  private async safeReadKpis (notes: string[]): Promise<BaselineKpis | null> {
    try {
      const rows = await this.items('dashboard_kpis').readByQuery({
        limit: 1,
        sort: ['-date_updated', '-date_created'],
        fields: [
          'saude_carteira',
          'receita_em_risco',
          'receita_potencial',
          'eficiencia_comercial',
          'crescimento_sustentavel',
          'cii',
          // camelCase fallbacks if bootstrap used JS names
          'saudeCarteira',
          'receitaEmRisco',
          'receitaPotencial',
          'eficienciaComercial',
          'crescimentoSustentavel',
        ],
      })
      const row = asRecord(rows[0])
      if (!rows[0]) {
        notes.push('Nenhum registro em dashboard_kpis')
        return null
      }
      return {
        saudeCarteira: num(row.saude_carteira ?? row.saudeCarteira),
        receitaEmRisco: num(row.receita_em_risco ?? row.receitaEmRisco),
        receitaPotencial: num(row.receita_potencial ?? row.receitaPotencial),
        eficienciaComercial: num(row.eficiencia_comercial ?? row.eficienciaComercial),
        crescimentoSustentavel: num(row.crescimento_sustentavel ?? row.crescimentoSustentavel),
        cii: num(row.cii),
      }
    } catch {
      notes.push('Collection dashboard_kpis indisponível')
      return null
    }
  }

  private async safeSearchClients (input: {
    query?: string
    status?: string
    regiao?: string
    orderBy?: string
    order?: 'asc' | 'desc'
    limit?: number
  }, notes: string[]): Promise<BaselineClientSummary[]> {
    try {
      const filter: Record<string, unknown> = {}
      if (input.query) {
        filter._or = [
          { nome: { _icontains: input.query } },
          { id: { _icontains: input.query } },
        ]
      }
      if (input.status) filter.status = { _eq: input.status }
      if (input.regiao) filter.regiao = { _icontains: input.regiao }

      const orderMap: Record<string, string> = {
        receita_em_risco: 'receitaEmRisco',
        receita_potencial: 'receitaPotencial',
        health_score: 'healthScore',
        dias_sem_embarque: 'diasSemEmbarque',
      }
      const orderBy = orderMap[input.orderBy || ''] || input.orderBy || 'receitaEmRisco'
      const dir = input.order === 'asc' ? '' : '-'

      const rows = await this.items('clientes').readByQuery({
        filter: Object.keys(filter).length ? filter : undefined,
        sort: [`${dir}${orderBy}`],
        limit: Math.min(input.limit ?? 10, 20),
        fields: [
          'id', 'nome', 'regiao', 'status',
          'health_score', 'healthScore',
          'receita_em_risco', 'receitaEmRisco',
          'receita_potencial', 'receitaPotencial',
          'probabilidade_perda', 'probabilidadePerda',
          'dias_sem_embarque', 'diasSemEmbarque',
        ],
      })

      return rows.map(row => {
        const r = asRecord(row)
        return {
          id: str(r.id),
          nome: str(r.nome),
          regiao: str(r.regiao) || undefined,
          status: str(r.status) || undefined,
          healthScore: num(r.health_score ?? r.healthScore),
          receitaEmRisco: num(r.receita_em_risco ?? r.receitaEmRisco),
          receitaPotencial: num(r.receita_potencial ?? r.receitaPotencial),
          probabilidadePerda: num(r.probabilidade_perda ?? r.probabilidadePerda),
          diasSemEmbarque: num(r.dias_sem_embarque ?? r.diasSemEmbarque),
        }
      })
    } catch {
      notes.push('Collection clientes indisponível')
      return []
    }
  }

  private async safeGetClient (clienteId: string, notes: string[]) {
    try {
      const row = await this.items('clientes').readOne(clienteId)
      return asRecord(row)
    } catch {
      notes.push(`Cliente ${clienteId} não encontrado`)
      return null
    }
  }

  private async safeListAlerts (input: { unreadOnly?: boolean, limit?: number }, notes: string[]) {
    try {
      const filter: Record<string, unknown> = {}
      if (input.unreadOnly) filter.lido = { _eq: false }

      const rows = await this.items('alertas').readByQuery({
        filter: Object.keys(filter).length ? filter : undefined,
        sort: ['-date_created'],
        limit: Math.min(input.limit ?? 10, 20),
        fields: ['id', 'titulo', 'severidade', 'clienteId', 'clienteNome', 'lido'],
      })

      return rows.map(row => {
        const r = asRecord(row)
        return {
          id: str(r.id),
          titulo: str(r.titulo),
          severidade: str(r.severidade),
          clienteId: str(r.clienteId || r.cliente_id) || undefined,
          clienteNome: str(r.clienteNome || r.cliente_nome) || undefined,
        }
      })
    } catch {
      notes.push('Collection alertas indisponível')
      return []
    }
  }
}
