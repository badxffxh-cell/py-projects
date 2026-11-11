@echo off
REM ===================================================================
REM  IPHONE HACKER CONTROL - build a standalone Windows .exe
REM  Uses PyInstaller. Output: dist\IphoneHackerControl\IphoneHackerControl.exe
REM ===================================================================
setlocal
title IPHONE HACKER CONTROL - Build EXE
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found. Run install.bat first.
    pause
    exit /b 1
)
set "VENV_PY=.venv\Scripts\python.exe"

echo [INFO] Ensuring PyInstaller is installed ...
"%VENV_PY%" -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo [ERROR] Could not install PyInstaller.
    pause
    exit /b 1
)

echo [INFO] Building executable ...
REM --collect-all pulls in PySide6 plugins and pymobiledevice3 data files.
"%VENV_PY%" -m PyInstaller ^
    --name IphoneHackerControl ^
    --noconfirm ^
    --clean ^
    --windowed ^
    --collect-all PySide6 ^
    --collect-all pymobiledevice3 ^
    main.py

if errorlevel 1 (
    echo [ERROR] Build failed. See the output above.
    pause
    exit /b 1
)

echo.
echo  ===============================================
echo   Build complete.
echo   EXE: dist\IphoneHackerControl\IphoneHackerControl.exe
echo  ===============================================
echo.
echo  Note: a one-folder build (above) starts faster and is more reliable
echo  for PySide6 than a single-file build. To attempt a single file, add
echo  --onefile to the command above.
echo.
pause
endlocal
