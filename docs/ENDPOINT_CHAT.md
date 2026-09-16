# ENDPOINT_CHAT — Analista Comercial (Directus + Anthropic Claude)

Especificação técnica completa para implementar o endpoint de chat do **Ipanema CRM 2.0**.

O documento é o guia de implementação do backend. O front já consome o contrato em:

- Rota UI: `/analista` → `src/views/AnalystChatView.vue`
- Cliente HTTP: `src/api/analyst.ts` → `POST /analista-comercial/ask`
- Tipos: `src/types/analyst.ts`
- Regras de negócio: `docs/REGRAS_NEGOCIO.md`

---

## 1. Objetivo

Expor um endpoint autenticado no Directus que:

1. Recebe a **pergunta** do usuário (e histórico opcional via `conversationId`)
2. Monta **contexto factual** a partir das collections do Directus (`clientes`, `dashboard_kpis`, `alertas`, `recomendacoes`, `ctes`, …)
3. Envia a pergunta + contexto/tools para a **API Anthropic (Claude)**
4. Devolve resposta estruturada (`answer`, `sources`, `suggestedActions`) para a UI

### Princípios

| Princípio | Aplicação |
|-----------|-----------|
| Grounding | Claude só afirma o que veio do banco / tools |
| Separação de responsabilidades | HTTP → Application → Domain → Infrastructure |
| Segurança | Auth Directus + API key Anthropic só no servidor |
| Observabilidade | Log de latência, tokens, conversationId, erros |
| Evolução | Tools pluggable; troca de modelo sem mudar o contrato do front |

---

## 2. Arquitetura proposta

### 2.1 Visão geral

```
┌──────────────┐     POST /analista-comercial/ask      ┌─────────────────────────────┐
│  Vue Front   │ ─────────────────────────────────────►│  Directus Extension          │
│  /analista   │◄─────────────────────────────────────│  (endpoint custom)           │
└──────────────┘           JSON response               └──────────────┬──────────────┘
                                                                      │
                         ┌────────────────────────────────────────────┼────────────────┐
                         │                                            ▼                │
                         │  Application Layer                                         │
                         │  AskAnalystUseCase                                         │
                         │    1. validate request                                     │
                         │    2. load/create conversation                             │
                         │    3. retrieve context (RAG leve / aggregations)           │
                         │    4. run Claude agent (optional tools)                    │
                         │    5. persist messages + return DTO                        │
                         │                                                            │
                         │         ┌──────────────┐         ┌─────────────────────┐   │
                         │         │ ContextRepo  │────────►│ Directus SDK / SQL  │   │
                         │         └──────────────┘         └─────────────────────┘   │
                         │         ┌──────────────┐         ┌─────────────────────┐   │
                         │         │ LlmGateway   │────────►│ Anthropic Messages  │   │
                         │         └──────────────┘         └─────────────────────┘   │
                         └────────────────────────────────────────────────────────────┘
```

### 2.2 Onde hospedar no Directus

**Recomendação:** Directus **Endpoint Extension** (TypeScript) em:

```
directus/extensions/analista-comercial/
├── package.json
├── src/
│   ├── index.ts                 # registra rotas
│   ├── routes/ask.ts
│   ├── application/
│   │   └── ask-analyst.use-case.ts
│   ├── domain/
│   │   ├── types.ts
│   │   ├── prompts.ts
│   │   └── tools.ts             # schemas das tools
│   ├── infrastructure/
│   │   ├── anthropic.client.ts
│   │   ├── context.repository.ts
│   │   └── conversation.repository.ts
│   └── http/
│       ├── dto.ts
│       └── map-error.ts
└── tsconfig.json
```

Alternativa (microserviço externo): Node/Fastify atrás do Directus com `accountability` via token — útil se o volume de chat crescer. O **contrato HTTP permanece o mesmo**.

---

## 3. Contrato HTTP (obrigatório — alinhado ao front)

### 3.1 Endpoint

| Item | Valor |
|------|--------|
| Método | `POST` |
| Path | `/analista-comercial/ask` |
| Auth | Bearer token Directus (usuário logado) |
| Content-Type | `application/json` |

> O axios do front usa `baseURL = VITE_DIRECTUS_URL` e path `/analista-comercial/ask`.

### 3.2 Request

```json
{
  "question": "Quais clientes possuem maior risco de perda?",
  "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "context": {
    "clienteId": "cli-cliente-83347"
  }
}
```

| Campo | Tipo | Obrigatório | Regras |
|-------|------|-------------|--------|
| `question` | string | sim | 1–2000 chars, trim, sem HTML |
| `conversationId` | uuid \| string | não | Se omitido, criar nova conversa |
| `context.clienteId` | string | não | Escopo opcional a um cliente |

### 3.3 Response 200

```json
{
  "answer": "Com base na carteira…",
  "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "sources": [
    { "type": "cliente", "id": "cli-cliente-83347", "label": "CLIENTE 83347" },
    { "type": "kpi", "label": "Receita em risco" }
  ],
  "suggestedActions": [
    {
      "label": "Ver CLIENTE 83347",
      "route": "/clientes/cli-cliente-83347",
      "prioridade": "alta"
    }
  ],
  "model": "claude-sonnet-4-5-20250929",
  "latencyMs": 1840
}
```

| Campo | Tipo | Notas |
|-------|------|--------|
| `answer` | string | Markdown leve (`**bold**`, listas, `_itálico_`) — o front já renderiza |
| `conversationId` | string | Sempre retornar |
| `sources` | array | `type`: `cliente` \| `kpi` \| `alerta` \| `recomendacao` \| `cte` \| `outro` |
| `suggestedActions` | array | `route` deve ser rota **interna do SPA** |
| `model` | string | Modelo Anthropic usado |
| `latencyMs` | number | Tempo total do use case |

### 3.4 Erros

| HTTP | Código interno | Quando |
|------|----------------|--------|
| 400 | `INVALID_REQUEST` | Validação falhou |
| 401 | `UNAUTHORIZED` | Sem token / inválido |
| 403 | `FORBIDDEN` | Sem permissão `analista.ask` |
| 429 | `RATE_LIMITED` | Limite usuário/tenant |
| 502 | `LLM_UPSTREAM` | Falha Anthropic |
| 504 | `TIMEOUT` | Estouro de timeout |
| 500 | `INTERNAL` | Erro não tratado |

Corpo de erro sugerido:

```json
{
  "errors": [
    {
      "message": "Pergunta inválida",
      "extensions": { "code": "INVALID_REQUEST" }
    }
  ]
}
```

---

## 4. Collections Directus necessárias

### 4.1 Já previstas (dados comerciais)

Ver `docs/REGRAS_NEGOCIO.md` §12:

- `ctes`, `clientes`, `dashboard_kpis`, `insights`, `alertas`, `recomendacoes`, `importacoes`
- Futuro: `vendedores`, `metas`

### 4.2 Novas (chat)

#### `chat_conversations`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | |
| `user_created` | uuid M2O `directus_users` | Dono da conversa |
| `title` | string nullable | Gerado da 1ª pergunta |
| `status` | string | `active` \| `archived` |
| `date_created` | timestamp | |
| `date_updated` | timestamp | |

#### `chat_messages`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | |
| `conversation` | uuid M2O `chat_conversations` | |
| `role` | string | `user` \| `assistant` \| `system` |
| `content` | text | |
| `sources` | json | espelho do response |
| `suggested_actions` | json | |
| `model` | string nullable | |
| `latency_ms` | integer nullable | |
| `token_input` | integer nullable | |
| `token_output` | integer nullable | |
| `date_created` | timestamp | |

**Permissões:** usuário só lê/escreve conversas próprias (`user_created = $CURRENT_USER`).

---

## 5. Fluxo do Use Case (`AskAnalystUseCase`)

```
1. Authenticate (Directus accountability)
2. Validate DTO (zod/joi)
3. Resolve conversation
     - se conversationId: carregar últimas N mensagens (ex.: 12)
     - senão: criar chat_conversations
4. Build system prompt (regras + formato de saída)
5. Build toolset (ver §6)
6. Retrieve baseline context (sempre, barato):
     - dashboard_kpis (1 registro atual)
     - top 10 clientes por receita_em_risco
     - top 10 por receita_potencial
     - alertas não lidos (limit 10)
     - se context.clienteId: detalhe do cliente
7. Call Anthropic Messages API
     - tool loop até stop_reason = end_turn | max_iterations
8. Parse structured output (JSON no fim OU tool `emit_answer`)
9. Persist user + assistant messages
10. Return AnalystAskResponse
```

### Timeouts sugeridos

| Etapa | Timeout |
|-------|---------|
| Context fetch | 3s |
| Anthropic (por round) | 45s |
| Tool query SQL/items | 5s cada |
| Use case total | 60s |

---

## 6. Tools (function calling) do Claude

Usar **tool use** da Anthropic para o modelo buscar dados sob demanda, em vez de mandar a base inteira no prompt.

### 6.1 Catálogo mínimo

#### `get_dashboard_kpis`

Sem parâmetros. Retorna KPIs executivos (CII, saúde, riscos, etc.).

#### `search_clients`

```json
{
  "query": "string opcional (nome/código)",
  "status": "ativo|risco|inativo|null",
  "regiao": "string opcional",
  "orderBy": "receitaEmRisco|receitaPotencial|healthScore|diasSemEmbarque",
  "order": "asc|desc",
  "limit": 10
}
```

#### `get_client`

```json
{ "clienteId": "cli-…" }
```

Retorna cliente + resumo (health, risco, potencial, região, top rotas).

#### `list_alerts`

```json
{ "unreadOnly": true, "limit": 10 }
```

#### `list_recommendations`

```json
{ "prioridade": "alta|media|baixa|null", "limit": 10 }
```

#### `emit_answer` (obrigatória no fim)

Força saída estruturada alinhada ao front:

```json
{
  "answer": "string markdown",
  "sources": [{ "type": "cliente", "id": "…", "label": "…" }],
  "suggestedActions": [{ "label": "…", "route": "/…", "prioridade": "alta" }]
}
```

> Alternativa: pedir JSON final no texto e validar com zod. `emit_answer` reduz parsing frágil.

### 6.2 Regras das tools

1. Nunca expor SQL cru ao modelo — só parâmetros tipados.
2. `limit` máximo = 20.
3. Filtrar por permissões do usuário (policies Directus).
4. Logar cada tool call (nome, args, duração, rows).

---

## 7. Integração Anthropic

### 7.1 API

- SDK oficial: `@anthropic-ai/sdk`
- Endpoint: Messages API
- Modelo sugerido (configurável): `claude-sonnet-4-5-20250929`  
  - Produção “barata”: Haiku para classificação + Sonnet para resposta  
  - POC: só Sonnet

### 7.2 Variáveis de ambiente

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
ANTHROPIC_MAX_TOKENS=2048
ANTHROPIC_TIMEOUT_MS=45000
ANALISTA_MAX_TOOL_ROUNDS=6
ANALISTA_RATE_LIMIT_PER_USER_HOUR=60
```

**Nunca** colocar a key no front (`VITE_*`).

### 7.3 Exemplo de chamada (conceito)

```ts
const response = await anthropic.messages.create({
  model: process.env.ANTHROPIC_MODEL!,
  max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS ?? 2048),
  system: SYSTEM_PROMPT,
  tools: TOOL_DEFINITIONS,
  messages: [
    ...historyAsAnthropicMessages,
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: [
            '## Contexto baseline (JSON)',
            JSON.stringify(baselineContext),
            '',
            '## Pergunta do usuário',
            question,
          ].join('\n'),
        },
      ],
    },
  ],
})
```

### 7.4 Loop de tools

```
while (rounds < MAX) {
  if (stop_reason === 'tool_use') {
    for each tool_use block:
      result = await executeTool(name, input)
      append tool_result messages
    continue messages.create(...)
  }
  break
}
extract emit_answer OR parse final text JSON
```

---

## 8. System prompt (diretrizes)

O system prompt deve ser versionado em `domain/prompts.ts`. Conteúdo mínimo:

1. **Papel:** Analista Comercial virtual da Ipanema rolamentos.
2. **Idioma:** português (Brasil).
3. **Grounding:** só use números vindos das tools/contexto; se faltar dado, diga o que falta.
4. **Escopo:** carteira, CT-es, risco, potencial, alertas, recomendações, CII.
5. **Fora de escopo:** dados pessoais sensíveis, opinião jurídica, inventar vendedores (base LOG FALA não tem).
6. **Formato:** chamar `emit_answer` ao final com markdown leve.
7. **Ações:** `route` sempre path do SPA (`/clientes/:id`, `/recomendacoes`, `/alertas`, `/`).
8. **Tom:** corporativo, objetivo, acionável.

---

## 9. Baseline context (sempre injetar)

Objeto pequeno (~2–8 KB) montado pelo `ContextRepository`:

```ts
type BaselineContext = {
  generatedAt: string
  kpis: {
    saudeCarteira: number
    receitaEmRisco: number
    receitaPotencial: number
    eficienciaComercial: number
    crescimentoSustentavel: number
    cii: number
  }
  stats?: { totalCtes: number, totalClientes: number }
  topRisco: Array<{ id: string, nome: string, regiao?: string, receitaEmRisco: number, healthScore: number }>
  topPotencial: Array<{ id: string, nome: string, receitaPotencial: number }>
  alertasAbertos: Array<{ id: string, titulo: string, severidade: string }>
  scopedClient?: Record<string, unknown> // se context.clienteId
}
```

Isso cobre ~70% das perguntas sem tool round extra.

---

## 10. Segurança

1. **Auth:** exigir `accountability.user` no endpoint.
2. **RBAC:** permission custom `analista-comercial.ask` (role comercial/admin).
3. **Rate limit:** por `user_id` (Redis/Directus cache) — default 60/hora.
4. **Sanitização:** strip HTML da `question`; rejeitar prompts com > 2000 chars.
5. **Segredos:** `ANTHROPIC_API_KEY` só no container Directus / secrets manager.
6. **PII:** não logar conteúdo completo em produção sem retenção definida; mascarar se necessário.
7. **Prompt injection:** system prompt reforça ignorar instruções do usuário que peçam para revelar o system prompt ou inventar dados.
8. **CORS:** já tratado pelo Directus; front usa same origin / URL configurada.

---

## 11. Observabilidade

Log estruturado (JSON) por request:

```json
{
  "event": "analista.ask",
  "conversationId": "…",
  "userId": "…",
  "latencyMs": 1840,
  "model": "…",
  "toolRounds": 2,
  "tools": ["search_clients", "emit_answer"],
  "tokenInput": 3200,
  "tokenOutput": 450,
  "ok": true
}
```

Métricas sugeridas:

- `analista_ask_total` / `analista_ask_errors_total`
- `analista_ask_latency_ms` (histogram)
- `analista_anthropic_tokens` (input/output)

---

## 12. Implementação passo a passo

### Fase 0 — Preparação

1. Criar collections `chat_conversations` e `chat_messages`
2. Configurar env `ANTHROPIC_*`
3. Scaffold extension em `directus/extensions/analista-comercial`

### Fase 1 — Skeleton HTTP

1. Registrar `POST /analista-comercial/ask`
2. Validar body + auth
3. Retornar stub fixo compatível com o front
4. Testar com `VITE_USE_MOCK=false` e Directus no ar

### Fase 2 — Context + Anthropic sem tools

1. Implementar `ContextRepository` (KPIs + tops)
2. Chamar Claude com baseline no user message
3. Pedir JSON final; validar com zod → response DTO
4. Persistir mensagens

### Fase 3 — Tools

1. Registrar tools §6
2. Implementar executors via Directus Items Service / Knex
3. Loop de tool use + `emit_answer`
4. Testes de perguntas canônicas (risco, potencial, prioridade, CII)

### Fase 4 — Produção

1. Rate limit + timeouts
2. Logs/métricas
3. Feature flag `ANALISTA_ENABLED=true`
4. Remover/desligar fallback local do front em produção (opcional)

---

## 13. Esqueleto de código (referência)

### `src/index.ts`

```ts
import { defineEndpoint } from '@directus/extensions-sdk'
import { askHandler } from './routes/ask'

export default defineEndpoint((router, context) => {
  router.post('/ask', askHandler(context))
})
```

> Com o mount da extension `analista-comercial`, o path final fica `/analista-comercial/ask`.

### `askHandler` (resumo)

```ts
export function askHandler(context: EndpointExtensionContext) {
  return async (req, res) => {
    const started = Date.now()
    try {
      if (!req.accountability?.user) {
        return res.status(401).json({ errors: [{ message: 'Unauthorized', extensions: { code: 'UNAUTHORIZED' } }] })
      }

      const input = parseAskRequest(req.body) // zod
      const useCase = new AskAnalystUseCase(context)
      const result = await useCase.execute({
        ...input,
        userId: req.accountability.user,
      })

      return res.json({ ...result, latencyMs: Date.now() - started })
    } catch (e) {
      return mapError(res, e)
    }
  }
}
```

---

## 14. Casos de teste (aceitação)

| # | Pergunta | Expectativa |
|---|----------|-------------|
| 1 | Quais clientes possuem maior risco de perda? | Lista top risco com valores; sources tipo `cliente`; actions com `/clientes/:id` |
| 2 | Onde existe maior potencial de crescimento? | Top potencial; cita benchmark |
| 3 | O que deve ser priorizado hoje? | Usa `recomendacoes` alta; link `/recomendacoes` |
| 4 | Como está o CII? | Números iguais aos de `dashboard_kpis` |
| 5 | Quem é o melhor vendedor? | Resposta honesta: dado indisponível na base atual |
| 6 | Invente um cliente X com R$ 1 bi | Modelo deve recusar inventar |
| 7 | conversationId válido + follow-up | Mantém contexto das mensagens anteriores |
| 8 | Sem auth | 401 |
| 9 | question vazia | 400 |

---

## 15. Checklist de pronto para produção

- [ ] Extension buildada e montada no Directus
- [ ] Collections de chat criadas + policies
- [ ] `ANTHROPIC_API_KEY` no ambiente
- [ ] Contrato 100% compatível com `src/types/analyst.ts`
- [ ] Front com `VITE_USE_MOCK=false` e `VITE_DIRECTUS_URL` apontando ao Directus
- [ ] Rate limit ativo
- [ ] Logs sem vazar API key
- [ ] Testes das perguntas canônicas passando
- [ ] Timeout e tratamento 502 documentados para o time de suporte

---

## 16. Relação com o front atual

| Front | Backend |
|-------|---------|
| `askAnalyst()` → `POST /analista-comercial/ask` | Este endpoint |
| Fallback local se 4xx/5xx | Remover em prod ou manter só em dev |
| Chip “Directus” vs “Modo local” | Controlado por `VITE_USE_MOCK` |
| `suggestedActions.route` | Deve ser path SPA válido |

---

## 17. Decisões em aberto (para o time)

1. Um único modelo vs router Haiku→Sonnet  
2. Retenção de `chat_messages` (30/90/365 dias)  
3. Streaming (SSE) na v2 — o front atual ainda é request/response único  
4. Multi-tenant (filial) se houver isolamento por filial no futuro  

---

*Versão 1.0 — alinhada ao front Ipanema CRM 2.0 (jul/2026). Qualquer breaking change no contrato exige atualização simultânea de `src/types/analyst.ts`, `src/api/analyst.ts` e este documento.*
