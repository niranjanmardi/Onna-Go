#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "==> 1. Preparing ONNA-GO Frontend (React + Vite)..."
if [ -d "frontend/dist" ] && [ -f "frontend/dist/index.html" ]; then
    echo "Using pre-built frontend distribution from repository."
elif command -v npm >/dev/null 2>&1; then
    echo "npm detected: building frontend assets..."
    cd frontend
    npm install
    npm run build
    cd ..
else
    echo "Warning: npm not found in environment and frontend/dist missing. Please build locally."
fi

echo "==> 2. Installing Backend Python Dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "==> 3. Initializing Database & Upload Directories..."
mkdir -p backend/uploads

echo "==> Build finished successfully! Ready to start ONNA-GO."
