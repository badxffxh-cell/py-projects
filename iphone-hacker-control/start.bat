@echo off
REM ===================================================================
REM  IPHONE HACKER CONTROL - launcher (Windows)
REM ===================================================================
setlocal
title IPHONE HACKER CONTROL
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found.
    echo         Run install.bat first.
    echo.
    pause
    exit /b 1
)

set "VENV_PY=.venv\Scripts\python.exe"

REM Quick dependency sanity check before launching the GUI.
"%VENV_PY%" -c "import PySide6, pymobiledevice3" 2>nul
if errorlevel 1 (
    echo [WARN] Dependencies missing or broken. Re-running install.bat is recommended.
    echo        Launching anyway in diagnostic mode...
)

echo [INFO] Launching IPHONE HACKER CONTROL ...
"%VENV_PY%" main.py %*
set "RC=%errorlevel%"
if not "%RC%"=="0" (
    echo.
    echo [INFO] Application exited with code %RC%.
    pause
)
endlocal
