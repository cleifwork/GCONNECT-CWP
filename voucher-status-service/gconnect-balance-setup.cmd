@echo off
setlocal
title GConnect Balance Setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0gconnect-balance-setup.ps1"
if errorlevel 1 pause
