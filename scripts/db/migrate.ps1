param([string]$DatabaseUrl = $env:DATABASE_URL)
$ErrorActionPreference = 'Stop'
if (-not $DatabaseUrl) { throw 'DATABASE_URL is required.' }
$env:DATABASE_URL = $DatabaseUrl
node "$PSScriptRoot\..\db-migrate.mjs"
