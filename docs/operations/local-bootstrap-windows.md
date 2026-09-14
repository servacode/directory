# Windows bootstrap

From PowerShell at the repository root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\bootstrap.ps1
```

The script requires Node.js 24 LTS, activates pnpm 12.4.1 through Corepack, installs dependencies, and runs every Phase 0 gate.
