# Full deploy - login (only if needed) + pull + build + deploy everything.
# Usage:  cd C:\dev\storenext-mundial-2026 ;  .\deploy.ps1
# (If PowerShell blocks the script, run once:  Set-ExecutionPolicy -Scope Process Bypass)

Set-Location -Path $PSScriptRoot

# --- 0/3  Firebase login (only prompts if you're logged out or the token expired) ---
Write-Host "`n=== 0/3  Checking Firebase login ===" -ForegroundColor Cyan
firebase.cmd projects:list *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in (or token expired) - opening browser to log in..." -ForegroundColor Yellow
    firebase.cmd login --reauth
    if ($LASTEXITCODE -ne 0) { Write-Host "Login failed - aborting." -ForegroundColor Red; exit 1 }
}
Write-Host "Firebase login OK." -ForegroundColor Green

# --- 1/3  Get the latest code (non-fatal: you may already be up to date) ---
Write-Host "`n=== 1/3  git pull ===" -ForegroundColor Cyan
git pull

# --- 2/3  Build the web app (produces dist/) ---
Write-Host "`n=== 2/3  Building app (tsc -b + vite build) ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build FAILED - nothing deployed." -ForegroundColor Red; exit 1 }

# --- 3/3  Deploy hosting + functions (liveSync, dailyJob) + Firestore rules ---
Write-Host "`n=== 3/3  Deploying hosting + functions + rules ===" -ForegroundColor Cyan
firebase.cmd deploy --only "hosting,functions:liveSync,functions:dailyJob,firestore:rules"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy FAILED. See output above (credentials issue? run: firebase.cmd login --reauth)." -ForegroundColor Red
    exit 1
}

Write-Host "`nDONE - live at https://storenext-wc2026.web.app" -ForegroundColor Green
