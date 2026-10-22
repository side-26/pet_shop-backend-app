
#!/usr/bin/env bash

set -euo pipefail

IMAGE="pet-shop-backend:latest"
ARCHIVE="pet-shop-backend.tar.gz"

SERVER="${SERVER:-root@89.44.240.25}"
REMOTE_DIR="/opt/pet-shop/backend"

echo "1. Building production backend image..."

docker buildx build \
  --platform linux/amd64 \
  --tag "$IMAGE" \
  --load \
  .

echo "2. Exporting image..."

docker save "$IMAGE" | gzip > "$ARCHIVE"

echo "3. Uploading image..."

scp "$ARCHIVE" "$SERVER:/opt/$ARCHIVE"

echo "4. Deploying backend..."

ssh "$SERVER" bash -se -- "$ARCHIVE" "$REMOTE_DIR" <<'REMOTE'
set -euo pipefail

ARCHIVE="$1"
REMOTE_DIR="$2"

echo "Loading Docker image..."
docker load -i "/opt/$ARCHIVE"

echo "Changing to backend directory..."
cd "$REMOTE_DIR"

echo "Validating Docker Compose..."
docker compose config --quiet

echo "Recreating backend container..."
docker compose up -d --force-recreate --no-deps app

echo "Checking containers..."
docker compose ps

echo "Checking backend health..."
docker exec pet-shop-frontend node -e "
  fetch('http://app:3000/api/landing/pet-types')
    .then(r => {
      console.log('Backend HTTP status:', r.status);
      if (!r.ok) process.exitCode = 1;
    })
    .catch(e => {
      console.error(e);
      process.exitCode = 1;
    })
"

echo "Removing uploaded archive..."
rm -f "/opt/$ARCHIVE"
REMOTE

echo "5. Cleaning local archive..."
rm -f "$ARCHIVE"

echo "Backend deployment completed successfully!"
