#!/usr/bin/env bash
set -e

# Change directory to script directory
cd "$(dirname "$0")"

echo "=========================================================="
echo " Starting Mock Exam Platform Backend (FastAPI + MongoDB) "
echo "=========================================================="

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

echo "Starting Uvicorn server on http://localhost:8000..."
echo "Interactive Swagger Docs: http://localhost:8000/docs"
echo "ReDoc Documentation:    http://localhost:8000/redoc"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
