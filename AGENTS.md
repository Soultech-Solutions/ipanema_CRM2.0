# Project Rules

## General
- Follow the existing code style and patterns.
- Use npm for running project commands.
- Keep code in TypeScript unless migration is required.

## Stack
- Framework: Vue 3 + Vite
- UI Library: Vuetify
- Backend: Directus (PostgreSQL + Redis via Docker Compose)
- Enabled Features: ESLint, Vuetify MCP

## Docker
- `npm run docker:up` — frontend + Directus + Postgres + Redis
- `npm run docker:backend` — Directus stack only (use with local `npm run dev`)
- `npm run directus:bootstrap` — create collections matching `src/api/directus.ts`
- `./scripts/deploy.sh` — production API deploy (`api-raca-comercial.soultech.solutions`)
- Admin UI: http://localhost:8055 (default `admin@example.com` / `admin123` in `.env`)
