import type { ContextRepository } from './context.repository'

export class ToolExecutor {
  constructor (private context: ContextRepository) {}

  async execute (name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'get_dashboard_kpis':
        return { kpis: await this.context.getDashboardKpis() }

      case 'search_clients':
        return {
          clients: await this.context.searchClients({
            query: input.query as string | undefined,
            status: input.status as string | undefined,
            regiao: input.regiao as string | undefined,
            orderBy: input.orderBy as string | undefined,
            order: input.order as 'asc' | 'desc' | undefined,
            limit: input.limit as number | undefined,
          }),
        }

      case 'get_client':
        return {
          client: await this.context.getClient(String(input.clienteId || '')),
        }

      case 'list_alerts':
        return {
          alerts: await this.context.listAlerts({
            unreadOnly: Boolean(input.unreadOnly),
            limit: input.limit as number | undefined,
          }),
        }

      case 'list_recommendations':
        return {
          recommendations: await this.context.listRecommendations({
            prioridade: input.prioridade as string | undefined,
            limit: input.limit as number | undefined,
          }),
        }

      default:
        return { error: `Tool desconhecida: ${name}` }
    }
  }
}
