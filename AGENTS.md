# Project Rules

## General
- Follow the existing code style and patterns.
- Use npm for running project commands.
- Keep code in TypeScript unless migration is required.

## Stack
- Framework: Vue 3 + Vite
- UI Library: Vuetify
- Backend: Directus + Redis (Compose); Postgres local via Compose profile, external on VPS
- Enabled Features: ESLint, Vuetify MCP

## Docker
- `npm run docker:up` — frontend + Directus + Postgres + Redis
- `npm run docker:backend` — local Directus + Compose Postgres + Redis
- `npm run directus:bootstrap` — create collections matching `src/api/directus.ts`
- XLSX import (Base de Dados) syncs to Directus when `VITE_USE_MOCK=false` + `VITE_DIRECTUS_TOKEN`
- `./scripts/deploy.sh --env-file .env.production` — SSH/rsync deploy Directus to the VPS
- Admin UI: http://localhost:8055 (default `admin@example.com` / `admin123` in `.env`)
