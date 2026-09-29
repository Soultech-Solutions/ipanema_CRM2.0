#!/usr/bin/env bash
# Deploy Directus API (+ extensions) to the VPS
#
# Run this from your laptop — it builds the Directus extensions, syncs the
# project over SSH and starts Directus + Redis on the remote host. Postgres is
# either an existing server (DB_HOST=...) or the Compose one (DEPLOY_LOCAL_DB=true).
#
# Usage:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --bootstrap
#   ./scripts/deploy.sh --env-file .env.production
#   ./scripts/deploy.sh --env-file .env.production --frontend       # API + front
#   ./scripts/deploy.sh --env-file .env.production --frontend-only  # só o front
#
# Frontend (--frontend): builds with VITE_DIRECTUS_URL=$PUBLIC_URL and rsyncs
# dist/ to FRONTEND_SSH (default DEPLOY_SSH):FRONTEND_PATH, keeping a tarball
# backup of the previous version in ~/frontend-backups on that host.
#
# Required in .env (or --env-file):
#   DEPLOY_SSH=user@your-vps-ip-or-host
#   DEPLOY_PATH=/opt/ipanema_crm
#   PUBLIC_URL=https://api.your-domain.com
#   DB_USER=... DB_PASSWORD=... DB_DATABASE=... (+ DB_HOST/DB_PORT unless DEPLOY_LOCAL_DB=true)
#   DIRECTUS_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=...

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env"
DO_BOOTSTRAP=0
DO_FRONTEND=0
FRONTEND_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bootstrap)
      DO_BOOTSTRAP=1
      shift
      ;;
    --frontend)
      DO_FRONTEND=1
      shift
      ;;
    --frontend-only)
      DO_FRONTEND=1
      FRONTEND_ONLY=1
      shift
      ;;
    --env-file)
      ENV_FILE="${2:?--env-file requires a path}"
      shift 2
      ;;
    --env-file=*)
      ENV_FILE="${1#*=}"
      shift
      ;;
    -h|--help)
      sed -n '2,24p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is required"
}

need ssh
need rsync
need curl

if [[ ! -f "$ENV_FILE" ]]; then
  die "Env file '$ENV_FILE' not found. Copy .env.production.example and fill credentials."
fi

# shellcheck disable=SC1091
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

: "${DEPLOY_SSH:?Set DEPLOY_SSH in $ENV_FILE (e.g. root@1.2.3.4 or deploy@vps.example.com)}"
: "${DEPLOY_PATH:?Set DEPLOY_PATH in $ENV_FILE (e.g. /opt/ipanema_crm)}"
: "${PUBLIC_URL:?Set PUBLIC_URL in $ENV_FILE (e.g. https://api.your-domain.com)}"
: "${DIRECTUS_SECRET:?Set DIRECTUS_SECRET in $ENV_FILE}"

PUBLIC_URL="${PUBLIC_URL%/}"
DEPLOY_LOCAL_DB="${DEPLOY_LOCAL_DB:-false}"
if [[ "$DEPLOY_LOCAL_DB" == "true" ]]; then
  DB_HOST=database
  DB_PORT=5432
fi

: "${DB_HOST:?Set DB_HOST in $ENV_FILE (existing Postgres host from the VPS/Docker view) or DEPLOY_LOCAL_DB=true}"
: "${DB_PORT:?Set DB_PORT in $ENV_FILE}"
: "${DB_USER:?Set DB_USER in $ENV_FILE}"
: "${DB_PASSWORD:?Set DB_PASSWORD in $ENV_FILE}"
: "${DB_DATABASE:?Set DB_DATABASE in $ENV_FILE}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL in $ENV_FILE}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD in $ENV_FILE}"

DIRECTUS_PORT="${DIRECTUS_PORT:-8083}"
CORS_ORIGIN="${CORS_ORIGIN:-true}"

log "Host port:     ${DIRECTUS_PORT} → container :8055"

SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  # Expand ~ if present
  DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY/#\~/$HOME}"
  [[ -f "$DEPLOY_SSH_KEY" ]] || die "DEPLOY_SSH_KEY not found: $DEPLOY_SSH_KEY"
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
  log "SSH key: $DEPLOY_SSH_KEY"
fi

SSH=(ssh "${SSH_OPTS[@]}" "$DEPLOY_SSH")

RSYNC_RSH='ssh'
for opt in "${SSH_OPTS[@]}"; do
  RSYNC_RSH+=" $(printf '%q' "$opt")"
done

RSYNC=(rsync -az --delete -e "$RSYNC_RSH"
  --exclude '.git/'
  --exclude 'node_modules/'
  # Only skip the Vue app build output — keep extension dist/ (e.g. analista-comercial)
  --exclude '/dist/'
  --exclude '.env'
  --exclude '.env.*'
  --exclude '!.env.production.example'
  --exclude 'directus/uploads/*'
  --exclude 'directus/snapshots/*.yaml'
  --exclude 'directus/snapshots/*.yml'
  --exclude '.cursor/'
  --exclude 'coverage/'
  --exclude 'Untitled'
)

log "Deploy target: ${DEPLOY_SSH}:${DEPLOY_PATH}"
log "Public URL:    ${PUBLIC_URL}"
log "Database:      ${DB_HOST}:${DB_PORT}/${DB_DATABASE} (user=${DB_USER}, compose=${DEPLOY_LOCAL_DB})"

log "Checking SSH access"
"${SSH[@]}" 'echo ok' >/dev/null || die "Cannot SSH to ${DEPLOY_SSH}. Check keys / DEPLOY_SSH."

deploy_frontend() {
  : "${FRONTEND_PATH:?Set FRONTEND_PATH in $ENV_FILE (e.g. /www/wwwroot/site/ipanema_crm2)}"
  need npm
  local target="${FRONTEND_SSH:-$DEPLOY_SSH}"
  local remote_path
  remote_path="$(printf '%q' "${FRONTEND_PATH%/}")"
  local fssh=(ssh "${SSH_OPTS[@]}" "$target")

  log "Building frontend (API: ${PUBLIC_URL})"
  # VITE_DIRECTUS_TOKEN stays empty: the bundle is public and users log in.
  VITE_DIRECTUS_URL="$PUBLIC_URL" VITE_USE_MOCK=false VITE_DIRECTUS_TOKEN='' npm run build

  log "Backing up current frontend on ${target}"
  "${fssh[@]}" bash -s <<BACKUP
set -euo pipefail
mkdir -p ${remote_path} ~/frontend-backups
if [ -n "\$(ls -A ${remote_path})" ]; then
  tar -czf ~/frontend-backups/\$(basename ${remote_path})-\$(date +%Y%m%d%H%M%S).tar.gz --exclude='*.zip' -C ${remote_path} .
fi
BACKUP

  log "Syncing dist/ to ${target}:${FRONTEND_PATH}"
  rsync -az --delete --exclude '*.zip' -e "$RSYNC_RSH" dist/ "${target}:${FRONTEND_PATH%/}/"

  if [[ -n "${FRONTEND_OWNER:-}" ]]; then
    "${fssh[@]}" "chown -R $(printf '%q' "$FRONTEND_OWNER") ${remote_path}"
  fi
}

if [[ "$FRONTEND_ONLY" -eq 1 ]]; then
  deploy_frontend
  log "Frontend deploy complete"
  exit 0
fi

if [[ "${SKIP_EXTENSION_BUILD:-false}" != "true" ]]; then
  need npm
  log "Building Directus extensions"
  npm run extension:install --silent
  npm run extension:build --silent
fi

log "Ensuring remote directory exists"
"${SSH[@]}" "mkdir -p $(printf '%q' "$DEPLOY_PATH")/directus/uploads $(printf '%q' "$DEPLOY_PATH")/directus/extensions $(printf '%q' "$DEPLOY_PATH")/directus/snapshots"

log "Syncing project files to VPS"
"${RSYNC[@]}" ./ "${DEPLOY_SSH}:${DEPLOY_PATH}/"

# Quote values for Docker Compose .env (keeps # ! @ $ & etc. intact)
env_quote() {
  local v=${1-}
  v=${v//\\/\\\\}
  v=${v//\"/\\\"}
  v=${v//\$/\\$}
  printf '"%s"' "$v"
}

log "Writing remote .env (production)"
REMOTE_ENV="$(cat <<EOF
VITE_DIRECTUS_URL=$(env_quote "$PUBLIC_URL")
VITE_USE_MOCK=false
PUBLIC_URL=$(env_quote "$PUBLIC_URL")
DIRECTUS_PORT=$(env_quote "$DIRECTUS_PORT")
CORS_ORIGIN=$(env_quote "$CORS_ORIGIN")
DIRECTUS_SECRET=$(env_quote "$DIRECTUS_SECRET")
ADMIN_EMAIL=$(env_quote "$ADMIN_EMAIL")
ADMIN_PASSWORD=$(env_quote "$ADMIN_PASSWORD")
DB_HOST=$(env_quote "$DB_HOST")
DB_PORT=$(env_quote "$DB_PORT")
DB_USER=$(env_quote "$DB_USER")
DB_PASSWORD=$(env_quote "$DB_PASSWORD")
DB_DATABASE=$(env_quote "$DB_DATABASE")
ANTHROPIC_API_KEY=$(env_quote "${ANTHROPIC_API_KEY:-}")
ANTHROPIC_MODEL=$(env_quote "${ANTHROPIC_MODEL:-claude-sonnet-4-5-20250929}")
ANTHROPIC_MAX_TOKENS=$(env_quote "${ANTHROPIC_MAX_TOKENS:-2048}")
ANALISTA_MAX_TOOL_ROUNDS=$(env_quote "${ANALISTA_MAX_TOOL_ROUNDS:-6}")
ANALISTA_ENABLED=$(env_quote "${ANALISTA_ENABLED:-true}")
EOF
)"

# Email → Oportunidades (só repassa o que estiver definido no env file)
EMAIL_VARS=(
  EMAIL_INGEST_ENABLED MAIL_PROVIDER MAIL_POLL_CRON MAIL_BATCH_SIZE MAIL_PROCESSED_FOLDER
  EMAIL_MAX_ATTACHMENTS EMAIL_MAX_ATTACHMENT_MB EMAIL_PRICE_MARKUP_PCT
  EMAIL_EXTRACTOR_MODEL EMAIL_EXTRACTOR_MAX_TOKENS EMAIL_EXTRACTOR_MAX_TOOL_ROUNDS
  IMAP_HOST IMAP_PORT IMAP_SECURE IMAP_USER IMAP_PASSWORD IMAP_FOLDER
  O365_TENANT_ID O365_CLIENT_ID O365_CLIENT_SECRET O365_MAILBOX O365_FOLDER
)
for var in "${EMAIL_VARS[@]}"; do
  if [[ -n "${!var:-}" ]]; then
    REMOTE_ENV+=$'\n'"${var}=$(env_quote "${!var}")"
  fi
done
"${SSH[@]}" "cat > $(printf '%q' "$DEPLOY_PATH")/.env" <<<"$REMOTE_ENV"

log "Starting Directus + Redis on VPS"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
cd $(printf '%q' "$DEPLOY_PATH")

command -v docker >/dev/null 2>&1 || { echo "Docker is not installed on the VPS"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose is not available on the VPS"; exit 1; }

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

if [[ "${DEPLOY_LOCAL_DB}" == "true" ]]; then
  COMPOSE+=(--profile prod-db)
  echo "==> Starting Compose Postgres"
  "\${COMPOSE[@]}" pull database
  "\${COMPOSE[@]}" up -d --wait database
fi

echo "==> Pulling images"
"\${COMPOSE[@]}" pull cache directus

echo "==> Recreating cache + directus (applies port / env changes)"
# --force-recreate is required for host port binding changes to take effect
"\${COMPOSE[@]}" up -d --remove-orphans --force-recreate cache directus

# Stop Compose Postgres if it was left running from an older deploy
if [[ "${DEPLOY_LOCAL_DB}" != "true" ]] && "\${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx database; then
  echo "==> Stopping Compose database (using external Postgres)"
  "\${COMPOSE[@]}" stop database >/dev/null 2>&1 || true
fi

echo "==> Published ports"
"\${COMPOSE[@]}" port directus 8055 || true

echo "==> Waiting for Directus health"
for i in \$(seq 1 60); do
  if "\${COMPOSE[@]}" exec -T directus wget --spider -q http://127.0.0.1:8055/server/ping 2>/dev/null; then
    echo "Directus is healthy"
    break
  fi
  if [[ "\$i" -eq 60 ]]; then
    "\${COMPOSE[@]}" logs --tail 100 directus || true
    echo "Directus did not become healthy — check DB_HOST / credentials / pg_hba.conf" >&2
    exit 1
  fi
  sleep 2
done

"\${COMPOSE[@]}" ps
REMOTE

if [[ "$DO_BOOTSTRAP" -eq 1 ]]; then
  need node
  log "Bootstrapping collections against ${PUBLIC_URL}"
  DIRECTUS_URL="$PUBLIC_URL" \
  ADMIN_EMAIL="$ADMIN_EMAIL" \
  ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  node scripts/bootstrap-directus.mjs
fi

log "Smoke check"
LOCAL_CODE="$("${SSH[@]}" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${DIRECTUS_PORT}/server/ping" || true)"
[[ "$LOCAL_CODE" == "200" ]] || die "VPS local ping failed (HTTP ${LOCAL_CODE})"

PUBLIC_CODE="$(curl -s -o /dev/null -w '%{http_code}' "${PUBLIC_URL}/server/ping" || true)"
if [[ "$PUBLIC_CODE" == "200" ]]; then
  echo "Public URL OK: ${PUBLIC_URL}/server/ping"
else
  echo "WARN: ${PUBLIC_URL}/server/ping returned HTTP ${PUBLIC_CODE:-n/a}"
  echo "      Directus is up on the VPS (:${DIRECTUS_PORT}). Configure reverse proxy + DNS/TLS if needed."
fi

if [[ "$DO_FRONTEND" -eq 1 ]]; then
  deploy_frontend
fi

log "Deploy complete"
echo
echo "Admin UI:  ${PUBLIC_URL}"
echo "API ping:  ${PUBLIC_URL}/server/ping"
echo "On VPS:    http://127.0.0.1:${DIRECTUS_PORT}"
echo "SSH:       ssh ${DEPLOY_SSH}"
echo "Path:      ${DEPLOY_PATH}"
