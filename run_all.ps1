Param(
  [int]$WebPort = 5173
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[run_all] $msg" -ForegroundColor Cyan }
function Write-Err($msg) { Write-Host "[run_all][error] $msg" -ForegroundColor Red }
function Write-DebugLog($tag, $msg) { Write-Host ("[{0}] {1}" -f $tag, $msg) -ForegroundColor DarkGray }

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebDir = Join-Path $Root 'apps/web'

# Helper: aggressively kill processes listening on specific ports (fast shutdown)
function Stop-Listeners {
  param(
    [int[]]$Ports
  )
  foreach ($port in $Ports) {
    try {
      $pids = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
      if ($pids) {
        foreach ($procId in $pids) {
          try {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Info ("Killed process {0} listening on :{1}" -f $procId, $port)
          } catch {
            Write-DebugLog 'stop' ("Failed to kill pid {0} on :{1}: {2}" -f $procId, $port, $_.Exception.Message)
          }
        }
      }
    } catch {
      Write-DebugLog 'stop' ("Get-NetTCPConnection failed on :{0}: {1}" -f $port, $_.Exception.Message)
    }
  }
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

# Start web (Vite) in background job
Write-Info "Starting web (Vite) on :$WebPort using $pm"
$webJob = Start-Job -Name 'runall-web' -ScriptBlock {
  Param($WebDir, $Pm, $Port)
  $ErrorActionPreference = 'Stop'
  Set-Location $WebDir
  if ($Pm -eq 'pnpm') {
    pnpm run dev -- --port $Port --strictPort
  } else {
    npm run dev -- --port $Port --strictPort
  }
} -ArgumentList $WebDir, $pm, $WebPort

Write-Info ("Web Job Id: {0}" -f $webJob.Id)

# Early failure detection: if the job exits immediately, surface its output
Start-Sleep -Milliseconds 800
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
    if ($Name -eq 'Web') {
      $webDump = Receive-Job -Name 'runall-web' -Keep -ErrorAction SilentlyContinue | Select-Object -Last 80
      if ($webDump) { Write-Host "[web][recent]" -ForegroundColor DarkGray; $webDump | Out-Host }
    }
  } catch {}
  return $false
}

Write-Info "Waiting for services to be ready..."
[void](Wait-Url -Url ("http://localhost:{0}/" -f $WebPort) -Name 'Web')

Write-Info ("Open Web: http://localhost:{0}/" -f $WebPort)

try {
  Write-Info "Press Enter to stop both services..."
  [void][System.Console]::ReadLine()
}
finally {
  Write-Info "Stopping jobs..."
  try { $global:runallPumpTimer.Stop() } catch {}
  try { Unregister-Event -SourceIdentifier 'runall-pump' -ErrorAction SilentlyContinue } catch {}
  try { $global:runallPumpTimer.Dispose() } catch {}
  # Kill listeners first for fast teardown
  Stop-Listeners -Ports @($WebPort)
  Start-Sleep -Milliseconds 200
  # Then terminate background jobs forcefully if still around
  if ($webJob) {
    try { Stop-Job -Job $webJob -Force -ErrorAction SilentlyContinue } catch {}
    try { Remove-Job -Job $webJob -Force -ErrorAction SilentlyContinue } catch {}
  }
}