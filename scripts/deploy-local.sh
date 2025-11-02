#!/bin/bash
# Local deploy script - builds and prepares for deployment
# Usage: ./scripts/deploy-local.sh

set -e

echo "🚀 Local Deploy Script"
echo "===================="
echo ""

# Step 1: Build
echo "Step 1: Building application..."
./scripts/build-with-env.sh

# Step 2: Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Build directory 'dist' not found!"
    exit 1
fi

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📊 Build Info:"
echo "   - Build directory: ./dist"
echo "   - Size: $(du -sh dist | cut -f1)"
echo ""
echo "📝 Next Steps:"
echo "   1. For Bolt.host: Set environment variables in dashboard, then push to main"
echo "   2. For GitHub Actions: Ensure secrets are set, then push to main"
echo "   3. For manual deployment: Upload ./dist folder to your hosting provider"
echo ""

