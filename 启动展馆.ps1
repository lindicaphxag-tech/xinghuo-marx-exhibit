$ErrorActionPreference = 'Stop'
$AppRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8765
$Url = "http://127.0.0.1:$Port/hall.html"
$Existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $Existing) {
  $Python = (Get-Command python -ErrorAction Stop).Source
  $Server = Start-Process -FilePath $Python -ArgumentList @('-m','http.server',"$Port",'--bind','127.0.0.1','--directory',$AppRoot) -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath (Join-Path $AppRoot '.server.pid') -Value $Server.Id -Encoding ascii
  Start-Sleep -Milliseconds 700
}
Start-Process $Url
Write-Host "展馆已在 $Url 打开。停止服务请运行 停止展馆.ps1。"
