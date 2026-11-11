@echo off
REM ===================================================================
REM  IPHONE HACKER CONTROL - inicializador (Windows)
REM ===================================================================
setlocal
title IPHONE HACKER CONTROL
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERRO] Ambiente virtual nao encontrado.
    echo        Execute install.bat primeiro.
    echo.
    pause
    exit /b 1
)

set "VENV_PY=.venv\Scripts\python.exe"

REM Checagem rapida de dependencias antes de abrir a GUI.
"%VENV_PY%" -c "import PySide6, pymobiledevice3" 2>nul
if errorlevel 1 (
    echo [AVISO] Dependencias ausentes ou quebradas. Recomenda-se rodar install.bat.
    echo         Abrindo mesmo assim em modo diagnostico...
)

echo [INFO] Abrindo o IPHONE HACKER CONTROL ...
"%VENV_PY%" main.py %*
set "RC=%errorlevel%"
if not "%RC%"=="0" (
    echo.
    echo [INFO] Aplicativo encerrou com codigo %RC%.
    pause
)
endlocal
