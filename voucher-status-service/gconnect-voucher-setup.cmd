@echo off
setlocal
title GConnect Voucher Setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0gconnect-voucher-setup.ps1"
if errorlevel 1 pause
