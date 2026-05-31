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

echo [4/5] Creating README + start scripts...

REM --- README.md ---
(
echo # re:life
echo.
echo ## 系统要求
echo - Python 3.10 或更高版本
echo - Windows 10+ / macOS / Linux
echo.
echo ## 快速开始
echo.
echo ### Windows
echo 1. 双击 start.bat 启动
echo 2. 首次启动会自动安装依赖（仅一次，约 1 分钟）
echo 3. 浏览器自动打开 http://localhost:8000
echo 4. 在 Settings 页面填写 API Key / Base URL / Model
echo 5. 在 Game 页面开始游戏
echo.
echo ### macOS / Linux
echo 1. 终端运行 `chmod +x start.sh && ./start.sh`
echo 2. 首次启动会自动安装依赖（仅一次，约 1 分钟）
echo 3. 浏览器自动打开 http://localhost:8000
echo 4. 在 Settings 页面填写 API Key / Base URL / Model
echo 5. 在 Game 页面开始游戏
echo.
echo ## 常见问题
echo.
echo ### pip 安装太慢或失败？
echo 使用清华镜像：
echo ```
echo pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
echo ```
echo.
echo ### 需要代理访问 API？
echo 启动前设置环境变量：
echo ```
echo # Windows (CMD^)
echo set HTTP_PROXY=http://127.0.0.1:7890
echo set HTTPS_PROXY=http://127.0.0.1:7890
echo.
echo # macOS / Linux (Shell^)
echo export HTTP_PROXY=http://127.0.0.1:7890
echo export HTTPS_PROXY=http://127.0.0.1:7890
echo ```
echo 然后照常运行启动脚本。
echo.
echo ## 数据
echo 所有存档保存在 data/ 目录下。删除 data/ 文件夹可重置所有数据。
) > "%OUT_DIR%\README.md"

REM --- start.bat (Windows) ---
(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%%~dp0"
echo if not exist ".venv\Scripts\python.exe" (
echo   echo Setting up environment...
echo   python -m venv .venv
echo   .venv\Scripts\pip install -r requirements.txt
echo ^)
echo start "" http://localhost:8000
echo .venv\Scripts\python run.py
) > "%OUT_DIR%\start.bat"

REM --- start.sh (macOS / Linux) ---
(
echo #!/bin/bash
echo set -euo pipefail
echo cd "$(dirname "$0")"
echo.
echo if [ ! -f ".venv/bin/python" ]; then
echo     echo "Setting up environment..."
echo     python3 -m venv .venv
echo     .venv/bin/pip install -r requirements.txt
echo fi
echo.
echo echo "Starting re:life..."
echo echo "Open http://localhost:8000 in your browser."
echo.
echo if command -v xdg-open ^>^&/dev/null; then
echo     xdg-open http://localhost:8000 2^>/dev/null ^&
echo elif command -v open ^>^&/dev/null; then
echo     open http://localhost:8000 2^>/dev/null ^&
echo fi
echo.
echo .venv/bin/python run.py
) > "%OUT_DIR%\start.sh"

echo [5/5] Creating ZIP...
powershell -Command "Compress-Archive -Path '%OUT_DIR%' -DestinationPath '%BUILD_DIR%\re-life.zip' -Force"

echo ============================================
echo   Build complete: build/re-life.zip
echo ============================================
pause
