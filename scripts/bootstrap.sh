#!/usr/bin/env sh
set -eu
major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$major" -lt 24 ]; then
  echo "Node.js 24 LTS or newer compatible release is required." >&2
  exit 1
fi
corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm install
pnpm doctor
pnpm verify:foundation
pnpm audit:centralization
pnpm typecheck
pnpm lint
pnpm test
pnpm build
