param(
    [Parameter(Mandatory = $true)][string]$NodePath,
    [string]$ApiBaseUrl = 'http://127.0.0.1:3000'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot 'data\collector-logs'
[System.IO.Directory]::CreateDirectory($logDirectory) | Out-Null
$logPath = Join-Path $logDirectory ((Get-Date).ToString('yyyy-MM-dd', [System.Globalization.CultureInfo]::InvariantCulture) + '.log')
function Write-CollectorLog([string]$Message) {
    Add-Content -LiteralPath $logPath -Encoding UTF8 -Value ((Get-Date -Format o) + ' ' + $Message)
}

# The OS releases this file lock on exit/crash, so no stale PID-file cleanup is needed.
$lockPath = Join-Path $logDirectory 'collector.lock'
try {
    $lock = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch [System.IO.IOException] {
    Write-CollectorLog 'SKIPPED: another scheduled collector is running.'
    exit 0
}
$exitCode = 1
$process = $null
try {
    Write-CollectorLog "START: all 85 areas; API=$ApiBaseUrl"
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $NodePath
    $info.Arguments = '"' + (Join-Path $PSScriptRoot 'collect-weather.cjs') + '" --all'
    $info.WorkingDirectory = $projectRoot
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $info.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    $info.EnvironmentVariables['WEATHER_API_BASE_URL'] = $ApiBaseUrl
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit(35 * 60 * 1000)) {
        $process.Kill()
        $process.WaitForExit()
        Write-CollectorLog 'ERROR: collector exceeded 35 minutes and was stopped.'
    } else {
        $exitCode = $process.ExitCode
    }
    Add-Content -LiteralPath $logPath -Encoding UTF8 -Value $stdout.GetAwaiter().GetResult()
    $errorOutput = $stderr.GetAwaiter().GetResult()
    if ($errorOutput) { Add-Content -LiteralPath $logPath -Encoding UTF8 -Value $errorOutput }
    Write-CollectorLog "FINISH: exitCode=$exitCode"
} catch {
    Write-CollectorLog ('ERROR: ' + $_.Exception.Message)
} finally {
    if ($process) { $process.Dispose() }
    $lock.Dispose()
}
exit $exitCode
