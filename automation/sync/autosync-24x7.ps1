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

Write-Log "Auto-sync started in $RepoPath on branch $Branch (every $IntervalSeconds sec)."

while ($true) {
    try {
        # Keep branch checked out
        git checkout $Branch | Out-Null

        # Commit any local changes
        git add -A
        git diff --cached --quiet
        if ($LASTEXITCODE -ne 0) {
            $msg = "auto-sync: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            git commit -m $msg | Out-Null
            Write-Log "Committed local changes."
        }

        # Pull remote updates and then push local commits
        git pull --rebase --autostash origin $Branch | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Pulled latest from origin/$Branch."
        } else {
            Write-Log "Pull had issues. Will retry next loop."
        }

        git push origin $Branch | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Pushed local commits to origin/$Branch."
        } else {
            Write-Log "Push failed (likely auth/permission)."
        }
    }
    catch {
        Write-Log ("Error: " + $_.Exception.Message)
    }

    Start-Sleep -Seconds $IntervalSeconds
}
