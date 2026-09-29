# Extension Directus — Email → Oportunidades

Bundle com:

- **hook** `email-oportunidades-poll`: `schedule(MAIL_POLL_CRON)` que lê a caixa (IMAP ou Office 365) e cria oportunidades;
- **endpoint** `/email-oportunidades`: `GET /health`, `POST /sync`, `POST /emails/:id/reprocess`, `POST /produtos/import`.

Documentação completa: [`docs/EMAIL_OPORTUNIDADES.md`](../../../docs/EMAIL_OPORTUNIDADES.md)

## Desenvolvimento

```bash
cd directus/extensions/email-oportunidades
npm install
npm run type-check
npm run build        # ou: npm run dev (watch)
docker compose restart directus
```

## Estrutura

```
src/
  endpoint/, hook/        entradas do bundle
  application/            casos de uso (ciclo da caixa, reprocessar, importar produtos, montar oportunidade)
  domain/                 prompt, tools, schema da extração, normalização, ranking, aliases de colunas
  infrastructure/         Claude, repositórios Directus, provedores de email, lock Redis, anexos
scripts/test-fixtures.ts  roda o extrator nos .eml de docs/exemplos
```
