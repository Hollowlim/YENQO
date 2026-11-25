@echo off
set "PATH=%~dp0..\.tools\node-v24.22.0-win-x64;%~dp0..\.tools\pnpm\node_modules\.bin;%PATH%"
"%~dp0..\.tools\node-v24.22.0-win-x64\node.exe" "%~dp0..\.tools\pnpm\node_modules\pnpm\bin\pnpm.cjs" %*
