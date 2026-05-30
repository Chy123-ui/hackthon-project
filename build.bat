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
cmd /c "npm run build" >nul 2>&1
if errorlevel 1 ( echo Frontend build failed & exit /b 1 )

echo [2/4] Clearing build dir...
rmdir /S /Q "%BUILD_DIR%" 2>nul
mkdir "%OUT_DIR%"
mkdir "%OUT_DIR%\data"

echo [3/4] Preparing Python deps...
cd /d "%BACKEND_DIR%"
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
)
.venv\Scripts\pip install -q -r requirements.txt

echo [4/4] Copying files...
robocopy ".venv" "%OUT_DIR%\.venv" /E /NFL /NDL /NJH /NJS >nul
robocopy "app" "%OUT_DIR%\app" /E /NFL /NDL /NJH /NJS >nul
robocopy "protocol" "%OUT_DIR%\protocol" /E /NFL /NDL /NJH /NJS >nul
robocopy "default_worlds" "%OUT_DIR%\default_worlds" /E /NFL /NDL /NJH /NJS >nul
robocopy "%FRONTEND_DIR%\dist" "%OUT_DIR%\dist" /E /NFL /NDL /NJH /NJS >nul

echo @echo off > "%OUT_DIR%\start.bat"
echo cd /d "%%~dp0" >> "%OUT_DIR%\start.bat"
echo start "" http://localhost:8000 >> "%OUT_DIR%\start.bat"
echo .venv\Scripts\python run.py >> "%OUT_DIR%\start.bat"
copy "%BACKEND_DIR%\run.py" "%OUT_DIR%\run.py" >nul

echo [5/5] Creating README + ZIP...
(
echo # re:life
echo.
echo ## 使用方法
echo.
echo 1. 双击 start.bat 启动
echo 2. 浏览器会自动打开 http://localhost:8000
echo 3. 首次使用需在 Settings 页面填写 API Key、Base URL、Model
echo 4. 在 Game 页面选择世界、输入角色名开始游戏
echo.
echo ## 数据存储
echo.
echo 所有用户数据保存在 data/ 目录下：
echo - data/worlds/  世界模板
echo - data/sessions/ 游戏存档
echo.
echo 如需重置，删除 data/ 文件夹即可。
echo.
echo ## 系统要求
echo.
echo - Windows 10+ / macOS / Linux
echo - Python 3.10+ (已内置)
echo - 无需联网安装额外依赖
) > "%OUT_DIR%\README.md"

powershell -Command "Compress-Archive -Path '%OUT_DIR%' -DestinationPath '%BUILD_DIR%\re-life.zip' -Force"

echo.
echo ============================================
echo   Build complete:
echo     build/re-life/     (文件夹)
echo     build/re-life.zip  (压缩包)
echo ============================================
pause
