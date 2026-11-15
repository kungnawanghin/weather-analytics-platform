param([string]$ApiBaseUrl = 'http://127.0.0.1:3000')
$ErrorActionPreference = 'Stop'
$taskName = 'WeatherAnalytics-CollectHourly'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot 'run-hourly-collector.ps1'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$powerShellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$uri = [Uri]$ApiBaseUrl
if (-not $uri.IsAbsoluteUri -or $uri.Scheme -notin @('http', 'https') -or $ApiBaseUrl.Contains('"')) {
    throw 'Invalid API base URL'
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'data\weather.sqlite'))) {
    throw 'Initialize and seed the SQLite database before registering collection.'
}
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $runner + '" -NodePath "' + $nodePath + '" -ApiBaseUrl "' + $ApiBaseUrl + '"'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing -and -not ($existing.Actions.Arguments -contains $arguments)) {
    throw "Task $taskName already exists with a different action; inspect it before replacing it."
}
$action = New-ScheduledTaskAction -Execute $powerShellPath -Argument $arguments -WorkingDirectory $projectRoot
$nextHour = (Get-Date).Date.AddHours((Get-Date).Hour + 1)
$trigger = New-ScheduledTaskTrigger -Once -At $nextHour -RepetitionInterval (New-TimeSpan -Hours 1)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 40) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$userId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $userId -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Collect 85 weather reference points hourly. Requires local API server and signed-in user. Logs in project data/collector-logs.' -Force | Out-Null
Get-ScheduledTask -TaskName $taskName | Select-Object TaskName, State
Get-ScheduledTaskInfo -TaskName $taskName | Select-Object NextRunTime, LastRunTime, LastTaskResult
