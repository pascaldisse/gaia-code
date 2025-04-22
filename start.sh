#!/bin/bash

# Change to the project directory
cd "$(dirname "$0")"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm run install:all
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
  echo "Creating .env file..."
  cp backend/.env.example backend/.env
  echo "Please edit the backend/.env file with your configuration."
  exit 1
fi

# Start the application
echo "Starting Gaia Manager..."
npm start