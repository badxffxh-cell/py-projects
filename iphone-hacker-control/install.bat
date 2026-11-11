@echo off
REM ===================================================================
REM  IPHONE HACKER CONTROL - dependency installer (Windows)
REM  Creates a local virtual environment and installs requirements.
REM ===================================================================
setlocal enabledelayedexpansion
title IPHONE HACKER CONTROL - Installer
cd /d "%~dp0"

echo.
echo  ===============================================
echo   IPHONE HACKER CONTROL  -  Installer
echo  ===============================================
echo.

REM --- 1. Locate a Python launcher ------------------------------------
set "PY_CMD="
where py >nul 2>nul && set "PY_CMD=py -3"
if not defined PY_CMD (
    where python >nul 2>nul && set "PY_CMD=python"
)
if not defined PY_CMD (
    echo [ERROR] Python was not found on PATH.
    echo         Install Python 3.12+ from https://www.python.org/downloads/
    echo         During setup, tick "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
)
echo [ OK ] Using Python launcher: %PY_CMD%
%PY_CMD% --version

REM --- 2. Create the virtual environment -----------------------------
if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Creating virtual environment in .venv ...
    %PY_CMD% -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create the virtual environment.
        pause
        exit /b 1
    )
) else (
    echo [ OK ] Virtual environment already exists.
)

set "VENV_PY=.venv\Scripts\python.exe"

REM --- 3. Upgrade pip and install requirements -----------------------
echo [INFO] Upgrading pip ...
"%VENV_PY%" -m pip install --upgrade pip
echo [INFO] Installing dependencies (this can take a few minutes) ...
"%VENV_PY%" -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Dependency installation failed. See the messages above.
    pause
    exit /b 1
)

REM --- 4. Verify the install -----------------------------------------
echo [INFO] Verifying installation ...
"%VENV_PY%" -c "import PySide6, pymobiledevice3; print('[ OK ] PySide6 and pymobiledevice3 import correctly')"
if errorlevel 1 (
    echo [ERROR] Verification failed - the libraries did not import.
    pause
    exit /b 1
)

echo.
echo  ===============================================
echo   Installation complete.
echo   Run start.bat to launch IPHONE HACKER CONTROL.
echo  ===============================================
echo.
echo  TIP: For USB device access, install Apple's "Apple Devices" app
echo       (or iTunes) so the Apple Mobile Device Service is running.
echo.
pause
endlocal
