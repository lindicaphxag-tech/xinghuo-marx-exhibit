@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 星火与道路 · 免安装启动（内置服务器）

rem ============================================================
rem  不依赖 Python / Node。使用随包附带的 caddy.exe 起本地服务。
rem  适用于 Windows 10/11 64 位。其他系统请用 启动展馆.bat（需 Python）
rem  或参考 README 的在线版。
rem ============================================================

if not exist "tools\caddy.exe" (
  echo.
  echo  [!] 找不到 tools\caddy.exe，请改用 启动展馆.bat（需要 Python）。
  pause
  exit /b 1
)

set URL=http://127.0.0.1:8790/index.html
netstat -ano | findstr /C:"127.0.0.1:8790" | findstr LISTENING >nul
if not errorlevel 1 (
  echo  服务已在运行，直接打开浏览器...
  start "" "%URL%"
  timeout /t 2 >nul
  exit /b 0
)

echo.
echo   星火与道路 · 工人运动时空叙事
echo   ----------------------------------------------------
echo   地址：%URL%
echo   模式：电影导览 ?tour=1 ／ enter.html ／ assets.html
echo   终端：任意页面加 ?kiosk=1（Esc 退出）
echo   ----------------------------------------------------
echo   关闭本窗口即停止服务。
echo.

start "" "%URL%"
"tools\caddy.exe" run --config "tools\Caddyfile" --adapter caddyfile
pause
