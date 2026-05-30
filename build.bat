@echo off
chcp 65001 >nul

set "ROOT=%~dp0"
set "BUILD_DIR=%ROOT%build"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

echo ============================================
echo  re:life - Build EXE
echo ============================================
echo.

echo [1/4] Building frontend...
cd /d "%FRONTEND_DIR%"
cmd /c "npm run build" >nul 2>&1
if errorlevel 1 ( echo Frontend build failed & exit /b 1 )

echo [2/4] Cleaning build dir...
rmdir /S /Q "%BUILD_DIR%" 2>nul
mkdir "%BUILD_DIR%"

echo [3/4] Installing PyInstaller...
cd /d "%BACKEND_DIR%"
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
)
.venv\Scripts\pip install -q pyinstaller

echo [4/4] Building EXE (this will take a few minutes)...
.venv\Scripts\pyinstaller --onefile ^
  --add-data "%BACKEND_DIR%\protocol;protocol" ^
  --add-data "%BACKEND_DIR%\default_worlds;default_worlds" ^
  --add-data "%FRONTEND_DIR%\dist;dist" ^
  --distpath "%BUILD_DIR%" ^
  --workpath "%BUILD_DIR%\tmp" ^
  --name "re-life" ^
  "%BACKEND_DIR%\launcher.py"

echo.
echo ============================================
echo   Build complete: build/re-life.exe
echo ============================================
pause
