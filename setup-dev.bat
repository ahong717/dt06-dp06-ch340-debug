@echo off
REM ================================================================
REM DT-06 simulator - create the development environment
REM This file is plain ASCII so Windows CMD can run it safely.
REM Read README.md for the Traditional Chinese explanation.
REM
REM 1. Find Python 3.
REM 2. Create the project-local .venv environment.
REM 3. Install packages from requirements-dev.txt.
REM 4. Run the automatic tests.
REM ================================================================

setlocal
cd /d "%~dp0"

echo.
echo [1/4] Checking Python...
set "PYTHON_CMD="
py -3 --version >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
    python --version >nul 2>nul
    if not errorlevel 1 set "PYTHON_CMD=python"
)
if not defined PYTHON_CMD (
    echo Python 3 was not found. Install it from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo [2/4] Creating the project-local .venv...
if not exist ".venv\Scripts\python.exe" (
    %PYTHON_CMD% -m venv .venv
    if errorlevel 1 (
        echo Could not create .venv.
        pause
        exit /b 1
    )
) else (
    echo .venv already exists; keeping it.
)

echo.
echo [3/4] Installing development packages...
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
if errorlevel 1 (
    echo Package installation failed. Check the Internet connection and try again.
    pause
    exit /b 1
)

echo.
echo [4/4] Running automatic tests...
.venv\Scripts\python.exe -m unittest discover -s tests -v
if errorlevel 1 (
    echo Tests failed. Keep the error message for debugging.
    pause
    exit /b 1
)

echo.
echo Development environment ready and tests passed.
echo To start: .venv\Scripts\python.exe simulator-desktop\app.py
echo To build the EXE: double-click build-exe.bat
pause
exit /b 0
