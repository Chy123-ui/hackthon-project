@echo off
echo ============================================
echo  AI WenYou - Build EXE
echo ============================================
echo.

set "ROOT=%~dp0"
set "BUILD_DIR=%ROOT%build"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

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

echo [4/4] Building EXE...
.venv\Scripts\pyinstaller --onefile --noconsole ^
  --add-data "protocol;protocol" ^
  --add-data "default_worlds;default_worlds" ^
  --add-data "%FRONTEND_DIR%\dist;dist" ^
  --distpath "%BUILD_DIR%" --workpath "%BUILD_DIR%\tmp" --specpath "%BUILD_DIR%\tmp" ^
  --name "AI文游" ^
  launcher.py

echo.
echo ============================================
echo   Build complete: build/AI文游.exe
echo ============================================
echo   Distribute this exe with protocol/ default_worlds/ dist/ folders.
pause
