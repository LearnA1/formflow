#!/bin/bash

echo "Starting FormFlow..."

echo "Stopping old servers if running..."
kill -9 $(lsof -ti :8000) 2>/dev/null
kill -9 $(lsof -ti :5173) 2>/dev/null
kill -9 $(lsof -ti :5174) 2>/dev/null
kill -9 $(lsof -ti :5175) 2>/dev/null

# Start backend
echo "Starting FastAPI backend..."
cd formflow-backend || exit

if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

cd ..

# Start frontend
echo "Starting React frontend..."
cd formflow-frontend || exit
npm install
npm run dev -- --port 5173 &
FRONTEND_PID=$!

echo "--------------------------------------"
echo "FormFlow is running!"
echo "Backend:  http://127.0.0.1:8000"
echo "API Docs: http://127.0.0.1:8000/docs"
echo "Frontend: http://localhost:5173"
echo "--------------------------------------"

wait $BACKEND_PID $FRONTEND_PID