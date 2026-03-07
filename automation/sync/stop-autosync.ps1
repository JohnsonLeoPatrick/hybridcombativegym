Get-Process -Name powershell -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -and $_.Path -like "*powershell.exe" } |
    ForEach-Object {
        try {
            $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            if ($cmd -like "*autosync-24x7.ps1*" -or $cmd -like "*autosync-pull-only.ps1*") {
                Stop-Process -Id $_.Id -Force
                Write-Host "Stopped auto-sync process PID $($_.Id)"
            }
        } catch {}
    }
