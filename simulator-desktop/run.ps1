$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$knownPython = 'C:\Users\chaoh\Documents\Codex\2026-07-31\new-chat-2\work\esphome-venv\Scripts\python.exe'

if (Test-Path -LiteralPath $knownPython) {
    $python = $knownPython
} else {
    $python = (Get-Command python -ErrorAction Stop).Source
}

Push-Location $PSScriptRoot
try {
    & $python .\app.py
} finally {
    Pop-Location
}

