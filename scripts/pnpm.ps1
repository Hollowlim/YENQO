param([Parameter(ValueFromRemainingArguments=$true)][string[]]$PnpmArguments)
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectRoot '.tools/node-v24.22.0-win-x64'
$pnpmPath = Join-Path $projectRoot '.tools/pnpm/node_modules/pnpm/bin/pnpm.cjs'
if (!(Test-Path -LiteralPath (Join-Path $runtimePath 'node.exe'))) { throw 'Install Node.js LTS and pnpm, or restore the local .tools runtime.' }
$env:PATH = "$runtimePath;$env:PATH"
& (Join-Path $runtimePath 'node.exe') $pnpmPath @PnpmArguments
exit $LASTEXITCODE
