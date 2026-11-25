@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\pc-connector.ps1" -Action start
pause
