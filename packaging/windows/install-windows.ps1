#Requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string]$InstallDir = "$env:ProgramData\Jydn-Panel",
    [int]$Port = 8008
)

$ErrorActionPreference = 'Stop'
$PackageDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskName = 'Jydn-Panel'
$ExeName = 'jydn-panel.exe'

$InstallDir = [IO.Path]::GetFullPath($InstallDir)
$DriveRoot = [IO.Path]::GetPathRoot($InstallDir).TrimEnd('\')
if ($InstallDir.TrimEnd('\') -ieq $DriveRoot -or $InstallDir.TrimEnd('\') -ieq $env:ProgramData.TrimEnd('\')) {
    throw "安装目录范围过大：$InstallDir"
}

if (-not (Test-Path (Join-Path $PackageDir $ExeName))) {
    throw "安装包缺少 $ExeName"
}
if (-not (Test-Path (Join-Path $PackageDir 'web\index.html'))) {
    throw '安装包缺少 web\index.html'
}

Write-Host "正在安装 Jydn-Panel 到 $InstallDir"
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Get-Process -Name 'jydn-panel' -ErrorAction SilentlyContinue | Stop-Process -Force

$Stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupDir = Join-Path $InstallDir "backups\$Stamp"
if (Test-Path (Join-Path $InstallDir $ExeName)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Copy-Item (Join-Path $InstallDir $ExeName) $BackupDir -Force
}
if (Test-Path (Join-Path $InstallDir 'web')) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    Copy-Item (Join-Path $InstallDir 'web') $BackupDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
foreach ($DataDir in @('conf', 'database', 'uploads', 'runtime', 'backups')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir $DataDir) | Out-Null
}

Copy-Item (Join-Path $PackageDir $ExeName) (Join-Path $InstallDir $ExeName) -Force
foreach ($Tree in @('web', 'seed', 'lang', 'assets')) {
    $Source = Join-Path $PackageDir $Tree
    if (Test-Path $Source) {
        $Target = Join-Path $InstallDir $Tree
        if (Test-Path $Target) { Remove-Item -LiteralPath $Target -Recurse -Force }
        Copy-Item $Source $Target -Recurse -Force
    }
}

$ExampleConfig = Join-Path $PackageDir 'conf\conf.example.ini'
$RuntimeConfig = Join-Path $InstallDir 'conf\conf.ini'
if (-not (Test-Path $RuntimeConfig) -and (Test-Path $ExampleConfig)) {
    Copy-Item $ExampleConfig $RuntimeConfig
}
if (Test-Path $RuntimeConfig) {
    $Config = Get-Content -Raw $RuntimeConfig
    $Config = [regex]::Replace($Config, '(?m)^\s*http_port\s*=.*$', "http_port=$Port")
    [IO.File]::WriteAllText($RuntimeConfig, $Config, (New-Object Text.UTF8Encoding($false)))
}

$Executable = Join-Path $InstallDir $ExeName
$Action = New-ScheduledTaskAction -Execute $Executable -WorkingDirectory $InstallDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$Principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Force | Out-Null

if (-not (Get-NetFirewallRule -DisplayName 'Jydn-Panel HTTP' -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName 'Jydn-Panel HTTP' -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
}
Start-ScheduledTask -TaskName $TaskName

Write-Host "安装完成：http://127.0.0.1:$Port/"
Write-Host "任务状态：Get-ScheduledTask -TaskName '$TaskName'"
