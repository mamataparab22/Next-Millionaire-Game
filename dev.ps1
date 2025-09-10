Param(
  [int]$ApiPort = 5177,
  [int]$WebPort = 5173,
  [string]$ViteApiBase
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[dev] $msg" -ForegroundColor Cyan }
function Write-Err($msg) { Write-Host "[dev][error] $msg" -ForegroundColor Red }

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root 'apps/api'
$WebDir = Join-Path $Root 'apps/web'

$ApiVenvActivate = Join-Path $ApiDir '.venv/Scripts/Activate.ps1'
if (-not $ViteApiBase) { $ViteApiBase = "http://localhost:$ApiPort" }

# Detect JS package manager
$pm = $null
if (Get-Command pnpm -ErrorAction SilentlyContinue) { $pm = 'pnpm' }
elseif (Get-Command npm -ErrorAction SilentlyContinue) { $pm = 'npm' }

Write-Info "Starting API (FastAPI) on :$ApiPort"
$backendJob = Start-Job -Name 'millionaire-api' -ScriptBlock {
  Param($ApiDir, $ActivatePath, $Port)
  Set-Location $ApiDir
  if (Test-Path $ActivatePath) { . $ActivatePath }
  python -m uvicorn millionaire_api.main:app --host 0.0.0.0 --port $Port --reload
} -ArgumentList $ApiDir, $ApiVenvActivate, $ApiPort

Write-Info ("API Job Id: {0}" -f $backendJob.Id)

if ($pm) {
  Write-Info "Starting web (Vite) on :$WebPort with VITE_API_BASE=$ViteApiBase using $pm"
  $frontendJob = Start-Job -Name 'millionaire-web' -ScriptBlock {
    Param($WebDir, $Pm, $ApiBase)
    Set-Location $WebDir
    $env:VITE_API_BASE = $ApiBase
    if ($Pm -eq 'pnpm') { pnpm dev }
    else { npm run dev }
  } -ArgumentList $WebDir, $pm, $ViteApiBase
  Write-Info ("Web Job Id: {0}" -f $frontendJob.Id)
} else {
  Write-Err "No npm/pnpm found. Frontend will not start. API continues running."
}

try {
  Write-Info "Press Enter to stop both services..."
  [void][System.Console]::ReadLine()
}
finally {
  Write-Info "Stopping jobs..."
  if ($frontendJob) {
    Stop-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue
    Receive-Job -Job $frontendJob -Keep -ErrorAction SilentlyContinue | Out-Host
    Remove-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue
  }
  if ($backendJob) {
    Stop-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
    Receive-Job -Job $backendJob -Keep -ErrorAction SilentlyContinue | Out-Host
    Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
  }
}
