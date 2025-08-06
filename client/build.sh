#!/bin/bash

# Production Build Script for Render Deployment
echo "🚀 Starting production build for Elgar Admin Site..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the React app
echo "🏗️ Building React application..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Build files are in the 'build' directory"
