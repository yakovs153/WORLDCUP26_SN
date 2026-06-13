# Deploy script - builds the app and ships both hosting + the liveSync function.
# Usage:  cd C:\dev\storenext-mundial-2026 ;  .\deploy.ps1
# (If PowerShell blocks the script, run once:  Set-ExecutionPolicy -Scope Process Bypass)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host "`n=== 1/2  Building app (tsc -b + vite build) ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build FAILED - aborting, nothing deployed." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 2/2  Deploying hosting + functions (liveSync, dailyJob) + Firestore rules ===" -ForegroundColor Cyan
# functions deploy auto-builds functions via the predeploy hook in firebase.json.
firebase.cmd deploy --only "hosting,functions:liveSync,functions:dailyJob,firestore:rules"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy FAILED. See output above (if it says credentials no longer valid, run: firebase.cmd login --reauth)." -ForegroundColor Red
    exit 1
}

Write-Host "`nDONE - live at https://storenext-wc2026.web.app" -ForegroundColor Green
