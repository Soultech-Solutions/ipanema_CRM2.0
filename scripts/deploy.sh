#!/usr/bin/env bash
# Deploy Directus API to api-raca-comercial.soultech.solutions
#
# Uses the VPS existing PostgreSQL (credentials from .env).
# Does NOT start a Postgres container.
#
# Usage (on the server, from the project root):
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --bootstrap   # also create/update collections
#   ./scripts/deploy.sh --pull        # git pull before deploy
#
# Prerequisites:
#   - Docker + Docker Compose
#   - .env configured (copy from .env.production.example)
#   - Existing Postgres reachable from Docker (see DB_HOST)
#   - Reverse proxy terminating TLS for:
#       api-raca-comercial.soultech.solutions → http://127.0.0.1:8055

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PUBLIC_HOST="api-raca-comercial.soultech.solutions"
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
DO_BOOTSTRAP=0
DO_PULL=0

for arg in "$@"; do
  case "$arg" in
    --bootstrap) DO_BOOTSTRAP=1 ;;
    --pull) DO_PULL=1 ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required"
}

need docker
docker compose version >/dev/null 2>&1 || die "Docker Compose is required"

if [[ ! -f .env ]]; then
  if [[ -f .env.production.example ]]; then
    die ".env missing. Copy .env.production.example → .env and set secrets first."
  fi
  die ".env missing. Create one before deploying."
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source .env
set +a

: "${DIRECTUS_SECRET:?Set DIRECTUS_SECRET in .env}"
: "${DB_HOST:?Set DB_HOST in .env (existing Postgres host)}"
: "${DB_PORT:?Set DB_PORT in .env}"
: "${DB_USER:?Set DB_USER in .env}"
: "${DB_PASSWORD:?Set DB_PASSWORD in .env}"
: "${DB_DATABASE:?Set DB_DATABASE in .env}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL in .env}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD in .env}"

export PUBLIC_URL="https://${PUBLIC_HOST}"
log "PUBLIC_URL=${PUBLIC_URL}"
log "DB_HOST=${DB_HOST}:${DB_PORT}/${DB_DATABASE} (user=${DB_USER})"

if [[ "$DO_PULL" -eq 1 ]]; then
  log "Pulling latest git changes"
  git pull --ff-only
fi

log "Pulling Docker images"
"${COMPOSE[@]}" pull cache directus

log "Starting API stack (cache + directus — no Postgres container)"
"${COMPOSE[@]}" up -d --remove-orphans --pull missing cache directus

# Ensure any previously started Compose Postgres is stopped
if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx database; then
  log "Stopping Compose database service (using external Postgres)"
  "${COMPOSE[@]}" stop database >/dev/null 2>&1 || true
fi

log "Waiting for Directus health"
for i in $(seq 1 60); do
  if "${COMPOSE[@]}" exec -T directus wget --spider -q http://127.0.0.1:8055/server/ping 2>/dev/null; then
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    "${COMPOSE[@]}" logs --tail 80 directus || true
    die "Directus did not become healthy in time (check DB_HOST / credentials / pg_hba.conf)"
  fi
  sleep 2
done

if [[ "$DO_BOOTSTRAP" -eq 1 ]]; then
  log "Bootstrapping Directus collections"
  if ! command -v node >/dev/null 2>&1; then
    die "Node.js is required on the host for --bootstrap (or run bootstrap from CI)"
  fi
  DIRECTUS_URL="http://127.0.0.1:${DIRECTUS_PORT:-8055}" \
  ADMIN_EMAIL="$ADMIN_EMAIL" \
  ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  node scripts/bootstrap-directus.mjs
fi

log "Smoke check"
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${DIRECTUS_PORT:-8055}/server/ping" || true)"
[[ "$HTTP_CODE" == "200" ]] || die "Local ping failed (HTTP ${HTTP_CODE})"

PUBLIC_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${PUBLIC_URL}/server/ping" || true)"
if [[ "$PUBLIC_CODE" == "200" ]]; then
  echo "Public URL OK: ${PUBLIC_URL}/server/ping"
else
  echo "WARN: ${PUBLIC_URL}/server/ping returned HTTP ${PUBLIC_CODE:-n/a}"
  echo "      Ensure reverse proxy + DNS/TLS point to this host on port ${DIRECTUS_PORT:-8055}."
fi

log "Deploy complete"
"${COMPOSE[@]}" ps
echo
echo "Admin UI:  ${PUBLIC_URL}"
echo "API ping:  ${PUBLIC_URL}/server/ping"
echo "Local:     http://127.0.0.1:${DIRECTUS_PORT:-8055}"
