@echo off
chcp 65001 >nul

set "ROOT=%~dp0"
set "BUILD_DIR=%ROOT%build"
set "OUT_DIR=%BUILD_DIR%\re-life"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

echo ============================================
echo  re:life - Build
echo ============================================
echo.

echo [1/4] Building frontend...
cd /d "%FRONTEND_DIR%"
cmd /c "npm run build"
if errorlevel 1 ( echo Frontend build failed & exit /b 1 )

echo.
echo [2/4] Clearing build dir...
rmdir /S /Q "%BUILD_DIR%" 2>nul
mkdir "%OUT_DIR%"
mkdir "%OUT_DIR%\data"

echo [3/4] Preparing Python deps...
cd /d "%BACKEND_DIR%"
if not exist ".venv\Scripts\python.exe" ( python -m venv .venv )
.venv\Scripts\pip install -q -r requirements.txt

echo [4/4] Copying files...
robocopy ".venv" "%OUT_DIR%\.venv" /E /NFL /NDL /NJH /NJS >nul
robocopy "app" "%OUT_DIR%\app" /E /NFL /NDL /NJH /NJS >nul
robocopy "protocol" "%OUT_DIR%\protocol" /E /NFL /NDL /NJH /NJS >nul
robocopy "default_worlds" "%OUT_DIR%\default_worlds" /E /NFL /NDL /NJH /NJS >nul
robocopy "%FRONTEND_DIR%\dist" "%OUT_DIR%\dist" /E /NFL /NDL /NJH /NJS >nul

echo @echo off> "%OUT_DIR%\start.bat"
echo cd /d "%OUT_DIR%" >> "%OUT_DIR%\start.bat"
echo start "" http://localhost:8000 >> "%OUT_DIR%\start.bat"
echo .venv\Scripts\python run.py >> "%OUT_DIR%\start.bat"
copy "%BACKEND_DIR%\run.py" "%OUT_DIR%\run.py" >nul

echo [5/5] Creating ZIP...
powershell -Command "Compress-Archive -Path '%OUT_DIR%' -DestinationPath '%BUILD_DIR%\re-life.zip' -Force"

echo ============================================
echo   Build complete: build/re-life.zip
echo ============================================
pause
