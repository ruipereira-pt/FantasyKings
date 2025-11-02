/*
  # Truncate Players Table Only
  
  This script removes only players and their direct associations,
  preserving all other data (competitions, tournaments, etc.).
*/

-- Remove player associations first (to avoid foreign key constraint errors)
DELETE FROM team_players;
DELETE FROM player_performances;
DELETE FROM player_schedules;

-- Remove all players
DELETE FROM players;

-- Show summary
SELECT 
  'players' as table_name, 
  COUNT(*) as remaining_records 
FROM players
UNION ALL
SELECT 
  'team_players' as table_name, 
  COUNT(*) as remaining_records 
FROM team_players
UNION ALL
SELECT 
  'player_performances' as table_name, 
  COUNT(*) as remaining_records 
FROM player_performances
UNION ALL
SELECT 
  'player_schedules' as table_name, 
  COUNT(*) as remaining_records 
FROM player_schedules;
