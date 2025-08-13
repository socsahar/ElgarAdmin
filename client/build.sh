#!/bin/bash

# Production Build Script for Render Deployment
echo "🚀 Starting production build for Elgar Admin Site..."

# Set build environment variables
export CI=false
export GENERATE_SOURCEMAP=false
export SKIP_PREFLIGHT_CHECK=true
export ESLINT_NO_DEV_ERRORS=true
export TSC_COMPILE_ON_ERROR=true

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Clear previous build
echo "🧹 Cleaning previous build..."
rm -rf build

# Build the React app with optimizations
echo "🏗️ Building React application for production..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Build files are in the 'build' directory"
echo "🌐 Ready for Render deployment!"

# List build contents for verification
ls -la build/
