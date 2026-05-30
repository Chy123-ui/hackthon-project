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

echo [4/5] Creating README + start script...
echo # re:life> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ## System Requirements >> "%OUT_DIR%\README.md"
echo - Python 3.10 or later >> "%OUT_DIR%\README.md"
echo - Windows 10+, macOS or Linux >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ## Quick Start >> "%OUT_DIR%\README.md"
echo 1. Double-click start.bat >> "%OUT_DIR%\README.md"
echo 2. First launch will auto-install dependencies (one-time, ~1 minute) >> "%OUT_DIR%\README.md"
echo 3. Browser opens at http://localhost:8000 >> "%OUT_DIR%\README.md"
echo 4. Go to Settings, fill in API Key / Base URL / Model >> "%OUT_DIR%\README.md"
echo 5. Start playing in Game tab >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ## Troubleshooting >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ### pip install too slow or fails? >> "%OUT_DIR%\README.md"
echo Use a Chinese mirror: >> "%OUT_DIR%\README.md"
echo ``` >> "%OUT_DIR%\README.md"
echo pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple >> "%OUT_DIR%\README.md"
echo ``` >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ### Need a proxy for API access? >> "%OUT_DIR%\README.md"
echo Set environment variables before launching: >> "%OUT_DIR%\README.md"
echo ``` >> "%OUT_DIR%\README.md"
echo set HTTP_PROXY=http://127.0.0.1:7890 >> "%OUT_DIR%\README.md"
echo set HTTPS_PROXY=http://127.0.0.1:7890 >> "%OUT_DIR%\README.md"
echo ``` >> "%OUT_DIR%\README.md"
echo Then run start.bat as usual. >> "%OUT_DIR%\README.md"

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
