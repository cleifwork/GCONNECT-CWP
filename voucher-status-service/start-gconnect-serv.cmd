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
"%GCONNECT_NODE%" -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
  echo Node.js 22 or newer is required.
  goto failed
)
rem Explicitly trust the current controller certificate; override stale inherited paths.
set "GCONNECT_CERT_DIR=%~dp0..\certs"
for %%I in ("%GCONNECT_CERT_DIR%") do set "GCONNECT_CERT_DIR=%%~fI"

set "NODE_EXTRA_CA_CERTS=%GCONNECT_CERT_DIR%\gconnect-trust-cert.pem"
if not exist "%NODE_EXTRA_CA_CERTS%" (
  echo Controller certificate PEM not found.
  echo Expected: "%NODE_EXTRA_CA_CERTS%"
  echo Run the GConnect certificate helper, then keep gconnect-trust-cert.pem in C:\GConnect\certs.
  goto failed
)
echo Controller trust certificate: "%NODE_EXTRA_CA_CERTS%"
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
