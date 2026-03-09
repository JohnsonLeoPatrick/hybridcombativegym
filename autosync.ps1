$ErrorActionPreference = "SilentlyContinue"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Starting 24/7 Autosync (every 4 seconds)" -ForegroundColor Green
Write-Host " Press Ctrl+C to stop this script." -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan

while ($true) {
    # Check if there are any local changes
    $status = git status --porcelain
    if ($status) {
        Write-Host "Changes detected, committing..." -ForegroundColor DarkGray
        git add .
        git commit -m "Autosync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-Null
    }
    
    # Pull changes from remote (your friend's changes)
    # Using --rebase to avoid merge commits cluttering the history
    $pullResult = git pull origin main --rebase 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Issue pulling changes (possibly a merge conflict)." -ForegroundColor Red
        Write-Host $pullResult -ForegroundColor Red
    }
    
    # Push changes to remote (giving your friend your changes)
    $pushResult = git push origin main 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Issue pushing changes." -ForegroundColor Red
        Write-Host $pushResult -ForegroundColor Red
    }

    # Wait 4 seconds before trying again
    Start-Sleep -Seconds 4
}
