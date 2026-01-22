#!/bin/sh
set -e

git pull
docker run --rm \
  -v "$PWD/frontend/app":/app \
  -w /app \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/.npm \
  node:20-alpine sh -lc "npm ci --no-audit --no-fund && npm run build"

docker compose up -d --build
