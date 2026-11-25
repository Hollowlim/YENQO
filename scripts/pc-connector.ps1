param([ValidateSet('start','stop','status')][string]$Action='start')
$workspacePath=Split-Path -Parent $PSScriptRoot
$privatePath=Join-Path $workspacePath '.private-pc-connector'
$venvPath=Join-Path $workspacePath '.tools/pc-connector-venv'
$runtimeHome=((Get-Content -LiteralPath (Join-Path $venvPath 'pyvenv.cfg') | Where-Object {$_ -match '^home\s*='} | Select-Object -First 1) -split '=',2)[1].Trim()
$pythonPath=Join-Path $runtimeHome 'python.exe'
$workerPath=Join-Path $workspacePath 'services/pc-connector/worker.py'
$pidPath=Join-Path $privatePath 'worker.pid'
$workerProcess=$null
if(Test-Path -LiteralPath $pidPath){
 $workerProcessId=0
 if([int]::TryParse((Get-Content -LiteralPath $pidPath -Raw).Trim(),[ref]$workerProcessId)){
  $candidate=Get-CimInstance Win32_Process -Filter "ProcessId = $workerProcessId" -ErrorAction SilentlyContinue
  if($candidate -and $candidate.ExecutablePath -ieq $pythonPath -and $candidate.CommandLine.Contains($workerPath)){$workerProcess=Get-Process -Id $workerProcessId -ErrorAction SilentlyContinue}
 }
}
if($Action -eq 'stop'){
 if($workerProcess){
  Set-Content -LiteralPath (Join-Path $privatePath 'stop.request') -Value 'stop' -Encoding ascii
  if(!$workerProcess.WaitForExit(45000)){$workerProcess.Kill();$workerProcess.WaitForExit(5000)}
  $terminalRoot=[IO.Path]::GetFullPath((Join-Path $privatePath 'terminals'))+[IO.Path]::DirectorySeparatorChar
  foreach($terminal in (Get-CimInstance Win32_Process -Filter "Name = 'terminal64.exe'" -ErrorAction SilentlyContinue)){
   if($terminal.ExecutablePath -and [IO.Path]::GetFullPath($terminal.ExecutablePath).StartsWith($terminalRoot,[StringComparison]::OrdinalIgnoreCase) -and $terminal.CommandLine.Contains('/portable')){
    $ownedTerminal=Get-Process -Id $terminal.ProcessId -ErrorAction SilentlyContinue
    if($ownedTerminal){$ownedTerminal.Kill();$ownedTerminal.WaitForExit(1000) | Out-Null}
   }
  }
  Write-Output 'Connector stopped. Website history will become stale; restart requires investor-password reconnection.'
 }else{Write-Output 'Connector is not running.'}
 exit
}
if($Action -eq 'status'){if($workerProcess){Write-Output 'Connector process is running. Check website Settings for broker sync status.'}else{Write-Output 'Connector is not running.'};exit}
if($workerProcess){Write-Output 'Connector already running.';exit}
if(!(Test-Path -LiteralPath (Join-Path $privatePath 'worker.dpapi'))){throw 'Run the private connector setup first.'}
if(!(Test-Path -LiteralPath $pythonPath)){throw 'Install the isolated Python environment and requirements first.'}
$stopPath=Join-Path $privatePath 'stop.request'
if(Test-Path -LiteralPath $stopPath){Remove-Item -LiteralPath $stopPath}
$previousPythonPath=$env:PYTHONPATH
try{
 $env:PYTHONPATH=Join-Path $venvPath 'Lib/site-packages'
 $started=Start-Process -FilePath $pythonPath -ArgumentList @('-S','-u',('"'+$workerPath+'"')) -WorkingDirectory $workspacePath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $privatePath 'worker.stdout.log') -RedirectStandardError (Join-Path $privatePath 'worker.stderr.log') -PassThru
}finally{$env:PYTHONPATH=$previousPythonPath}
Set-Content -LiteralPath $pidPath -Value $started.Id -Encoding ascii
Write-Output 'Read-only PC connector started in the background. Keep this PC awake and connected.'
