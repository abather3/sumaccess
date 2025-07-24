#!/bin/bash
set -e

echo "Starting Railway build process..."

# Install dependencies (use npm install instead of npm ci to avoid cache conflicts)
echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Build completed successfully!"
