/*
  # Preview Cleanup - See What Will Be Deleted
  
  Run this first to see what records will be affected before running the actual cleanup.
*/

-- Preview: Count old players
SELECT 
  COUNT(*) as old_players_count,
  MIN(created_at) as earliest_date,
  MAX(created_at) as latest_date
FROM players 
WHERE created_at <= '2024-10-25 23:59:59'::timestamptz;

-- Preview: Count team_players associations that will be deleted
SELECT COUNT(*) as team_players_to_delete
FROM team_players 
WHERE player_id IN (
  SELECT id FROM players 
  WHERE created_at <= '2024-10-25 23:59:59'::timestamptz
);

-- Preview: Count player_performances that will be deleted
SELECT COUNT(*) as player_performances_to_delete
FROM player_performances 
WHERE player_id IN (
  SELECT id FROM players 
  WHERE created_at <= '2024-10-25 23:59:59'::timestamptz
);

-- Preview: Count player_schedules that will be deleted
SELECT COUNT(*) as player_schedules_to_delete
FROM player_schedules 
WHERE player_id IN (
  SELECT id FROM players 
  WHERE created_at <= '2024-10-25 23:59:59'::timestamptz
);

-- Preview: Show some sample old players
SELECT id, name, country, created_at
FROM players 
WHERE created_at <= '2024-10-25 23:59:59'::timestamptz
ORDER BY created_at DESC
LIMIT 10;
