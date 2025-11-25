# Cleanup Duplicate Players Guide

## Overview

After updating the `fetch-rankings` Edge Function to normalize player names and prevent duplicates, you need to clean up existing duplicate players in your database.

## Options

### Option 1: Merge Duplicates (Recommended) ✅

**Pros:**

- Preserves all relationships (player_schedules, team_players, player_performances)
- Keeps historical data
- Safer approach

**Cons:**

- More complex
- Takes longer to run

**Use this if:**

- You have existing teams/competitions with players
- You want to preserve historical data
- You have relationships that need to be maintained

### Option 2: Truncate Table (Simple but Destructive) ⚠️

**Pros:**

- Simple and fast
- Clean slate

**Cons:**

- **DELETES ALL PLAYERS** and their relationships
- Loses all historical data
- Breaks existing teams/competitions

**Use this ONLY if:**

- You're in early development
- You don't have any active competitions
- You don't mind losing all player data

## Recommended Approach: Merge Duplicates

### Step 1: Review Duplicates First

Run this query to see what duplicates exist:

```sql
-- Preview duplicates
WITH normalized_players AS (
  SELECT
    id,
    name,
    CASE name
      WHEN 'C. Alcaraz' THEN 'Carlos Alcaraz'
      WHEN 'N. Djokovic' THEN 'Novak Djokovic'
      WHEN 'J. Sinner' THEN 'Jannik Sinner'
      WHEN 'A. Zverev' THEN 'Alexander Zverev'
      WHEN 'T. Fritz' THEN 'Taylor Fritz'
      WHEN 'D. Medvedev' THEN 'Daniil Medvedev'
      WHEN 'R. Nadal' THEN 'Rafael Nadal'
      WHEN 'A. Rublev' THEN 'Andrey Rublev'
      WHEN 'C. Ruud' THEN 'Casper Ruud'
      WHEN 'H. Hurkacz' THEN 'Hubert Hurkacz'
      ELSE name
    END as normalized_name
  FROM players
)
SELECT
  normalized_name,
  COUNT(*) as count,
  array_agg(name ORDER BY name) as original_names,
  array_agg(id::text ORDER BY name) as ids
FROM normalized_players
GROUP BY normalized_name
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

### Step 2: Run Merge Script

1. **Review the script first**: Open `merge-duplicate-players.sql`
2. **Test in a transaction**: The script uses BEGIN/COMMIT, so you can ROLLBACK if needed
3. **Run the script**: Execute it against your database

```bash
# Using Supabase CLI (local)
supabase db execute -f merge-duplicate-players.sql

# Or using psql
psql -h your-host -U postgres -d postgres -f merge-duplicate-players.sql
```

### Step 3: Verify Results

After running the merge script, verify:

```sql
-- Check total players
SELECT COUNT(*) as total_players FROM players;

-- Check for remaining duplicates
SELECT
  name,
  COUNT(*) as count
FROM players
GROUP BY name
HAVING COUNT(*) > 1;

-- Check a specific player (e.g., Alcaraz)
SELECT id, name, country, ranking, points
FROM players
WHERE name ILIKE '%alcaraz%';
```

## Alternative: Truncate (Only if Safe)

⚠️ **WARNING: This will delete ALL players and break relationships!**

```sql
BEGIN;

-- Disable foreign key checks temporarily (if needed)
SET session_replication_role = 'replica';

-- Delete all players (cascades to related tables)
TRUNCATE TABLE players CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

COMMIT;
```

Then run "Refresh Rankings" to repopulate with clean data.

## After Cleanup

1. **Deploy updated Edge Function**:

   ```bash
   supabase functions deploy fetch-rankings
   ```

2. **Test Refresh Rankings**:
   - Go to Admin > Player Management
   - Click "Refresh Rankings"
   - Verify no new duplicates are created

3. **Monitor**:
   - Check logs for any duplicate detection
   - Verify player names are normalized correctly

## Troubleshooting

### If merge fails due to foreign key constraints:

The script handles this, but if you encounter issues:

1. Check which tables reference players:

   ```sql
   SELECT
     tc.table_name,
     kcu.column_name,
     ccu.table_name AS foreign_table_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND ccu.table_name = 'players';
   ```

2. Manually update references before deleting duplicates

### If you need to expand name mappings:

Edit the `normalize_player_name()` function in the merge script to add more mappings.

## Next Steps

1. ✅ Run merge script to clean up duplicates
2. ✅ Deploy updated fetch-rankings Edge Function
3. ✅ Test "Refresh Rankings" functionality
4. ✅ Monitor for any new duplicates
