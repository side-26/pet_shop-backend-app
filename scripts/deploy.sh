#!/usr/bin/env bash
# Run on your Mac from the backend repository root.
set -Eeuo pipefail

VPS_HOST="${VPS_HOST:-root@89.44.240.25}"
REMOTE_DIR="${REMOTE_DIR:-/opt/pet-shop-backend}"
PROJECT="${PROJECT:-backend}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"
LOCAL_DIR="${LOCAL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"

cd "$LOCAL_DIR"
[[ -f .env ]] || { echo 'ERROR: local .env not found' >&2; exit 1; }
[[ -f docker-compose.yaml && -f Dockerfile ]] || { echo 'ERROR: run this from the backend project directory' >&2; exit 1; }
command -v ssh >/dev/null && command -v scp >/dev/null && command -v tar >/dev/null || { echo 'ERROR: ssh, scp and tar are required' >&2; exit 1; }

ARCHIVE="$(mktemp "${TMPDIR:-/tmp}/backend-release.XXXXXXXX.tgz")"
trap 'rm -f "$ARCHIVE"' EXIT

echo '==> Packaging local backend source'
COPYFILE_DISABLE=1 tar \
  --exclude='./.git' --exclude='./node_modules' \
  --exclude='./.env' --exclude='./.env.*' \
  --exclude='._*' --exclude='.DS_Store' \
  --exclude='*.tgz' --exclude='./.next' \
  -czf "$ARCHIVE" -C "$LOCAL_DIR" .

echo '==> Uploading source and local .env'
ssh "$VPS_HOST" 'mkdir -p /tmp/pet-shop-deploy'
scp "$ARCHIVE" "$VPS_HOST:/tmp/pet-shop-deploy/backend-release.tgz"
scp "$LOCAL_DIR/.env" "$VPS_HOST:/tmp/pet-shop-deploy/local.env"

echo '==> Deploying on VPS'
ssh "$VPS_HOST" bash -s -- "$REMOTE_DIR" "$PROJECT" "$HEALTH_TIMEOUT" <<'REMOTE_SCRIPT'
set -Eeuo pipefail
APP_DIR="$1"
PROJECT="$2"
TIMEOUT="$3"
STAGE=/tmp/pet-shop-deploy
CONTAINER=backend-app-1

cd "$APP_DIR"
[[ -f "$STAGE/backend-release.tgz" && -f "$STAGE/local.env" ]] || { echo 'Missing uploaded files' >&2; exit 1; }

# Keep current production environment for recovery before replacing it.
if [[ -f .env.production ]]; then
  cp -p .env.production ".env.production.backup.$(date +%Y%m%d%H%M%S)"
fi

# Overlay uploaded source without touching existing Docker volumes.
tar -xzf "$STAGE/backend-release.tgz" -C "$APP_DIR" --no-same-owner
find "$APP_DIR" -type f \( -name '._*' -o -name '.DS_Store' \) -not -path '*/node_modules/*' -not -path '*/.git/*' -delete
install -m 600 "$STAGE/local.env" "$APP_DIR/.env.production"
rm -f "$STAGE/backend-release.tgz" "$STAGE/local.env"

compose() { docker compose -p "$PROJECT" -f docker-compose.yaml "$@"; }

echo '==> Validating Compose'
compose config --quiet

echo '==> Building backend image'
compose build app

echo '==> Recreating backend app only (MongoDB and Redis untouched)'
compose up -d --no-deps --no-build --force-recreate app

echo "==> Waiting up to ${TIMEOUT}s for healthy status"
start=$SECONDS
while (( SECONDS - start < TIMEOUT )); do
  state="$(docker inspect "$CONTAINER" --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' 2>/dev/null || true)"
  echo "    $state"
  if [[ "$state" == 'running healthy' ]]; then
    echo '==> Testing OpenAPI from inside the container'
    if docker exec "$CONTAINER" node -e "fetch('http://127.0.0.1:3000/openapi.json').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
      echo 'SUCCESS: Backend is healthy and OpenAPI responds successfully.'
      docker inspect "$CONTAINER" --format 'Restarts={{.RestartCount}} Health={{.State.Health.Status}}'
      exit 0
    fi
    break
  fi
  [[ "$state" == exited* || "$state" == dead* ]] && break
  sleep 5
done

echo 'ERROR: Backend failed health/endpoint validation.' >&2
docker logs --tail 80 "$CONTAINER" >&2 || true
docker inspect "$CONTAINER" --format 'Restarts={{.RestartCount}} Status={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{end}}' >&2 || true
exit 1
REMOTE_SCRIPT
