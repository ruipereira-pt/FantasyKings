-- Update Player Rankings from Scraped ATP Data
-- 
-- This script updates player rankings based on data scraped from ATP website.
-- It handles:
-- 1. Updating existing players (by name or sportradar_competitor_id)
-- 2. Inserting new players
-- 3. Setting rankings to 500+ for players not in the new rankings
-- 4. Recalculating prices based on new rankings
--
-- Usage:
--   1. Scrape ATP rankings data (see guide in comments)
--   2. Import data into temp_rankings table (see examples below)
--   3. Run this script
--
-- Data Format Expected:
--   - rank: integer (1-500+)
--   - name: text (player full name)
--   - country: text (country code, e.g., 'USA', 'ESP')
--   - points: integer (ATP ranking points)
--   - sportradar_competitor_id: text (optional, e.g., 'sr:competitor:12345')
--   - age: integer (optional)

BEGIN;

-- Step 1: Create temporary table for scraped ranking data
-- This table will hold the data you import from your scraper
CREATE TEMP TABLE IF NOT EXISTS temp_rankings (
  rank integer NOT NULL,
  name text NOT NULL,
  country text,
  points integer DEFAULT 0,
  sportradar_competitor_id text,
  age integer,
  PRIMARY KEY (rank, name)
);

-- Step 2: Example data insertion (replace with your actual scraped data)
-- Option A: Insert from JSON (if you have JSON data)
-- INSERT INTO temp_rankings (rank, name, country, points, sportradar_competitor_id, age)
-- SELECT 
--   (json_data->>'rank')::integer,
--   json_data->>'name',
--   json_data->>'country',
--   COALESCE((json_data->>'points')::integer, 0),
--   json_data->>'sportradar_competitor_id',
--   (json_data->>'age')::integer
-- FROM json_array_elements('[
--   {"rank": 1, "name": "Novak Djokovic", "country": "SRB", "points": 9795, "sportradar_competitor_id": "sr:competitor:12345", "age": 37},
--   {"rank": 2, "name": "Carlos Alcaraz", "country": "ESP", "points": 8855, "sportradar_competitor_id": "sr:competitor:67890", "age": 21}
-- ]'::json) AS json_data;

-- Option B: Insert from CSV (if you have CSV data)
-- COPY temp_rankings (rank, name, country, points, sportradar_competitor_id, age)
-- FROM '/path/to/rankings.csv' WITH (FORMAT csv, HEADER true);

-- Option C: Manual INSERT statements (for testing)
-- INSERT INTO temp_rankings (rank, name, country, points, sportradar_competitor_id, age) VALUES
--   (1, 'Novak Djokovic', 'SRB', 9795, 'sr:competitor:12345', 37),
--   (2, 'Carlos Alcaraz', 'ESP', 8855, 'sr:competitor:67890', 21),
--   (3, 'Daniil Medvedev', 'RUS', 7600, 'sr:competitor:11111', 28);

-- Step 3: Track which players we've processed
CREATE TEMP TABLE IF NOT EXISTS processed_players AS
SELECT DISTINCT
  COALESCE(tr.sportradar_competitor_id, tr.name) as identifier
FROM temp_rankings tr;

-- Step 4: Update existing players by sportradar_competitor_id (most reliable)
UPDATE players p
SET
  name = tr.name,
  country = COALESCE(tr.country, p.country),
  ranking = tr.rank,
  live_ranking = tr.rank,
  points = tr.points,
  price = calculate_player_price(tr.rank),
  updated_at = now()
FROM temp_rankings tr
WHERE p.sportradar_competitor_id IS NOT NULL
  AND p.sportradar_competitor_id = tr.sportradar_competitor_id
  AND tr.sportradar_competitor_id IS NOT NULL;

-- Step 5: Update existing players by name (fallback for players without competitor_id)
UPDATE players p
SET
  name = tr.name,
  country = COALESCE(tr.country, p.country),
  ranking = tr.rank,
  live_ranking = tr.rank,
  points = tr.points,
  price = calculate_player_price(tr.rank),
  updated_at = now()
FROM temp_rankings tr
WHERE p.sportradar_competitor_id IS NULL
  AND LOWER(TRIM(p.name)) = LOWER(TRIM(tr.name))
  AND NOT EXISTS (
    SELECT 1 FROM players p2
    WHERE p2.sportradar_competitor_id = tr.sportradar_competitor_id
      AND tr.sportradar_competitor_id IS NOT NULL
  );

-- Step 6: Insert new players that don't exist yet
INSERT INTO players (name, country, ranking, live_ranking, points, price, sportradar_competitor_id, created_at, updated_at)
SELECT
  tr.name,
  tr.country,
  tr.rank,
  tr.rank,
  tr.points,
  calculate_player_price(tr.rank),
  tr.sportradar_competitor_id,
  now(),
  now()
FROM temp_rankings tr
WHERE NOT EXISTS (
  SELECT 1 FROM players p
  WHERE (
    (p.sportradar_competitor_id IS NOT NULL 
     AND p.sportradar_competitor_id = tr.sportradar_competitor_id
     AND tr.sportradar_competitor_id IS NOT NULL)
    OR
    (p.sportradar_competitor_id IS NULL 
     AND LOWER(TRIM(p.name)) = LOWER(TRIM(tr.name)))
  )
);

-- Step 7: Set ranking to 500+ for players not in the new rankings
-- Only update players who currently have a ranking (don't override unranked players)
UPDATE players p
SET
  ranking = 500,
  live_ranking = 500,
  points = 0,
  price = calculate_player_price(500),
  updated_at = now()
WHERE p.ranking IS NOT NULL
  AND p.ranking < 500
  AND NOT EXISTS (
    SELECT 1 FROM processed_players pp
    WHERE pp.identifier = COALESCE(p.sportradar_competitor_id, p.name)
  );

-- Step 8: Summary statistics
DO $$
DECLARE
  updated_count integer;
  inserted_count integer;
  unranked_count integer;
  total_in_rankings integer;
BEGIN
  -- Count updates
  SELECT COUNT(*) INTO updated_count
  FROM players p
  WHERE EXISTS (
    SELECT 1 FROM temp_rankings tr
    WHERE (
      (p.sportradar_competitor_id IS NOT NULL 
       AND p.sportradar_competitor_id = tr.sportradar_competitor_id
       AND tr.sportradar_competitor_id IS NOT NULL)
      OR
      (p.sportradar_competitor_id IS NULL 
       AND LOWER(TRIM(p.name)) = LOWER(TRIM(tr.name)))
    )
  )
  AND p.updated_at > now() - interval '1 minute';

  -- Count inserts
  SELECT COUNT(*) INTO inserted_count
  FROM players p
  WHERE p.created_at > now() - interval '1 minute';

  -- Count unranked
  SELECT COUNT(*) INTO unranked_count
  FROM players p
  WHERE p.ranking = 500
    AND p.updated_at > now() - interval '1 minute';

  -- Count total in rankings
  SELECT COUNT(*) INTO total_in_rankings
  FROM temp_rankings;

  RAISE NOTICE 'Rankings Update Summary:';
  RAISE NOTICE '  Players in scraped data: %', total_in_rankings;
  RAISE NOTICE '  Players updated: %', updated_count;
  RAISE NOTICE '  New players inserted: %', inserted_count;
  RAISE NOTICE '  Players set to rank 500+: %', unranked_count;
END $$;

COMMIT;

-- Step 9: Verification queries (run after commit)
-- Check top 10 players
SELECT 
  ranking,
  name,
  country,
  points,
  price,
  sportradar_competitor_id,
  updated_at
FROM players
WHERE ranking IS NOT NULL
ORDER BY ranking
LIMIT 10;

-- Check players by status
SELECT 
  CASE
    WHEN ranking <= 100 THEN 'Top 100'
    WHEN ranking <= 200 THEN '101-200'
    WHEN ranking <= 500 THEN '201-500'
    ELSE '500+'
  END as rank_category,
  COUNT(*) as player_count,
  AVG(price)::integer as avg_price
FROM players
WHERE ranking IS NOT NULL
GROUP BY rank_category
ORDER BY 
  CASE rank_category
    WHEN 'Top 100' THEN 1
    WHEN '101-200' THEN 2
    WHEN '201-500' THEN 3
    WHEN '500+' THEN 4
  END;

-- Check for players without competitor_id in top 100
SELECT 
  ranking,
  name,
  country,
  points
FROM players
WHERE ranking <= 100
  AND sportradar_competitor_id IS NULL
ORDER BY ranking;

