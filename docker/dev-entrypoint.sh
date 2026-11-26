#!/bin/sh
set -eu
cd /app

# Lock sobre el propio directorio: web, tools y e2e comparten el volumen de node_modules.
exec 9<node_modules
flock 9

# El store de pnpm (npm_config_store_dir, en Dockerfile.dev) vive en el mismo volumen que
# node_modules: así pnpm puede usar hardlinks en vez de copiar cada archivo.
lock_hash=$(cat pnpm-lock.yaml pnpm-workspace.yaml package.json | sha256sum | cut -d' ' -f1)
if [ "$(cat node_modules/.bioteam-lock-hash 2>/dev/null || true)" != "$lock_hash" ]; then
  echo "pnpm-lock.yaml cambió: pnpm install"
  CI=true pnpm install --frozen-lockfile
  echo "$lock_hash" > node_modules/.bioteam-lock-hash
fi

# lib/generated/prisma vive en el bind mount. Regenerarlo en cada comando dispararía el
# HMR del dev server, así que solo se hace si cambió el schema o la versión de Prisma.
prisma_hash=$(cat prisma/schema.prisma prisma.config.ts pnpm-lock.yaml | sha256sum | cut -d' ' -f1)
if [ ! -f lib/generated/prisma/client.ts ] ||
  [ "$(cat node_modules/.bioteam-prisma-hash 2>/dev/null || true)" != "$prisma_hash" ]; then
  pnpm exec prisma generate
  echo "$prisma_hash" > node_modules/.bioteam-prisma-hash
fi

exec 9<&-
exec "$@"
