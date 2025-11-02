#!/bin/bash
# Vercel Ignore Build Step
# This script tells Vercel to skip deployment unless on main branch

# Get the branch name from Vercel environment variable
BRANCH="${VERCEL_GIT_COMMIT_REF:-}"

# Get pull request number if this is a PR
PR_NUMBER="${VERCEL_GIT_PULL_REQUEST_ID:-}"

echo "🔍 Checking deployment conditions..."
echo "   Branch: ${BRANCH:-'unknown'}"
echo "   PR Number: ${PR_NUMBER:-'none (not a PR)'}"

# Skip deployment if:
# 1. This is a pull request (PR_NUMBER is set)
# 2. Branch is not main
if [ -n "$PR_NUMBER" ]; then
  echo "❌ Skipping deployment: This is a pull request (PR #$PR_NUMBER)"
  echo "   Deployment will happen automatically when PR is merged to main"
  exit 1
fi

if [ "$BRANCH" != "main" ] && [ -n "$BRANCH" ]; then
  echo "❌ Skipping deployment: Branch '$BRANCH' is not main"
  echo "   Only main branch triggers production deployments"
  exit 1
fi

# Allow deployment only for main branch
if [ "$BRANCH" = "main" ]; then
  echo "✅ Allowing deployment: Branch is main"
  exit 0
fi

# Default: skip deployment if we can't determine the branch
echo "⚠️  Skipping deployment: Cannot determine branch"
exit 1

