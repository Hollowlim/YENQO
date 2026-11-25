@echo off
setlocal
cd /d "%~dp0"
title YENGFX HUB - Local client and admin testing
echo YENGFX HUB local website: http://127.0.0.1:3000/
echo Keep this window open while testing client and admin accounts.
echo Press Ctrl+C when you want to stop the local server.
echo.
call "%~dp0scripts\pnpm.cmd" dev
echo.
echo The local website has stopped.
pause
