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

echo [1/5] Building frontend...
cd /d "%FRONTEND_DIR%"
cmd /c "npm run build"
if errorlevel 1 ( echo Frontend build failed & exit /b 1 )

echo [2/5] Clearing build dir...
rmdir /S /Q "%BUILD_DIR%" 2>nul
mkdir "%OUT_DIR%"
mkdir "%OUT_DIR%\data"

echo [3/5] Copying files...
robocopy "%BACKEND_DIR%\app" "%OUT_DIR%\app" /E /NFL /NDL /NJH /NJS >nul
robocopy "%BACKEND_DIR%\protocol" "%OUT_DIR%\protocol" /E /NFL /NDL /NJH /NJS >nul
robocopy "%BACKEND_DIR%\default_worlds" "%OUT_DIR%\default_worlds" /E /NFL /NDL /NJH /NJS >nul
robocopy "%FRONTEND_DIR%\dist" "%OUT_DIR%\dist" /E /NFL /NDL /NJH /NJS >nul
copy "%BACKEND_DIR%\requirements.txt" "%OUT_DIR%\requirements.txt" >nul
copy "%BACKEND_DIR%\run.py" "%OUT_DIR%\run.py" >nul

echo [4/5] Creating start script...
echo @echo off> "%OUT_DIR%\start.bat"
echo chcp 65001 ^>nul >> "%OUT_DIR%\start.bat"
echo cd /d "%%~dp0" >> "%OUT_DIR%\start.bat"
echo if not exist ".venv\Scripts\python.exe" ( >> "%OUT_DIR%\start.bat"
echo   echo Setting up environment... >> "%OUT_DIR%\start.bat"
echo   python -m venv .venv >> "%OUT_DIR%\start.bat"
echo   .venv\Scripts\pip install -r requirements.txt >> "%OUT_DIR%\start.bat"
echo ) >> "%OUT_DIR%\start.bat"
echo start "" http://localhost:8000 >> "%OUT_DIR%\start.bat"
echo .venv\Scripts\python run.py >> "%OUT_DIR%\start.bat"

echo [5/5] Creating ZIP...
powershell -Command "Compress-Archive -Path '%OUT_DIR%' -DestinationPath '%BUILD_DIR%\re-life.zip' -Force"

echo ============================================
echo   Build complete: build/re-life.zip
echo ============================================
pause
