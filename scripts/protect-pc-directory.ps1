param([Parameter(Mandatory=$true)][string]$Target)
$resolvedTarget=(Resolve-Path -LiteralPath $Target).Path
$expectedTarget=[IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $PSScriptRoot) '.private-pc-connector'))
if($resolvedTarget -ine $expectedTarget){throw 'Only the project connector directory may be protected.'}
$identity=[Security.Principal.WindowsIdentity]::GetCurrent().User
$directoryAcl=Get-Acl -LiteralPath $resolvedTarget
$directoryAcl.SetAccessRuleProtection($true,$false)
$rule=New-Object Security.AccessControl.FileSystemAccessRule($identity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$directoryAcl.SetAccessRule($rule)
Set-Acl -LiteralPath $resolvedTarget -AclObject $directoryAcl
