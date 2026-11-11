@echo off
REM ===================================================================
REM  IPHONE HACKER CONTROL - instalador de dependencias (Windows)
REM  Cria um ambiente virtual local e instala os requisitos.
REM ===================================================================
setlocal enabledelayedexpansion
title IPHONE HACKER CONTROL - Instalador
cd /d "%~dp0"

echo.
echo  ===============================================
echo   IPHONE HACKER CONTROL  -  Instalador
echo  ===============================================
echo.

REM --- 1. Localizar um lancador do Python ----------------------------
set "PY_CMD="
where py >nul 2>nul && set "PY_CMD=py -3"
if not defined PY_CMD (
    where python >nul 2>nul && set "PY_CMD=python"
)
if not defined PY_CMD (
    echo [ERRO] Python nao foi encontrado no PATH.
    echo        Instale o Python 3.12+ em https://www.python.org/downloads/
    echo        Durante a instalacao, marque "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
)
echo [ OK ] Usando o Python: %PY_CMD%
%PY_CMD% --version

REM --- 2. Criar o ambiente virtual -----------------------------------
if not exist ".venv\Scripts\python.exe" (
    echo [INFO] Criando ambiente virtual em .venv ...
    %PY_CMD% -m venv .venv
    if errorlevel 1 (
        echo [ERRO] Falha ao criar o ambiente virtual.
        pause
        exit /b 1
    )
) else (
    echo [ OK ] Ambiente virtual ja existe.
)

set "VENV_PY=.venv\Scripts\python.exe"

REM --- 3. Atualizar o pip e instalar os requisitos -------------------
echo [INFO] Atualizando o pip ...
"%VENV_PY%" -m pip install --upgrade pip
echo [INFO] Instalando dependencias (pode levar alguns minutos) ...
"%VENV_PY%" -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha na instalacao das dependencias. Veja as mensagens acima.
    pause
    exit /b 1
)

REM --- 4. Verificar a instalacao -------------------------------------
echo [INFO] Verificando a instalacao ...
"%VENV_PY%" -c "import PySide6, pymobiledevice3; print('[ OK ] PySide6 e pymobiledevice3 importam corretamente')"
if errorlevel 1 (
    echo [ERRO] Verificacao falhou - as bibliotecas nao importaram.
    pause
    exit /b 1
)

echo.
echo  ===============================================
echo   Instalacao concluida.
echo   Execute start.bat para abrir o IPHONE HACKER CONTROL.
echo  ===============================================
echo.
echo  DICA: Para acesso ao dispositivo por USB, instale o app "Apple Devices"
echo        (ou o iTunes) para que o Apple Mobile Device Service rode.
echo.
pause
endlocal
