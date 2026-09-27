#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Install frontend dependencies
npm install

# Build the frontend
npm run build

# Install backend dependencies
pip install -r backend/requirements.txt

# Start the backend server
exec uvicorn backend.main:app --host 0.0.0.0 --port $PORT
