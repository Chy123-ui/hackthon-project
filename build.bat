@echo off
echo ============================================
echo  AI WenYou - Production Build
echo ============================================
echo.

set BUILD_DIR=%~dp0build
set BACKEND_DIR=%~dp0backend
set FRONTEND_DIR=%~dp0frontend

echo [1/3] Building frontend...
cd /d "%FRONTEND_DIR%"
cmd /c "npm run build" >nul 2>&1
if errorlevel 1 ( echo Frontend build failed & exit /b 1 )

echo [2/3] Copying files...
rmdir /S /Q "%BUILD_DIR%" 2>nul
mkdir "%BUILD_DIR%"

robocopy "%BACKEND_DIR%\app" "%BUILD_DIR%\app" /E /NFL /NDL /NJH /NJS
robocopy "%BACKEND_DIR%\protocol" "%BUILD_DIR%\protocol" /E /NFL /NDL /NJH /NJS
robocopy "%BACKEND_DIR%\default_worlds" "%BUILD_DIR%\default_worlds" /E /NFL /NDL /NJH /NJS
copy "%BACKEND_DIR%\requirements.txt" "%BUILD_DIR%\requirements.txt" >nul
copy "%BACKEND_DIR%\run.py" "%BUILD_DIR%\run.py" >nul
mkdir "%BUILD_DIR%\dist"
robocopy "%FRONTEND_DIR%\dist" "%BUILD_DIR%\dist" /E /NFL /NDL /NJH /NJS
mkdir "%BUILD_DIR%\data" >nul 2>&1

echo [3/3] Creating start scripts...
(
echo @echo off
echo cd /d "%%~dp0"
echo if not exist ".venv\Scripts\python.exe" ^(
echo   echo Creating venv...
echo   python -m venv .venv
echo ^)
echo .venv\Scripts\pip install -q -r requirements.txt
echo echo Starting AI WenYou...
echo start "" http://localhost:8000
echo .venv\Scripts\python run.py
) > "%BUILD_DIR%\start.bat"

(
echo #!/bin/bash
echo cd "$^(dirname "$0"^)"
echo if [ ! -f ".venv/bin/python" ]; then
echo   echo "Creating venv..."
echo   python3 -m venv .venv
echo fi
echo .venv/bin/pip install -q -r requirements.txt
echo echo "Starting AI WenYou..."
echo open http://localhost:8000
echo .venv/bin/python run.py
) > "%BUILD_DIR%\start.sh"

echo.
echo ============================================
echo   Build complete: build/
echo   Run: build/start.bat
echo ============================================
