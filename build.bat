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
echo ## 系统要求 >> "%OUT_DIR%\README.md"
echo - Python 3.10 或更高版本 >> "%OUT_DIR%\README.md"
echo - Windows 10+ / macOS / Linux >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ## 快速开始 >> "%OUT_DIR%\README.md"
echo 1. 双击 start.bat 启动 >> "%OUT_DIR%\README.md"
echo 2. 首次启动会自动安装依赖（仅一次，约 1 分钟） >> "%OUT_DIR%\README.md"
echo 3. 浏览器自动打开 http://localhost:8000 >> "%OUT_DIR%\README.md"
echo 4. 在 Settings 页面填写 API Key / Base URL / Model >> "%OUT_DIR%\README.md"
echo 5. 在 Game 页面开始游戏 >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ## 常见问题 >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ### pip 安装太慢或失败？ >> "%OUT_DIR%\README.md"
echo 使用清华镜像： >> "%OUT_DIR%\README.md"
echo ``` >> "%OUT_DIR%\README.md"
echo pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple >> "%OUT_DIR%\README.md"
echo ``` >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ### 需要代理访问 API？ >> "%OUT_DIR%\README.md"
echo 启动前设置环境变量： >> "%OUT_DIR%\README.md"
echo ``` >> "%OUT_DIR%\README.md"
echo set HTTP_PROXY=http://127.0.0.1:7890 >> "%OUT_DIR%\README.md"
echo set HTTPS_PROXY=http://127.0.0.1:7890 >> "%OUT_DIR%\README.md"
echo ``` >> "%OUT_DIR%\README.md"
echo 然后照常运行 start.bat。 >> "%OUT_DIR%\README.md"
echo. >> "%OUT_DIR%\README.md"
echo ## 数据 >> "%OUT_DIR%\README.md"
echo 所有存档保存在 data/ 目录下。删除 data/ 文件夹可重置所有数据。 >> "%OUT_DIR%\README.md"

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
