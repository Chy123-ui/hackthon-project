@echo off
chcp 65001 >nul
cd /d "%~dp0backend"
echo Starting backend server...
echo.
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
echo.
echo Server stopped.
pause
