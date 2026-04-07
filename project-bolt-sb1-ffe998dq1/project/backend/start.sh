#!/bin/bash
# Startup script for ML API and React app

echo "Starting Crop Disease Detection System..."

# Check if Python dependencies are installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed."
    exit 1
fi

# Install Python dependencies if requirements.txt exists
if [ -f "ml/requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip3 install -r ml/requirements.txt
fi

# Start ML API in background
echo "Starting ML API server..."
cd ml
python3 inference_api.py &
ML_PID=$!
cd ..

# Wait a moment for API to start
sleep 3

# Check if ML API is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo "ML API started successfully on http://localhost:8000"
else
    echo "Warning: ML API may not be running properly"
fi

# Install Node.js dependencies if needed
if [ -f "package.json" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Start React development server
echo "Starting React development server..."
npm run dev &
REACT_PID=$!

echo "System started!"
echo "ML API: http://localhost:8000"
echo "React App: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo "Stopping services..."
    kill $ML_PID 2>/dev/null
    kill $REACT_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT

# Wait for processes
wait
