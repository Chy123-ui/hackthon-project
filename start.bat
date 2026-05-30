@echo off
echo ============================================
echo  AI WenYou - Launching Backend + Frontend
echo ============================================
echo.

echo [Setup] Backend...
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo   Creating virtual environment...
    python -m venv .venv
)
echo   Syncing Python dependencies...
.venv\Scripts\pip install -q -r requirements.txt

echo.
echo [Setup] Frontend...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo   Installing Node dependencies...
    npm install
)

cd /d "%~dp0"

echo.
echo [1/2] Starting Backend (FastAPI) on port 8000...
start "AIWenYou-Backend" cmd /c "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Frontend (Vite) on port 5173...
start "AIWenYou-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.

echo [3/3] Opening browser...
start http://localhost:5173

echo.
echo Close the opened terminal windows to stop services.
pause
