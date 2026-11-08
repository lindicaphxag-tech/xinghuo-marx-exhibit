$ErrorActionPreference = 'Stop'
$AppRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PidPath = Join-Path $AppRoot '.server.pid'
if (-not (Test-Path -LiteralPath $PidPath)) { Write-Host '没有本启动脚本创建的服务记录。'; exit 0 }
$ServerId = [int](Get-Content -LiteralPath $PidPath -Raw)
$ProcessInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ServerId" -ErrorAction SilentlyContinue
if ($ProcessInfo -and $ProcessInfo.CommandLine -like '*http.server*' -and $ProcessInfo.CommandLine.Contains($AppRoot)) {
  Stop-Process -Id $ServerId -Force
  Write-Host '展馆本地服务已停止。'
} else { Write-Host '服务进程已不存在或不匹配，未终止其他进程。' }
Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
