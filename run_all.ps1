Param(
  [int]$ApiPort = 5177,
  [int]$WebPort = 5173,
  [string]$ViteApiBase
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[run_all] $msg" -ForegroundColor Cyan }
function Write-Err($msg) { Write-Host "[run_all][error] $msg" -ForegroundColor Red }
function Write-DebugLog($tag, $msg) { Write-Host ("[{0}] {1}" -f $tag, $msg) -ForegroundColor DarkGray }

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir = Join-Path $Root 'apps/api'
$WebDir = Join-Path $Root 'apps/web'

$ApiVenvDir = Join-Path $ApiDir '.venv'
$ApiVenvPython = Join-Path $ApiVenvDir 'Scripts/python.exe'
$ApiEnvPath = Join-Path $ApiDir '.env'

if (-not $ViteApiBase) { $ViteApiBase = "http://localhost:$ApiPort" }

# Surface key configuration before starting
Write-Info "Resolved VITE_API_BASE=$ViteApiBase"
if (Test-Path $ApiEnvPath) {
  try {
    $envLines = Get-Content -Path $ApiEnvPath -ErrorAction Stop | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' }
    $keys = $envLines | ForEach-Object { ($_ -split '=', 2)[0] }
    $llmKeys = $keys | Where-Object { $_ -match '^(LLM_|OPENAI_|AZURE_|ANTHROPIC_|GEMINI_)' }
    if ($llmKeys.Count -gt 0) {
      Write-Info ("API .env found with keys: {0}" -f ($llmKeys -join ', '))
    } else {
      Write-Info "API .env found (no LLM-related keys detected)"
    }
  } catch {
    Write-Err "Failed to read API .env: $($_.Exception.Message)"
  }
} else {
  Write-Info "API .env not found at $ApiEnvPath"
}

# Detect JS package manager
$pm = $null
if (Get-Command pnpm -ErrorAction SilentlyContinue) { $pm = 'pnpm' }
elseif (Get-Command npm -ErrorAction SilentlyContinue) { $pm = 'npm' }

if (-not $pm) {
  Write-Err "No Node.js package manager found (npm or pnpm). Please install Node.js and retry."
  exit 1
}

# Install Node dependencies for workspace (this covers apps/web)
Write-Info "Installing JS dependencies using $pm (workspace root)"
Push-Location $Root
if ($pm -eq 'pnpm') { pnpm install | Out-Host } else { npm install | Out-Host }
Pop-Location

# Ensure Python is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Err "Python 3.10+ is required but not found in PATH. Install Python and retry."
  exit 1
}

# Create venv and install API dependencies
if (-not (Test-Path $ApiVenvPython)) {
  Write-Info "Creating Python virtualenv for API..."
  Push-Location $ApiDir
  python -m venv .venv
  if (-not (Test-Path $ApiVenvPython)) {
    Write-Err "Failed to create virtualenv at $ApiVenvDir"
    Pop-Location
    exit 1
  }
  & $ApiVenvPython -m pip install --upgrade pip setuptools wheel | Out-Host
  & $ApiVenvPython -m pip install -e . | Out-Host
  Pop-Location
} else {
  Write-Info "Using existing API venv; ensuring dependencies installed..."
  Push-Location $ApiDir
  & $ApiVenvPython -m pip install -e . | Out-Host
  Pop-Location
}

# Start API (FastAPI via uvicorn) in background job
Write-Info "Starting API (FastAPI) on :$ApiPort"
$apiJob = Start-Job -Name 'runall-api' -ScriptBlock {
  Param($ApiDir, $PythonExe, $Port)
  Set-Location $ApiDir
  & $PythonExe -m uvicorn --app-dir src millionaire_api.main:app --host 0.0.0.0 --port $Port --reload --log-level debug
} -ArgumentList $ApiDir, $ApiVenvPython, $ApiPort

# Start web (Vite) in background job
Write-Info "Starting web (Vite) on :$WebPort with VITE_API_BASE=$ViteApiBase using $pm"
$webJob = Start-Job -Name 'runall-web' -ScriptBlock {
  Param($WebDir, $Pm, $ApiBase, $Port)
  $ErrorActionPreference = 'Stop'
  $env:VITE_API_BASE = $ApiBase
  Set-Location $WebDir
  if ($Pm -eq 'pnpm') {
    pnpm run dev -- --port $Port --strictPort
  } else {
    npm run dev -- --port $Port --strictPort
  }
} -ArgumentList $WebDir, $pm, $ViteApiBase, $WebPort

Write-Info ("API Job Id: {0}; Web Job Id: {1}" -f $apiJob.Id, $webJob.Id)

# Early failure detection: if a job exits immediately, surface its output
Start-Sleep -Milliseconds 800
$apiState = (Get-Job -Id $apiJob.Id).State
if ($apiState -ne 'Running') {
  Write-Err "API job exited early with state: $apiState"
  Receive-Job -Job $apiJob -Keep -ErrorAction SilentlyContinue | Out-Host
}
$webState = (Get-Job -Id $webJob.Id).State
if ($webState -ne 'Running') {
  Write-Err "Web job exited early with state: $webState"
  Receive-Job -Job $webJob -Keep -ErrorAction SilentlyContinue | Out-Host
}

# Live log pump: stream outputs from both jobs to the console
$global:runallPumpTimer = New-Object Timers.Timer
$global:runallPumpTimer.Interval = 300
$null = Register-ObjectEvent -InputObject $global:runallPumpTimer -EventName Elapsed -SourceIdentifier "runall-pump" -Action {
  try {
    $outA = Receive-Job -Name 'runall-api' -Keep -ErrorAction SilentlyContinue
    if ($outA) { $outA | ForEach-Object { Write-DebugLog 'api' $_ } }
  } catch {}
  try {
    $outW = Receive-Job -Name 'runall-web' -Keep -ErrorAction SilentlyContinue
    if ($outW) { $outW | ForEach-Object { Write-DebugLog 'web' $_ } }
  } catch {}
}
$global:runallPumpTimer.Start()

# Helper: wait for URL readiness
function Wait-Url {
  param(
    [string]$Url,
    [string]$Name,
  [int]$TimeoutSec = 60
  )
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method Get -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
        Write-Info "$Name ready: $Url"
        return $true
      }
    } catch {
      Write-DebugLog $Name ("Waiting on {0}: {1}" -f $Url, $_.Exception.Message)
      Start-Sleep -Milliseconds 400
    }
  }
  Write-Err "$Name did not become ready: $Url (timeout ${TimeoutSec}s)"
  # Dump last lines from job logs for context
  try {
    if ($Name -eq 'API') {
      $apiDump = Receive-Job -Name 'runall-api' -Keep -ErrorAction SilentlyContinue | Select-Object -Last 80
      if ($apiDump) { Write-Host "[api][recent]" -ForegroundColor DarkGray; $apiDump | Out-Host }
    }
    if ($Name -eq 'Web') {
      $webDump = Receive-Job -Name 'runall-web' -Keep -ErrorAction SilentlyContinue | Select-Object -Last 80
      if ($webDump) { Write-Host "[web][recent]" -ForegroundColor DarkGray; $webDump | Out-Host }
    }
  } catch {}
  return $false
}

Write-Info "Waiting for services to be ready..."
[void](Wait-Url -Url ("http://localhost:{0}/health" -f $ApiPort) -Name 'API')
[void](Wait-Url -Url ("http://localhost:{0}/" -f $WebPort) -Name 'Web')

Write-Info ("Open Web: http://localhost:{0}/" -f $WebPort)
Write-Info ("API Health: http://localhost:{0}/health" -f $ApiPort)

try {
  Write-Info "Press Enter to stop both services..."
  [void][System.Console]::ReadLine()
}
finally {
  Write-Info "Stopping jobs..."
  try { $global:runallPumpTimer.Stop() } catch {}
  try { Unregister-Event -SourceIdentifier 'runall-pump' -ErrorAction SilentlyContinue } catch {}
  try { $global:runallPumpTimer.Dispose() } catch {}
  if ($webJob) {
    Stop-Job -Job $webJob -ErrorAction SilentlyContinue
    Receive-Job -Job $webJob -Keep -ErrorAction SilentlyContinue | Out-Host
    Remove-Job -Job $webJob -ErrorAction SilentlyContinue
  }
  if ($apiJob) {
    Stop-Job -Job $apiJob -ErrorAction SilentlyContinue
    Receive-Job -Job $apiJob -Keep -ErrorAction SilentlyContinue | Out-Host
    Remove-Job -Job $apiJob -ErrorAction SilentlyContinue
  }
}
