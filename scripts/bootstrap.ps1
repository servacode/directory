$ErrorActionPreference = 'Stop'

Write-Host 'Health Directory bootstrap' -ForegroundColor Cyan
$nodeVersion = node --version
Write-Host "Node: $nodeVersion"
$major = [int](($nodeVersion -replace '^v','').Split('.')[0])
if ($major -lt 24) {
  throw 'Node.js 24 LTS or newer compatible release is required.'
}

corepack enable
corepack prepare pnpm@12.4.1 --activate
pnpm --version
pnpm install
pnpm doctor
pnpm verify:foundation
pnpm audit:centralization
pnpm typecheck
pnpm lint
pnpm test
pnpm build
