@echo off
REM ===================================================================
REM  IPHONE HACKER CONTROL - gerar um .exe standalone para Windows
REM  Usa PyInstaller. Saida: dist\IphoneHackerControl\IphoneHackerControl.exe
REM ===================================================================
setlocal
title IPHONE HACKER CONTROL - Gerar EXE
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERRO] Ambiente virtual nao encontrado. Execute install.bat primeiro.
    pause
    exit /b 1
)
set "VENV_PY=.venv\Scripts\python.exe"

echo [INFO] Garantindo que o PyInstaller esteja instalado ...
"%VENV_PY%" -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo [ERRO] Nao foi possivel instalar o PyInstaller.
    pause
    exit /b 1
)

echo [INFO] Gerando o executavel ...
REM --collect-all inclui plugins do PySide6 e arquivos de dados do pymobiledevice3.
"%VENV_PY%" -m PyInstaller ^
    --name IphoneHackerControl ^
    --noconfirm ^
    --clean ^
    --windowed ^
    --collect-all PySide6 ^
    --collect-all pymobiledevice3 ^
    main.py

if errorlevel 1 (
    echo [ERRO] Falha na geracao. Veja a saida acima.
    pause
    exit /b 1
)

echo.
echo  ===============================================
echo   Geracao concluida.
echo   EXE: dist\IphoneHackerControl\IphoneHackerControl.exe
echo  ===============================================
echo.
echo  Obs.: um build em pasta unica (acima) inicia mais rapido e e mais
echo  confiavel para o PySide6 do que um arquivo unico. Para tentar arquivo
echo  unico, acrescente --onefile ao comando acima.
echo.
pause
endlocal
