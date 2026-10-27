$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    Write-Error '找不到專案 .venv，請先在根目錄執行 setup-dev.bat。'
    exit 1
}
Push-Location $root
try { & $python 'simulator-desktop\app.py' } finally { Pop-Location }
