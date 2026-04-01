#!/usr/bin/env bash
# deploy.sh — build and (re)start gwchat on the droplet.
#
# Usage:
#   ./deploy.sh
#
# Requirements:
#   - .env file present (copy from .env.example and fill in secrets)
#   - config/medlit.yaml present (or set GWCHAT_CONFIG in .env to another path)
#   - Docker installed
#
# The image is built with NEXT_PUBLIC_BASE_PATH=/chat so it serves correctly
# behind the nginx /chat location block.

set -euo pipefail

IMAGE=gwchat
CONTAINER=gwchat
CONFIG_DIR="$(pwd)/config"

echo "==> Building $IMAGE ..."
docker build --build-arg NEXT_PUBLIC_BASE_PATH=/chat -t "$IMAGE" .

echo "==> Stopping old container (if running) ..."
docker rm -f "$CONTAINER" 2>/dev/null || true

echo "==> Starting $CONTAINER ..."
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  --network host \
  -v "$CONFIG_DIR":/app/config:ro \
  --env-file .env \
  "$IMAGE"

echo "==> Done. gwchat is running on localhost:3000"
echo "    Reload nginx if you haven't already: sudo nginx -s reload"
