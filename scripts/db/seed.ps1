param([string]$DatabaseUrl = $env:DATABASE_URL)
$ErrorActionPreference = 'Stop'
if (-not $DatabaseUrl) { throw 'DATABASE_URL is required.' }
psql $DatabaseUrl -v ON_ERROR_STOP=1 -f "$PSScriptRoot\..\..\infrastructure\database\seeds\001_core_reference_data.sql"
Write-Host 'Core seed complete.'
