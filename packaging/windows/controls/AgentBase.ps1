param(
  [Parameter(Mandatory=$true)]
  [ValidateSet("initialize", "start", "health", "stop")]
  [string]$Command
)

$ErrorActionPreference = "Stop"
$InstallRoot = Split-Path -Parent $PSScriptRoot
$env:AGENT_BASE_APP_ROOT = Join-Path $InstallRoot "app"
$env:AGENT_BASE_NODE = Join-Path $InstallRoot "runtime\node\node.exe"
$env:AGENT_BASE_POSTGRES_BIN = Join-Path $InstallRoot "runtime\postgres\bin"
$env:AGENT_BASE_HOME = Join-Path $env:LOCALAPPDATA "Agent Base"

& $env:AGENT_BASE_NODE (Join-Path $env:AGENT_BASE_APP_ROOT "packages\runtime\dist\agent-base.mjs") $Command
exit $LASTEXITCODE
