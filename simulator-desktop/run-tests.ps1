$ErrorActionPreference = 'Stop'
$python = Get-Command python -ErrorAction Stop
& $python.Source -m unittest discover -s (Join-Path $PSScriptRoot '..\tests') -v
