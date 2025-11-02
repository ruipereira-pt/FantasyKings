/*
  # Cleanup Old Players and Associations
  
  This script removes all players created before October 25, 2024 (inclusive)
  and all their associated records to prevent duplicates.
  
  Tables affected:
  - team_players (references players)
  - player_performances (references players)
  - player_schedules (references players)
  - players (main table)
  
  IMPORTANT: Run this in your Supabase SQL Editor
*/

-- Step 1: Delete team_players associations for old players
DELETE FROM team_players 
WHERE player_id IN (
  SELECT id FROM players 
  WHERE created_at <= '2024-10-25 23:59:59'::timestamptz
);

-- Step 2: Delete player_performances for old players
DELETE FROM player_performances 
WHERE player_id IN (
  SELECT id FROM players 
  WHERE created_at <= '2024-10-25 23:59:59'::timestamptz
);

-- Step 3: Delete player_schedules for old players
DELETE FROM player_schedules 
WHERE player_id IN (
  SELECT id FROM players 
  WHERE created_at <= '2024-10-25 23:59:59'::timestamptz
);

-- Step 4: Delete the old players themselves
DELETE FROM players 
WHERE created_at <= '2024-10-25 23:59:59'::timestamptz;

-- Step 5: Show summary of remaining players
SELECT 
  COUNT(*) as total_players,
  MIN(created_at) as earliest_player,
  MAX(created_at) as latest_player
FROM players;
