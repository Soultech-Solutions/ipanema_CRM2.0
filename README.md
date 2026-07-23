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

- `vendedores`, `clientes`, `historico_faturamento`, `movimentacoes`
- `insights`, `recomendacoes`, `alertas`
- `dashboard_kpis` (singleton), `ai_modules`, `ctes`

## Production deploy (API)

Target: `https://api-raca-comercial.soultech.solutions`

On the server:

```bash
cp .env.production.example .env   # set secrets
./scripts/deploy.sh --bootstrap
# or: npm run deploy:bootstrap
```

Options:

- `./scripts/deploy.sh` — pull images + restart API stack
- `./scripts/deploy.sh --pull` — `git pull --ff-only` then deploy
- `./scripts/deploy.sh --bootstrap` — also run collection bootstrap

Point your reverse proxy (TLS) at `127.0.0.1:8055`.

Production uses your **existing PostgreSQL** — set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_DATABASE` in `.env`. If Postgres is on the same VPS, use `DB_HOST=host.docker.internal`.

## Project structure

- `src/main.ts` — app entry
- `src/api/directus.ts` — Directus API client (mock toggle via `VITE_USE_MOCK`)
- `docker-compose.yml` — full local stack
- `scripts/bootstrap-directus.mjs` — schema bootstrap
- `directus/` — uploads, extensions, snapshots volumes
