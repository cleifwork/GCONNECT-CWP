@echo off
setlocal
title GConnect Voucher Status Service
rem Resolve files relative to this launcher, including when started by a shortcut.
pushd "%~dp0"
if errorlevel 1 (
  echo Could not open the service folder.
  pause
  exit /b 1
)
if not exist ".env" (
  echo Missing .env. Configure the service before starting it.
  goto failed
)
if not exist "server.mjs" (
  echo Missing server.mjs. Put this launcher in the voucher-status-service folder.
  goto failed
)
rem Prefer the standard Node installation; otherwise use the user's PATH.
set "GCONNECT_NODE=%ProgramFiles%\nodejs\node.exe"
if exist "%GCONNECT_NODE%" goto node_ready
set "GCONNECT_NODE=node.exe"
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22 or newer, then try again.
  goto failed
)
:node_ready
rem Respect an existing custom CA path, or use the certificate next to this file.
if not defined NODE_EXTRA_CA_CERTS set "NODE_EXTRA_CA_CERTS=%CD%\oc200-cert.pem"
if not exist "%NODE_EXTRA_CA_CERTS%" (
  echo Controller certificate PEM not found.
  echo Put oc200-cert.pem beside this launcher, or set NODE_EXTRA_CA_CERTS first.
  goto failed
)
echo Starting GConnect. Leave this window open; locking Windows is fine.
echo Press Ctrl+C to stop. Do not start a second copy if the service is already running.
echo.
"%GCONNECT_NODE%" --env-file=.env server.mjs
set "GCONNECT_EXIT=%ERRORLEVEL%"
echo.
echo GConnect stopped. Exit code: %GCONNECT_EXIT%
if not "%GCONNECT_EXIT%"=="0" echo Review the error above. If port 3080 is in use, another copy may already be running.
pause
popd
exit /b %GCONNECT_EXIT%
:failed
pause
popd
exit /b 1
