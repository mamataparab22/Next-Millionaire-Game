$ErrorActionPreference = 'Stop'

function Info($m) { Write-Host "[run_all_light] $m" -ForegroundColor Cyan }
function Err($m) { Write-Host "[run_all_light][error] $m" -ForegroundColor Red }

$ApiPort = 5177
$WebPort = 5173

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root 'apps/api'
$WebDir = Join-Path $Root 'apps/web'
$ApiVenvDir = Join-Path $ApiDir '.venv'
$ApiPy = Join-Path $ApiVenvDir 'Scripts/python.exe'

# 1) Install deps (always)
# Node deps (root covers apps/web via workspaces)
$pm = $null
if (Get-Command pnpm -ErrorAction SilentlyContinue) { $pm = 'pnpm' }
elseif (Get-Command npm -ErrorAction SilentlyContinue) { $pm = 'npm' }
if (-not $pm) { Err 'Node.js (npm or pnpm) not found'; exit 1 }
Info "Installing JS deps (workspace root) with $pm"
Push-Location $Root
if ($pm -eq 'pnpm') { pnpm install | Out-Host } else { npm install | Out-Host }
Pop-Location

# Ensure app-level web deps as well (covers non-workspace or partial installs)
try {
  $webNodeModules = Join-Path $WebDir 'node_modules'
  if (-not (Test-Path $webNodeModules)) {
    Info 'Installing web app deps (apps/web)'
    Push-Location $WebDir
    if ($pm -eq 'pnpm') { pnpm install | Out-Host } else { npm install | Out-Host }
    Pop-Location
  } else {
    Info 'Web app deps already present (apps/web/node_modules)'
  }
} catch { Err ("Failed installing web deps: {0}" -f $_.Exception.Message) }

# Python deps (venv + editable install)
if (-not (Test-Path $ApiPy)) {
  Info 'Creating API venv'
  Push-Location $ApiDir
  python -m venv .venv
  & $ApiPy -m pip install --upgrade pip setuptools wheel | Out-Host
  if (Test-Path (Join-Path $ApiDir 'requirement.txt')) {
    Info 'Installing API requirements (requirement.txt)'
    & $ApiPy -m pip install -r requirement.txt | Out-Host
  }
  & $ApiPy -m pip install -e . | Out-Host
  Pop-Location
} else {
  Info 'Ensuring API deps installed'
  Push-Location $ApiDir
  if (Test-Path (Join-Path $ApiDir 'requirement.txt')) {
    & $ApiPy -m pip install -r requirement.txt | Out-Host
  }
  & $ApiPy -m pip install -e . | Out-Host
  Pop-Location
}

# 2) Launch API and Web
Info "Starting API on :$ApiPort"
$api = Start-Process -FilePath $ApiPy -ArgumentList @('-m','uvicorn','--app-dir','src','millionaire_api.main:app','--host','0.0.0.0','--port',$ApiPort,'--reload') -WorkingDirectory $ApiDir -PassThru -WindowStyle Minimized

$env:VITE_API_BASE = "http://localhost:$ApiPort"
Info "Starting Web on :$WebPort (VITE_API_BASE=$env:VITE_API_BASE)"
$webCmd = if (Get-Command pnpm -ErrorAction SilentlyContinue) { 'pnpm' } else { 'npm' }
$webArgs = if ($webCmd -eq 'pnpm') { @('run','dev','--','--port',$WebPort,'--strictPort') } else { @('run','dev','--','--port',$WebPort,'--strictPort') }
$web = Start-Process -FilePath $webCmd -ArgumentList $webArgs -WorkingDirectory $WebDir -PassThru -WindowStyle Minimized

# 3) Open browser
$webUrl = "http://localhost:$WebPort/"
Info "Opening $webUrl in default browser"
Start-Process $webUrl | Out-Null

Info ("API PID: {0} | Web PID: {1}" -f $api.Id, $web.Id)
Info 'Press Ctrl+C in this window to stop.'

# Keep the script alive to allow Ctrl+C; forward Ctrl+C to children when possible.
try {
  while ($true) { Start-Sleep -Seconds 60 }
} finally {
  Info 'Stopping processes...'
  try { if (!$api.HasExited) { $api.Kill() } } catch {}
  try { if (!$web.HasExited) { $web.Kill() } } catch {}
}
