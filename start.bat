@echo off
echo ============================================
echo  AI WenYou - Launching Backend + Frontend
echo ============================================
echo.

echo [1/2] Starting Backend (FastAPI) on port 8000...
start "AIWenYou-Backend" cmd /c "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Frontend (Vite) on port 5173...
start "AIWenYou-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo.
echo Close the opened terminal windows to stop services.
pause
