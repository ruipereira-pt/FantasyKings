-- Merge Duplicate Players Script
-- 
-- This script identifies and merges duplicate players (e.g., "C. Alcaraz" and "Carlos Alcaraz")
-- It preserves all relationships (player_schedules, team_players, player_performances)
-- 
-- Strategy:
-- 1. Identify duplicate groups using normalized names
-- 2. Choose the "best" player record (one with better ranking/data)
-- 3. Update all foreign key references to point to the kept player
-- 4. Delete duplicate records
--
-- Usage:
--   Review the duplicates first with the SELECT queries below
--   Then run the merge operations in a transaction

BEGIN;

-- Step 1: Create a function to normalize player names (same logic as Edge Function)
CREATE OR REPLACE FUNCTION normalize_player_name(name text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  -- Remove extra whitespace
  normalized := trim(regexp_replace(name, '\s+', ' ', 'g'));
  
  -- Common name mappings (expand as needed)
  CASE normalized
    WHEN 'C. Alcaraz' THEN RETURN 'Carlos Alcaraz';
    WHEN 'N. Djokovic' THEN RETURN 'Novak Djokovic';
    WHEN 'J. Sinner' THEN RETURN 'Jannik Sinner';
    WHEN 'A. Zverev' THEN RETURN 'Alexander Zverev';
    WHEN 'T. Fritz' THEN RETURN 'Taylor Fritz';
    WHEN 'D. Medvedev' THEN RETURN 'Daniil Medvedev';
    WHEN 'R. Nadal' THEN RETURN 'Rafael Nadal';
    WHEN 'A. Rublev' THEN RETURN 'Andrey Rublev';
    WHEN 'C. Ruud' THEN RETURN 'Casper Ruud';
    WHEN 'H. Hurkacz' THEN RETURN 'Hubert Hurkacz';
    ELSE RETURN normalized;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create a function to create search key (for fuzzy matching)
CREATE OR REPLACE FUNCTION create_search_key(name text)
RETURNS text AS $$
BEGIN
  -- Simple normalization without unaccent extension
  RETURN lower(
    regexp_replace(
      regexp_replace(
        name,
        '[^a-z0-9\s]', '', 'gi'  -- Remove special characters (case insensitive)
      ),
      '\s+', ' ', 'g'  -- Normalize whitespace
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Identify duplicate groups
-- This shows potential duplicates that need to be merged
CREATE TEMP TABLE duplicate_groups AS
WITH normalized_players AS (
  SELECT 
    id,
    name,
    normalize_player_name(name) as normalized_name,
    create_search_key(name) as search_key,
    country,
    ranking,
    live_ranking,
    points,
    atp_id,
    created_at,
    updated_at
  FROM players
),
grouped AS (
  SELECT 
    normalized_name,
    search_key,
    array_agg(id ORDER BY 
      -- Prefer player with better ranking (lower is better)
      CASE WHEN ranking IS NOT NULL AND ranking > 0 THEN ranking ELSE 999 END,
      -- Prefer player with more complete data
      CASE WHEN country IS NOT NULL THEN 0 ELSE 1 END,
      -- Prefer player with atp_id
      CASE WHEN atp_id IS NOT NULL THEN 0 ELSE 1 END,
      -- Prefer older record (more established)
      created_at
    ) as player_ids,
    COUNT(*) as dup_count
  FROM normalized_players
  GROUP BY normalized_name, search_key
  HAVING COUNT(*) > 1
)
SELECT * FROM grouped;

-- Step 4: Preview duplicates (run this first to review)
SELECT 
  dg.normalized_name,
  dg.dup_count,
  p.id,
  p.name as original_name,
  p.country,
  p.ranking,
  p.points,
  p.atp_id,
  -- Count relationships
  (SELECT COUNT(*) FROM player_schedules ps WHERE ps.player_id = p.id) as schedule_count,
  (SELECT COUNT(*) FROM team_players tp WHERE tp.player_id = p.id) as team_count,
  (SELECT COUNT(*) FROM player_performances pp WHERE pp.player_id = p.id) as performance_count
FROM duplicate_groups dg
CROSS JOIN LATERAL unnest(dg.player_ids) as player_id
JOIN players p ON p.id = player_id
ORDER BY dg.normalized_name, 
  -- Order by "best" player first (will be kept)
  CASE WHEN p.ranking IS NOT NULL AND p.ranking > 0 THEN p.ranking ELSE 999 END,
  CASE WHEN p.country IS NOT NULL THEN 0 ELSE 1 END,
  CASE WHEN p.atp_id IS NOT NULL THEN 0 ELSE 1 END,
  p.created_at;

-- Step 5: Create a mapping table of duplicates to merge
CREATE TEMP TABLE player_merge_map AS
SELECT 
  dg.player_ids[1] as keep_id,  -- First ID is the "best" one
  unnest(dg.player_ids[2:]) as duplicate_id  -- All others are duplicates
FROM duplicate_groups dg
WHERE array_length(dg.player_ids, 1) > 1;

-- Step 6: Preview merge operations (review before committing)
SELECT 
  p1.id as keep_id,
  p1.name as keep_name,
  p1.ranking as keep_ranking,
  p1.country as keep_country,
  p2.id as duplicate_id,
  p2.name as duplicate_name,
  p2.ranking as duplicate_ranking,
  p2.country as duplicate_country,
  -- Count what will be updated
  (SELECT COUNT(*) FROM player_schedules ps WHERE ps.player_id = p2.id) as schedules_to_update,
  (SELECT COUNT(*) FROM team_players tp WHERE tp.player_id = p2.id) as teams_to_update,
  (SELECT COUNT(*) FROM player_performances pp WHERE pp.player_id = p2.id) as performances_to_update
FROM player_merge_map pmm
JOIN players p1 ON p1.id = pmm.keep_id
JOIN players p2 ON p2.id = pmm.duplicate_id
ORDER BY p1.name;

-- Step 7: Update player_schedules to point to kept player
UPDATE player_schedules ps
SET player_id = pmm.keep_id
FROM player_merge_map pmm
WHERE ps.player_id = pmm.duplicate_id
  AND NOT EXISTS (
    -- Avoid duplicate schedule entries
    SELECT 1 FROM player_schedules ps2 
    WHERE ps2.player_id = pmm.keep_id 
      AND ps2.tournament_id = ps.tournament_id
  );

-- Delete remaining duplicate schedules (after merging)
DELETE FROM player_schedules ps
USING player_merge_map pmm
WHERE ps.player_id = pmm.duplicate_id;

-- Step 8: Update team_players to point to kept player
UPDATE team_players tp
SET player_id = pmm.keep_id
FROM player_merge_map pmm
WHERE tp.player_id = pmm.duplicate_id
  AND NOT EXISTS (
    -- Avoid duplicate team entries
    SELECT 1 FROM team_players tp2 
    WHERE tp2.user_team_id = tp.user_team_id 
      AND tp2.player_id = pmm.keep_id
      AND (
        (tp2.removed_at IS NULL AND tp.removed_at IS NULL) OR
        (tp2.removed_at IS NOT NULL AND tp.removed_at IS NOT NULL)
      )
  );

-- Delete remaining duplicate team entries
DELETE FROM team_players tp
USING player_merge_map pmm
WHERE tp.player_id = pmm.duplicate_id;

-- Step 9: Update player_performances to point to kept player
UPDATE player_performances pp
SET player_id = pmm.keep_id,
    updated_at = now()
FROM player_merge_map pmm
WHERE pp.player_id = pmm.duplicate_id
  AND NOT EXISTS (
    -- Avoid duplicate performance entries
    SELECT 1 FROM player_performances pp2 
    WHERE pp2.player_id = pmm.keep_id 
      AND pp2.tournament_id = pp.tournament_id
  );

-- Delete remaining duplicate performances
DELETE FROM player_performances pp
USING player_merge_map pmm
WHERE pp.player_id = pmm.duplicate_id;

-- Step 10: Update kept player with best data from duplicates
UPDATE players p
SET 
  name = normalize_player_name(p.name),  -- Normalize name
  country = COALESCE(
    p.country,
    (SELECT country FROM players p2 
     JOIN player_merge_map pmm ON p2.id = pmm.duplicate_id 
     WHERE pmm.keep_id = p.id AND p2.country IS NOT NULL 
     LIMIT 1)
  ),
  ranking = COALESCE(
    NULLIF(p.ranking, 0),
    (SELECT ranking FROM players p2 
     JOIN player_merge_map pmm ON p2.id = pmm.duplicate_id 
     WHERE pmm.keep_id = p.id AND p2.ranking IS NOT NULL AND p2.ranking > 0
     ORDER BY p2.ranking LIMIT 1)
  ),
  live_ranking = COALESCE(
    NULLIF(p.live_ranking, 0),
    (SELECT live_ranking FROM players p2 
     JOIN player_merge_map pmm ON p2.id = pmm.duplicate_id 
     WHERE pmm.keep_id = p.id AND p2.live_ranking IS NOT NULL AND p2.live_ranking > 0
     ORDER BY p2.live_ranking LIMIT 1)
  ),
  points = GREATEST(
    COALESCE(p.points, 0),
    (SELECT COALESCE(MAX(points), 0) FROM players p2 
     JOIN player_merge_map pmm ON p2.id = pmm.duplicate_id 
     WHERE pmm.keep_id = p.id)
  ),
  atp_id = COALESCE(
    p.atp_id,
    (SELECT atp_id FROM players p2 
     JOIN player_merge_map pmm ON p2.id = pmm.duplicate_id 
     WHERE pmm.keep_id = p.id AND p2.atp_id IS NOT NULL 
     LIMIT 1)
  ),
  updated_at = now()
FROM player_merge_map pmm
WHERE p.id = pmm.keep_id;

-- Step 11: Delete duplicate player records
DELETE FROM players p
USING player_merge_map pmm
WHERE p.id = pmm.duplicate_id;

-- Step 12: Verify results
SELECT 
  'After merge' as status,
  COUNT(*) as total_players,
  COUNT(DISTINCT normalize_player_name(name)) as unique_normalized_names
FROM players;

-- Show any remaining potential duplicates
SELECT 
  normalize_player_name(name) as normalized_name,
  COUNT(*) as count,
  array_agg(name ORDER BY name) as names
FROM players
GROUP BY normalize_player_name(name)
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Cleanup temporary functions (optional - you may want to keep them)
-- DROP FUNCTION IF EXISTS normalize_player_name(text);
-- DROP FUNCTION IF EXISTS create_search_key(text);

-- ROLLBACK;  -- Uncomment to rollback and review first
COMMIT;

-- Final verification query
SELECT 
  id,
  name,
  normalize_player_name(name) as normalized_name,
  country,
  ranking,
  points
FROM players
ORDER BY ranking NULLS LAST, name
LIMIT 50;

