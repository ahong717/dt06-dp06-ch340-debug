@echo off
REM ================================================================
REM DT-06 simulator - build the Windows EXE
REM This file is plain ASCII so Windows CMD can run it safely.
REM Read README.md for the Traditional Chinese explanation.
REM Run setup-dev.bat first. This packages the Python source into an EXE.
REM Output: build-output\DT06_Sanyo_AC_Simulator.exe
REM ================================================================

setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo .venv was not found. Double-click setup-dev.bat first.
    pause
    exit /b 1
)

echo Building the EXE. Please wait...
if not exist "build-output" mkdir "build-output"
if not exist "build-cache\pyinstaller-work" mkdir "build-cache\pyinstaller-work"

.venv\Scripts\python.exe -m PyInstaller ^
  --noconfirm ^
  --clean ^
  --onefile ^
  --windowed ^
  --name "DT06_Sanyo_AC_Simulator" ^
  --paths "%~dp0simulator-desktop" ^
  --distpath "%~dp0build-output" ^
  --workpath "%~dp0build-cache\pyinstaller-work" ^
  --specpath "%~dp0build-cache" ^
  "%~dp0simulator-desktop\app.py"

if errorlevel 1 (
    echo EXE build failed. Keep the error message for debugging.
    pause
    exit /b 1
)

echo.
echo EXE build complete:
echo build-output\DT06_Sanyo_AC_Simulator.exe
pause
exit /b 0
