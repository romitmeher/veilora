@echo off
:: Veilora Desktop — Windows Installer Builder
:: Launches build-installer.ps1 with the correct execution policy.
:: Usage:
::   build-installer.bat              (amd64, with self-update)
::   build-installer.bat arm64        (arm64, with self-update)
::   build-installer.bat amd64 noupdate

setlocal

set ARCH=amd64
set EXTRA=

if not "%~1"=="" set ARCH=%~1
if /i "%~2"=="noupdate" set EXTRA=-NoSelfUpdate

powershell.exe -NoProfile -ExecutionPolicy Bypass ^
  -File "%~dp0build-installer.ps1" ^
  -Arch %ARCH% %EXTRA%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed. See errors above.
    pause
    exit /b %ERRORLEVEL%
)

pause
