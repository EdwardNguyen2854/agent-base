& "$PSScriptRoot\AgentBase.ps1" start
if ($LASTEXITCODE -eq 0) { Start-Process "http://127.0.0.1:3210" }
