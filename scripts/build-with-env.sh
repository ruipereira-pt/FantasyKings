#!/bin/bash
# Build script that uses environment variables from .env file
# Usage: ./scripts/build-with-env.sh

set -e  # Exit on error

echo "🔨 Building application with environment variables..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
    exit 1
fi

# Load environment variables from .env
export $(cat .env | grep -v '^#' | xargs)

# Verify required variables are set
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ Error: VITE_SUPABASE_URL not found in .env"
    exit 1
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: VITE_SUPABASE_ANON_KEY not found in .env"
    exit 1
fi

echo "✅ Environment variables loaded"
echo "   VITE_SUPABASE_URL: ${VITE_SUPABASE_URL:0:30}..."
echo "   VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY:0:30}..."

# Build the application
echo ""
echo "📦 Building..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo "   Build output: ./dist"
    echo ""
    echo "🚀 Ready to deploy!"
    echo "   You can preview with: npm run preview"
else
    echo ""
    echo "❌ Build failed!"
    exit 1
fi

