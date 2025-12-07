-- Cleanup Tournaments by Filtering Criteria
-- 
-- This script deletes tournaments that don't match the following criteria:
-- 1. Gender: men only
-- 2. Category: ATP (grand_slam, atp_1000, atp_500, atp_250, finals) and Challenger only
-- 3. Note: Type (singles/doubles) cannot be checked via SQL as it's not stored in the database
--    Only tournaments with sportradar_season_id can be verified via API
--
-- Run this script carefully and review the counts before executing DELETE statements

-- Step 1: Check current tournament counts
SELECT 
  COUNT(*) as total_tournaments,
  COUNT(CASE WHEN gender = 'men' THEN 1 END) as men_tournaments,
  COUNT(CASE WHEN gender != 'men' AND gender IS NOT NULL THEN 1 END) as non_men_tournaments,
  COUNT(CASE WHEN gender IS NULL THEN 1 END) as null_gender_tournaments,
  COUNT(CASE WHEN category IN ('grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger') THEN 1 END) as valid_category_tournaments,
  COUNT(CASE WHEN category NOT IN ('grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger') AND category IS NOT NULL THEN 1 END) as invalid_category_tournaments,
  COUNT(CASE WHEN sportradar_season_id IS NULL THEN 1 END) as tournaments_without_season_id
FROM tournaments;

-- Step 2: Preview tournaments that will be deleted (gender != men)
SELECT 
  id,
  name,
  gender,
  category,
  sportradar_season_id,
  start_date,
  end_date
FROM tournaments
WHERE gender IS NOT NULL AND gender != 'men'
ORDER BY start_date DESC;

-- Step 3: Preview tournaments that will be deleted (invalid category)
SELECT 
  id,
  name,
  gender,
  category,
  sportradar_season_id,
  start_date,
  end_date
FROM tournaments
WHERE category IS NOT NULL 
  AND category NOT IN ('grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger')
ORDER BY start_date DESC;

-- Step 4: Preview tournaments that will be deleted (no sportradar_season_id - cannot verify)
-- Uncomment if you want to delete tournaments without season_id
-- SELECT 
--   id,
--   name,
--   gender,
--   category,
--   sportradar_season_id,
--   start_date,
--   end_date
-- FROM tournaments
-- WHERE sportradar_season_id IS NULL
-- ORDER BY start_date DESC;

-- Step 5: Count tournaments that will be deleted
SELECT 
  COUNT(*) as tournaments_to_delete
FROM tournaments
WHERE 
  -- Delete if gender is set and not 'men'
  (gender IS NOT NULL AND gender != 'men')
  OR
  -- Delete if category is set and not ATP/Challenger
  (category IS NOT NULL AND category NOT IN ('grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger'));

-- Step 6: ACTUAL DELETION
-- WARNING: This will permanently delete tournaments. Make sure you've reviewed the previews above!

-- Option 1: Delete tournaments where gender is not 'men' (commented out - uncomment to use)
-- DELETE FROM tournaments
-- WHERE gender IS NOT NULL AND gender != 'men';

-- Option 2: Delete tournaments with invalid categories (commented out - uncomment to use)
-- DELETE FROM tournaments
-- WHERE category IS NOT NULL 
--   AND category NOT IN ('grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger');

-- Option 3: Combined deletion (recommended - runs both conditions in one transaction)
BEGIN;

DELETE FROM tournaments
WHERE 
  -- Delete if gender is set and not 'men'
  (gender IS NOT NULL AND gender != 'men')
  OR
  -- Delete if category is set and not ATP/Challenger
  (category IS NOT NULL AND category NOT IN ('grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger'));

-- Verify deletion
SELECT COUNT(*) as remaining_tournaments FROM tournaments;

COMMIT;

-- Step 7: Verify remaining tournaments match criteria
SELECT 
  COUNT(*) as remaining_tournaments,
  COUNT(CASE WHEN gender = 'men' OR gender IS NULL THEN 1 END) as valid_gender,
  COUNT(CASE WHEN category IN ('grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger') OR category IS NULL THEN 1 END) as valid_category
FROM tournaments;

