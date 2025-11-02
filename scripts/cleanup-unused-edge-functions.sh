#!/bin/bash

# Cleanup Unused Edge Functions from Supabase
# This script deletes edge functions that are no longer in the codebase

set -e

SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"

if [ -z "$SUPABASE_PROJECT_REF" ] || [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN must be set"
  echo "Usage: SUPABASE_PROJECT_REF=xxx SUPABASE_ACCESS_TOKEN=xxx ./scripts/cleanup-unused-edge-functions.sh"
  exit 1
fi

# Functions to delete (not in codebase)
FUNCTIONS_TO_DELETE=(
  "fetch-atp-rankings"
  "fetch-tournament-players"
  "fetch-tournament-draws-final"
  "fetch-daily-schedule"
  "fetch-tournament-players-test"
  "populate-tournaments"
  "fetch-tournaments-sportradar"
)

echo "🗑️  Cleaning up unused edge functions from Supabase..."
echo ""

for func in "${FUNCTIONS_TO_DELETE[@]}"; do
  echo "Deleting: $func"
  
  # Use Supabase CLI to delete the function
  supabase functions delete "$func" \
    --project-ref "$SUPABASE_PROJECT_REF" \
    --access-token "$SUPABASE_ACCESS_TOKEN" || {
      echo "  ⚠️  Failed to delete $func (might not exist)"
    }
  
  echo "  ✓ $func deleted"
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Remaining functions should be:"
echo "  - fetch-rankings"
echo "  - fetch-tournament-schedules"
echo "  - fetch-tournaments-schedule"
echo "  - fetch-player-schedules"

