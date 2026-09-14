param([string]$DatabaseUrl = $env:DATABASE_URL)
$ErrorActionPreference = 'Stop'
if ($env:NODE_ENV -eq 'production') { throw 'Refusing to reset a production database.' }
if (-not $DatabaseUrl) { throw 'DATABASE_URL is required.' }
psql $DatabaseUrl -v ON_ERROR_STOP=1 -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
& "$PSScriptRoot\migrate.ps1" -DatabaseUrl $DatabaseUrl
& "$PSScriptRoot\seed.ps1" -DatabaseUrl $DatabaseUrl
Write-Host 'Development database reset complete.'
