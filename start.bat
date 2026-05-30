@echo off
chcp 65001 >nul
title AI WenYou - Launcher

echo ============================================
echo  AI WenYou - Backend Setup
echo ============================================
echo.

cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Creating Python virtual environment...
    python -m venv .venv
)
echo [2/3] Syncing Python dependencies...
.venv\Scripts\pip install -q -r requirements.txt --timeout 120 --retries 3
echo   Done.

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [3/3] Installing Node dependencies...
    call npm install
)

echo ============================================
echo  AI WenYou - Starting Services
echo ============================================
echo.

cd /d "%~dp0"

echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.

echo Starting Backend (FastAPI)...
start "AIWenYou-Backend" cmd /c "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Starting Frontend (Vite)...
start "AIWenYou-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo ============================================
echo  Services are starting in separate windows.
echo  Close them to stop, or close this window.
echo ============================================
pause
