
#!/usr/bin/env bash
set -euo pipefail

SERVER="root@89.44.240.25"
REPO_DIR="/opt/pet-shop-backend"
COMPOSE_DIR="/opt/pet-shop-backend"
BRANCH="develope"
IMAGE="petshop-backend:production"

echo "1. Connecting to VPS and deploying backend..."

ssh "$SERVER" bash -s -- \
  "$REPO_DIR" "$COMPOSE_DIR" "$BRANCH" "$IMAGE" <<'REMOTE'
set -euo pipefail

REPO_DIR="$1"
COMPOSE_DIR="$2"
BRANCH="$3"
IMAGE="$4"

echo "2. Pulling latest code..."

cd "$REPO_DIR"
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "3. Building production image..."

docker build -t "$IMAGE" -f Dockerfile .

echo "4. Validating Docker Compose..."

cd "$COMPOSE_DIR"
docker compose config --quiet

if ! docker compose config --images | grep -Fxq "$IMAGE"; then
  echo "ERROR: Compose does not reference $IMAGE"
  exit 1
fi

echo "5. Deploying backend..."

docker compose up \
  -d \
  --no-deps \
  --no-build \
  --force-recreate \
  app

echo "6. Checking deployment..."

docker compose ps app
docker compose logs --tail 50 app

echo "Backend deployment completed!"
REMOTE
