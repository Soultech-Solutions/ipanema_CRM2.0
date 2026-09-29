# Project Rules

## General
- Follow the existing code style and patterns.
- Use npm for running project commands.
- Keep code in TypeScript unless migration is required.

## Stack
- Framework: Vue 3 + Vite (base path `/ipanema_crm2/`)
- UI Library: Vuetify
- Backend: Directus + Redis (Compose); Postgres local via Compose profile, external on VPS
- Enabled Features: ESLint, Vuetify MCP

## Docker
- `npm run docker:up` — frontend + Directus + Postgres + Redis
- `npm run docker:backend` — local Directus + Compose Postgres + Redis
- `npm run directus:bootstrap` — create collections matching `src/api/directus.ts` (+ chat)
- `npm run extension:install` / `npm run extension:build` — Analista Comercial endpoint + Email → Oportunidades bundle
- Email → Oportunidades: extension `directus/extensions/email-oportunidades` (hook cron + endpoint `/email-oportunidades/*`) reads IMAP/Office 365, extracts quote requests with Claude and creates `oportunidades` (see `docs/EMAIL_OPORTUNIDADES.md`)
- `npm run email:test-fixtures [-- --dry]` — run the extractor against `docs/exemplos/emails/*.eml`
- XLSX import (Base de Dados) syncs to Directus when `VITE_USE_MOCK=false` + `VITE_DIRECTUS_TOKEN`
- `./scripts/deploy.sh --env-file .env.production [--frontend|--frontend-only]` — SSH/rsync deploy Directus (+ extensions, optional Compose Postgres via `DEPLOY_LOCAL_DB=true`) and/or the built front to the VPS
- Production: front `https://wannamaker.com.br/ipanema_crm2/`, API `https://wannamaker.com.br/ipanema_api` (OpenLiteSpeed proxy → `127.0.0.1:8083`, project in `/opt/ipanema_crm`)
- Admin UI: http://localhost:8055 (default `admin@example.com` / `admin123` in `.env`)
- Chat endpoint: `POST /analista-comercial/ask` (needs `ANTHROPIC_API_KEY` in `.env`)
