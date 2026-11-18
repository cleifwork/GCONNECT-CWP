@echo off
setlocal
title GConnect Balance Checker Setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0gconnect-balance-checker.ps1"
if errorlevel 1 pause
