# raca_analista_comercial

Analista comercial Raça — Vue 3 frontend + Directus backend.

## Stack

- Frontend: Vue 3 + Vite + Vuetify + TypeScript
- Backend: Directus 11 (PostgreSQL + Redis)
- Package manager: npm

## Quick start (Docker)

Runs frontend, Directus, Postgres, and Redis together:

```bash
cp .env.example .env   # if needed
npm run docker:up
npm run directus:bootstrap
```

| Service   | URL                      |
|-----------|--------------------------|
| Frontend  | http://localhost:3000    |
| Directus  | http://localhost:8055    |

Default admin: `admin@example.com` / `admin123` (change in `.env`).

Set `VITE_USE_MOCK=false` in `.env` (and recreate the frontend container) to hit Directus instead of mock data.

## Local frontend + Docker backend

```bash
npm install
npm run docker:backend
npm run directus:bootstrap
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run docker:up` | Start full stack |
| `npm run docker:backend` | Start Directus + DB + Redis only |
| `npm run docker:down` | Stop stack |
| `npm run docker:logs` | Follow compose logs |
| `npm run directus:bootstrap` | Create Directus collections |
| `npm run directus:snapshot` | Export schema snapshot |

## Directus collections

Bootstrap creates collections used by `src/api/directus.ts`:

- `vendedores`, `clientes` (+ `codigo`), `historico_faturamento`, `movimentacoes`
- `insights`, `recomendacoes`, `alertas`
- `dashboard_kpis` (singleton), `ai_modules`, `ctes` (+ `chave`), `importacoes`

After schema changes, re-run:

```bash
npm run directus:bootstrap
# or against production:
DIRECTUS_URL=https://api-raca-comercial.soultech.solutions npm run directus:bootstrap
```

## XLSX import → Directus

With `VITE_USE_MOCK=false` and a write token, **Base de Dados → Upload** parses LOG FALA, runs `cteAnalytics` (REGRAS_NEGOCIO), and batch-syncs into Directus.

1. In Directus Admin → **Settings → Access Tokens**, create a static token (Admin).
2. Set in `.env` / frontend env:

```env
VITE_USE_MOCK=false
VITE_DIRECTUS_URL=https://api-raca-comercial.soultech.solutions
VITE_DIRECTUS_TOKEN=your_static_token
```

3. Upload the Excel in the app — progress shows clear/create batches for `ctes`, `clientes`, KPIs, etc.

## Production deploy (API)

Target: `https://api-raca-comercial.soultech.solutions`

Run **from your laptop** (SSH + rsync to the VPS):

```bash
cp .env.production.example .env.production
# fill DEPLOY_SSH, DEPLOY_PATH, DB_*, DIRECTUS_SECRET, ADMIN_*

./scripts/deploy.sh --env-file .env.production
# first time / schema:
./scripts/deploy.sh --env-file .env.production --bootstrap
```

This syncs the repo to the VPS and starts **Directus + Redis** there. It does **not** start Postgres — set `DB_*` to your existing database.

Point reverse proxy (TLS) at `127.0.0.1:8083` on the VPS (or your `DIRECTUS_PORT`).

## Project structure

- `src/main.ts` — app entry
- `src/api/directus.ts` — Directus API client (mock toggle via `VITE_USE_MOCK`)
- `src/services/cteParser.ts` — Excel → CT-es
- `src/services/cteAnalytics.ts` — KPIs / alerts per REGRAS_NEGOCIO
- `src/services/directusSync.ts` — batch sync after import
- `docker-compose.yml` — full local stack
- `scripts/bootstrap-directus.mjs` — schema bootstrap
- `directus/` — uploads, extensions, snapshots volumes
