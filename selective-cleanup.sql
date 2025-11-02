/*
  # Selective Cleanup - Remove Only Players and Direct Associations
  
  This script removes only players and their direct associations,
  preserving competitions, tournaments, and other data.
*/

-- Remove player associations first
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
  'tournaments' as table_name, 
  COUNT(*) as remaining_records 
FROM tournaments
UNION ALL
SELECT 
  'competitions' as table_name, 
  COUNT(*) as remaining_records 
FROM competitions
UNION ALL
SELECT 
  'player_schedules' as table_name, 
  COUNT(*) as remaining_records 
FROM player_schedules
UNION ALL
SELECT 
  'team_players' as table_name, 
  COUNT(*) as remaining_records 
FROM team_players
UNION ALL
SELECT 
  'player_performances' as table_name, 
  COUNT(*) as remaining_records 
FROM player_performances;
