@echo off
REM ================================================================
REM Prepare a verified EXE package for GitHub Release.
REM Usage: release-exe.bat 1.1.1
REM This does not upload anything and does not replace the old EXE.
REM ================================================================

setlocal
cd /d "%~dp0"

if "%~1"=="" (
    echo Usage: release-exe.bat 1.1.1
    pause
    exit /b 1
)

set "VERSION=%~1"
set "PYTHON=.venv\Scripts\python.exe"
set "CANDIDATE=build-output\DT06_Sanyo_AC_Simulator.exe"
set "PACKAGE=release\v%VERSION%"

if not exist "%PYTHON%" (
    echo .venv was not found. Double-click setup-dev.bat first.
    pause
    exit /b 1
)

echo Running automated tests before packaging...
%PYTHON% -m unittest discover -s tests -v
if errorlevel 1 (
    echo Tests failed. No release package was created.
    pause
    exit /b 1
)

if not exist "%CANDIDATE%" (
    echo Candidate EXE was not found. Run build-exe.bat first.
    pause
    exit /b 1
)

if not exist "%PACKAGE%" mkdir "%PACKAGE%"
copy /y "%CANDIDATE%" "%PACKAGE%\DT06_Sanyo_AC_Simulator-v%VERSION%.exe" >nul
certutil -hashfile "%PACKAGE%\DT06_Sanyo_AC_Simulator-v%VERSION%.exe" SHA256 > "%PACKAGE%\SHA256.txt"
> "%PACKAGE%\RELEASE-NOTES.txt" echo DT-06 Sanyo AC Simulator v%VERSION%
>> "%PACKAGE%\RELEASE-NOTES.txt" echo.
>> "%PACKAGE%\RELEASE-NOTES.txt" echo Automated tests passed before packaging.
>> "%PACKAGE%\RELEASE-NOTES.txt" echo Hardware UART/CH340 validation must be recorded separately.

echo Release package prepared in %PACKAGE%
echo Upload the EXE, SHA256.txt, and RELEASE-NOTES.txt to a GitHub Release.
pause
exit /b 0
