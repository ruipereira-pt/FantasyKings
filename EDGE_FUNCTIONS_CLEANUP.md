# Edge Functions Cleanup Guide

## Current State

Based on the Supabase dashboard, there are **11 functions deployed**, but only **4 are actively used** in the codebase.

## Functions to Keep ✅

These functions are actively used and should remain:

1. **`fetch-rankings`**
   - Fetches ATP rankings from SportsRadar
   - Used in: `initializeData.ts`, `api.ts`, `PlayerManagement.tsx`

2. **`fetch-tournament-schedules`**
   - Fetches tournament schedules
   - Used in: `initializeData.ts`, `api.ts`, `Schedule.tsx`

3. **`fetch-tournaments-schedule`**
   - Syncs competition/season data from SportsRadar (admin)
   - Used in: `CompetitionManagement.tsx`

4. **`fetch-player-schedules`**
   - Fetches player schedules for tournaments
   - Used in: `api.ts`, `TeamBuilder.tsx`

## Functions to Delete ❌

These functions are **not in the codebase** and should be deleted:

1. **`fetch-atp-rankings`** - Replaced by `fetch-rankings`
2. **`fetch-tournament-players`** - Not used anywhere
3. **`fetch-tournament-draws-final`** - Not used anywhere
4. **`fetch-daily-schedule`** - Not used anywhere
5. **`fetch-tournament-players-test`** - Test function, not needed
6. **`populate-tournaments`** - Not used anywhere
7. **`fetch-tournaments-sportradar`** - Deleted in PR #30, replaced by `fetch-tournaments-schedule`

## How to Clean Up

### Option 1: Manual Deletion (Recommended for Safety)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Edge Functions**
3. For each unused function:
   - Click on the function name
   - Click the **Delete** button (or trash icon)
   - Confirm deletion

### Option 2: Script-Based Deletion

Use the provided cleanup script:

```bash
# Set your credentials
export SUPABASE_PROJECT_REF="your-project-ref"
export SUPABASE_ACCESS_TOKEN="your-access-token"

# Run the cleanup script
./scripts/cleanup-unused-edge-functions.sh
```

**Note:** Make sure you have the Supabase CLI installed:

```bash
npm install -g supabase
```

### Option 3: Supabase CLI (Individual)

Delete functions one by one:

```bash
supabase functions delete fetch-atp-rankings \
  --project-ref YOUR_PROJECT_REF \
  --access-token YOUR_ACCESS_TOKEN

supabase functions delete fetch-tournament-players \
  --project-ref YOUR_PROJECT_REF \
  --access-token YOUR_ACCESS_TOKEN

# ... repeat for each function
```

## Verification

After cleanup, verify in Supabase Dashboard that only these 4 functions remain:

- ✅ `fetch-rankings`
- ✅ `fetch-tournament-schedules`
- ✅ `fetch-tournaments-schedule`
- ✅ `fetch-player-schedules`

## Automatic Cleanup (Future)

After PR #29 merges, the automatic deployment will:

- Only deploy the 4 active functions
- Skip deleted functions automatically
- Keep Supabase in sync with the codebase

However, you still need to **manually delete the old functions** that are already deployed but no longer in the codebase.

## Safety Notes

⚠️ **Before deleting:**

- Double-check that functions are not being called from anywhere
- Consider keeping a backup/export if needed
- Delete test functions (`fetch-tournament-players-test`) first as they're safe

✅ **After PR #30 merges:**

- `fetch-tournaments-sportradar` will be automatically removed from future deployments
- But it will still exist in Supabase until manually deleted
