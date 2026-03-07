param(
    [int]$IntervalSeconds = 30,
    [string]$Branch = "main"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$RepoPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoPath

function Write-Log {
    param([string]$Message)
    $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$stamp] $Message"
}

Write-Log "Pull-only sync started in $RepoPath on branch $Branch (every $IntervalSeconds sec)."

while ($true) {
    try {
        git checkout $Branch | Out-Null
        git pull --rebase --autostash origin $Branch | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Pulled latest changes from origin/$Branch."
        } else {
            Write-Log "Pull had issues. Will retry next loop."
        }
    }
    catch {
        Write-Log ("Error: " + $_.Exception.Message)
    }

    Start-Sleep -Seconds $IntervalSeconds
}
