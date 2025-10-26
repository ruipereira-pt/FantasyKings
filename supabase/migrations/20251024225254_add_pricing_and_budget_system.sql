/*
  # Add Pricing and Budget System

  ## Overview
  This migration adds a pricing system for players and budget constraints for team building.

  ## Changes
  1. Add price column to players table
  2. Add budget column to competitions table
  3. Add function to calculate player price based on ranking

  ## Pricing Formula
  Using logarithmic scale: Price = 20 × (log(201) - log(rank + 1)) / log(201)
  - Rank 1: ~20 coins
  - Rank 10: ~15 coins
  - Rank 50: ~11 coins
  - Rank 100: ~8 coins
  - Rank 200: ~4 coins
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'price'
  ) THEN
    ALTER TABLE players ADD COLUMN price integer DEFAULT 10;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'budget'
  ) THEN
    ALTER TABLE competitions ADD COLUMN budget integer DEFAULT 100;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION calculate_player_price(player_rank integer)
RETURNS integer AS $$
DECLARE
  base_price integer := 20;
  max_rank integer := 200;
  calculated_price integer;
BEGIN
  IF player_rank IS NULL OR player_rank <= 0 THEN
    RETURN 5;
  END IF;
  
  calculated_price := ROUND(
    base_price * (
      (LN(max_rank + 1) - LN(player_rank + 1)) / LN(max_rank + 1)
    )
  );
  
  IF calculated_price < 2 THEN
    calculated_price := 2;
  END IF;
  
  RETURN calculated_price;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE players
SET price = calculate_player_price(COALESCE(live_ranking, ranking, 999))
WHERE price IS NULL OR price = 10;

UPDATE competitions
SET budget = CASE
  WHEN max_players = 10 THEN 100
  WHEN max_players = 5 THEN 50
  ELSE 100
END
WHERE budget = 100;
