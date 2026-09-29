import type Anthropic from '@anthropic-ai/sdk'

export const EMIT_EXTRACTION = 'emit_extraction'

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description: [
      'Busca produtos no catálogo comercial.',
      'Use `codigo` quando o cliente citar um código/referência (a busca ignora espaços, hífens, pontos e barras)',
      'ou um código de material SAP (só dígitos).',
      'Use `query` para descrição livre (ex.: "rolamento agulha 45x55x20").',
      'Pode combinar com `marca`. Faça várias buscas se necessário.',
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        codigo: { type: 'string', description: 'Código/referência do produto ou código SAP do material' },
        query: { type: 'string', description: 'Palavras da descrição, medidas, tipo de peça' },
        marca: { type: 'string', description: 'Fabricante (FAG, SKF, INA...); no catálogo pode ter sufixo, ex.: "FAG ID-I"' },
        limit: { type: 'number', minimum: 1, maximum: 15 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'find_client',
    description: 'Procura o cliente na carteira pelo domínio do email do remetente e/ou pelo nome da empresa.',
    input_schema: {
      type: 'object',
      properties: {
        email_domain: { type: 'string', description: 'Domínio do remetente, ex.: vale.com' },
        nome: { type: 'string', description: 'Nome ou parte do nome da empresa' },
      },
      additionalProperties: false,
    },
  },
  {
    name: EMIT_EXTRACTION,
    description: 'Emite o resultado final estruturado. Chame exatamente uma vez, ao terminar.',
    input_schema: {
      type: 'object',
      properties: {
        is_quote_request: {
          type: 'boolean',
          description: 'true se o email pede cotação/orçamento/preço de produtos',
        },
        motivo: { type: 'string', description: 'Justificativa curta da classificação' },
        cliente: {
          type: 'object',
          properties: {
            id: { type: ['string', 'null'], description: 'id retornado por find_client, se houver' },
            nome: { type: ['string', 'null'], description: 'Nome da empresa cliente' },
          },
        },
        contato: {
          type: 'object',
          properties: {
            nome: { type: ['string', 'null'] },
            email: { type: ['string', 'null'] },
          },
        },
        prazo_entrega: {
          type: ['string', 'null'],
          description: 'Data no formato AAAA-MM-DD quando explícita; senão texto curto (ex.: "Urgente")',
        },
        itens: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              texto_original: { type: 'string', description: 'Trecho exato do pedido para esse item' },
              quantidade: { type: 'number' },
              unidade: { type: ['string', 'null'] },
              produto_id: {
                type: ['string', 'null'],
                description: 'id do produto do catálogo (de search_products) ou null se não encontrado',
              },
              confianca: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: '1 = código idêntico; ~0.7 = descrição compatível; <0.5 = palpite',
              },
              alternativas: {
                type: 'array',
                items: { type: 'string' },
                description: 'ids de outros produtos candidatos (quando houver dúvida)',
              },
              observacao: { type: ['string', 'null'] },
            },
            required: ['texto_original', 'quantidade', 'produto_id', 'confianca'],
          },
        },
        observacoes: {
          type: ['string', 'null'],
          description: 'Condições pedidas (pagamento, frete, local de entrega) e pontos de atenção',
        },
      },
      required: ['is_quote_request', 'motivo', 'itens'],
    },
  },
]
