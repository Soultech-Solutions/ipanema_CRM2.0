import type Anthropic from '@anthropic-ai/sdk'
import type { AnalystSource, AnalystSuggestedAction } from './types'

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'get_dashboard_kpis',
    description: 'Retorna os KPIs executivos atuais (CII, saúde, risco, potencial, eficiência, crescimento).',
    input_schema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'search_clients',
    description: 'Busca clientes da carteira com filtros e ordenação.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nome ou código parcial do cliente' },
        status: { type: 'string', enum: ['ativo', 'risco', 'inativo'] },
        regiao: { type: 'string' },
        orderBy: {
          type: 'string',
          enum: ['receita_em_risco', 'receita_potencial', 'health_score', 'dias_sem_embarque'],
        },
        order: { type: 'string', enum: ['asc', 'desc'] },
        limit: { type: 'number', minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_client',
    description: 'Detalhe de um cliente por id.',
    input_schema: {
      type: 'object',
      properties: {
        clienteId: { type: 'string' },
      },
      required: ['clienteId'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_alerts',
    description: 'Lista alertas comerciais.',
    input_schema: {
      type: 'object',
      properties: {
        unreadOnly: { type: 'boolean' },
        limit: { type: 'number', minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'list_recommendations',
    description: 'Lista recomendações priorizadas.',
    input_schema: {
      type: 'object',
      properties: {
        prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        limit: { type: 'number', minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'emit_answer',
    description: 'Emite a resposta final estruturada para o front. Chame ao terminar a análise.',
    input_schema: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['cliente', 'kpi', 'alerta', 'recomendacao', 'cte', 'outro'],
              },
              id: { type: 'string' },
              label: { type: 'string' },
            },
            required: ['type', 'label'],
          },
        },
        suggestedActions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              route: { type: 'string' },
              prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
            },
            required: ['label'],
          },
        },
      },
      required: ['answer'],
      additionalProperties: false,
    },
  },
]

export interface EmitAnswerPayload {
  answer: string
  sources?: AnalystSource[]
  suggestedActions?: AnalystSuggestedAction[]
}
