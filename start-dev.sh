#!/bin/bash
echo "============================================"
echo "  AI WenYou - Backend Setup"
echo "============================================"
echo ""

cd "$(dirname "$0")/backend"

if [ ! -f ".venv/bin/python" ]; then
    echo "[1/3] Creating Python virtual environment..."
    python3 -m venv .venv
fi
echo "[2/3] Syncing Python dependencies..."
.venv/bin/pip install -q -r requirements.txt
echo "  Done."

cd "$(dirname "$0")/frontend"

if [ ! -d "node_modules" ]; then
    echo "[3/3] Installing Node dependencies..."
    npm install
fi

cd "$(dirname "$0")"

echo ""
echo "============================================"
echo "  AI WenYou - Starting Services"
echo "============================================"
echo ""

echo "Starting Backend (FastAPI)..."
cd backend && .venv/bin/python run.py &
BACKEND_PID=$!

sleep 2

echo "Starting Frontend (Vite)..."
cd "$(dirname "$0")/frontend" && npm run dev &
FRONTEND_PID=$!

sleep 3

echo "Opening browser..."
open http://localhost:5173

echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""

wait $BACKEND_PID $FRONTEND_PID
