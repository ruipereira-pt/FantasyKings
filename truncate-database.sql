/*
  # Truncate Database - Start Fresh with Competitor ID Support
  
  This script removes all data from all tables while preserving the schema.
  This allows us to start fresh with the new competitor ID support.
  
  WARNING: This will delete ALL data in the database!
  Make sure you have backups if needed.
*/

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Truncate all tables in the correct order (respecting foreign key constraints)
TRUNCATE TABLE team_players CASCADE;
TRUNCATE TABLE player_performances CASCADE;
TRUNCATE TABLE player_schedules CASCADE;
TRUNCATE TABLE user_teams CASCADE;
TRUNCATE TABLE competitions CASCADE;
TRUNCATE TABLE tournaments CASCADE;
TRUNCATE TABLE players CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences (if any)
-- Note: PostgreSQL doesn't have sequences for UUID primary keys, but this is here for completeness

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
  'user_teams' as table_name, 
  COUNT(*) as remaining_records 
FROM user_teams
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
