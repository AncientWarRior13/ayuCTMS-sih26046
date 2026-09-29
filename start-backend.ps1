# AyuCTMS - Local Backend & Database Starter
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Checking PostgreSQL..." -ForegroundColor Cyan
$pgData = Join-Path $root "pgsql\data"
$pgBin = Join-Path $root "pgsql\bin"

# Start postgres if not running
$pgProc = Get-Process -Name postgres -ErrorAction SilentlyContinue
if (-not $pgProc) {
    Write-Host "Starting PostgreSQL server..." -ForegroundColor Yellow
    Start-Process (Join-Path $pgBin "postgres.exe") -ArgumentList "-D `"$pgData`"" -WindowStyle Hidden
    Start-Sleep -Seconds 3
}

Write-Host "PostgreSQL is active." -ForegroundColor Green

# Start FastAPI backend
Write-Host "Starting FastAPI on http://localhost:8000..." -ForegroundColor Cyan
Set-Location (Join-Path $root "backend")
& (Join-Path $root ".venv\Scripts\uvicorn.exe") app.main:app --host 0.0.0.0 --port 8000 --reload
