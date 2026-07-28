# Extension Directus — Analista Comercial

Endpoint custom: `POST /analista-comercial/ask`

Especificação: [`docs/ENDPOINT_CHAT.md`](../../../docs/ENDPOINT_CHAT.md)

## Desenvolvimento

```bash
cd directus/extensions/analista-comercial
npm install
npm run build
```

Em watch:

```bash
npm run dev
```

Reinicie o container Directus após o build:

```bash
docker compose restart directus
```

## Healthcheck

`GET /analista-comercial/health`

## Variáveis (no serviço Directus)

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
ANTHROPIC_MAX_TOKENS=2048
ANALISTA_MAX_TOOL_ROUNDS=6
ANALISTA_ENABLED=true
```

## Collections de chat

Criadas via `npm run directus:bootstrap` (`chat_conversations`, `chat_messages`).
