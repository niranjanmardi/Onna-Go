#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "==> 1. Building ONNA-GO Frontend (React + Vite)..."
cd frontend
npm ci || npm install
npm run build
cd ..

echo "==> 2. Installing Backend Python Dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

echo "==> 3. Initializing Database & Upload Directories..."
mkdir -p backend/uploads

echo "==> Build finished successfully! Ready to start ONNA-GO."
