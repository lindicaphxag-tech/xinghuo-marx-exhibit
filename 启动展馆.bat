@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
title 星火与道路 · 数字展馆本地服务（关闭本窗口即停止）

where python >nul 2>nul
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 (
    echo.
    echo  [错误] 未检测到 Python。请先安装 Python 3.9+ 并勾选 "Add to PATH"。
    echo  下载地址: https://www.python.org/downloads/
    echo  或用 Node.js：在本目录运行  npx serve .
    echo.
    pause
    exit /b 1
  )
  set "PY=py"
) else (
  set "PY=python"
)

rem 从 8790 起找一个没被占用的端口
set PORT=8790
:tryport
netstat -ano | findstr /C:"127.0.0.1:%PORT%" | findstr LISTENING >nul
if not errorlevel 1 (
  set /a PORT=PORT+1
  if !PORT! gtr 8890 (
    echo  [!] 8790-8890 端口都被占用，请手动运行：%PY% -m http.server 9000
    pause
    exit /b 1
  )
  goto tryport
)

set URL=http://127.0.0.1:%PORT%/index.html

echo.
echo   星火与道路 · 工人运动时空叙事
echo   ----------------------------------------------------
echo   地址：%URL%
echo   模式：电影导览 ?tour=1 ／ 自由漫游 enter.html ／ 研究档案 assets.html
echo   终端：任意页面加 ?kiosk=1（按 Esc 退出）
echo   ----------------------------------------------------
echo   关闭本窗口即停止服务。
echo.

start "" "%URL%"
%PY% -m http.server %PORT% --bind 127.0.0.1
endlocal
