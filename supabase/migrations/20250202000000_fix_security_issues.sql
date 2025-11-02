/*
  # Fix Security Issues

  ## Overview
  This migration fixes several security issues identified by the security audit:
  1. Enable RLS on sportradar_sync_state table
  2. Fix mutable search_path in all functions by setting a fixed search_path
  3. Add appropriate RLS policies for sportradar_sync_state

  ## Security Fixes
  - Enable RLS on sportradar_sync_state
  - Set fixed search_path for all functions to prevent SQL injection
  - Restrict access to sportradar_sync_state to admin users only
*/

-- Enable RLS on sportradar_sync_state table
ALTER TABLE sportradar_sync_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sportradar_sync_state
-- Only admin users can view and update sync state
CREATE POLICY "Admin users can view sync state" ON sportradar_sync_state
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  );

CREATE POLICY "Admin users can update sync state" ON sportradar_sync_state
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  );

CREATE POLICY "Admin users can insert sync state" ON sportradar_sync_state
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  );

-- Fix mutable search_path in functions by setting a fixed search_path
-- This prevents SQL injection attacks via search_path manipulation

-- Fix update_player_rankings function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_player_rankings'
  ) THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION update_player_rankings(players_data jsonb)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      DECLARE
        player_record jsonb;
      BEGIN
        FOR player_record IN SELECT * FROM jsonb_array_elements(players_data)
        LOOP
          UPDATE players
          SET
            ranking = (player_record->>''ranking'')::integer,
            live_ranking = COALESCE((player_record->>''live_ranking'')::integer, (player_record->>''ranking'')::integer),
            points = COALESCE((player_record->>''points'')::integer, 0),
            updated_at = now()
          WHERE atp_id = (player_record->>''atp_id'')::integer;
        END LOOP;
      END;
      $func$;';
  END IF;
END $$;

-- Fix update_tournament_status_on_dates function
CREATE OR REPLACE FUNCTION update_tournament_status_on_dates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update tournaments to 'ongoing' if current date is between start_date and end_date
  UPDATE tournaments
  SET status = 'ongoing', updated_at = now()
  WHERE status = 'upcoming'
    AND start_date <= now()
    AND end_date >= now();

  -- Update tournaments to 'completed' if current date is after end_date
  UPDATE tournaments
  SET status = 'completed', updated_at = now()
  WHERE status IN ('upcoming', 'ongoing')
    AND end_date < now();
END;
$$;

-- Fix update_player_price_on_ranking_change function
CREATE OR REPLACE FUNCTION update_player_price_on_ranking_change()
RETURNS TRIGGER AS $$
DECLARE
  new_price numeric;
  current_week_start date;
BEGIN
  -- Only proceed if ranking or live_ranking changed
  IF OLD.ranking = NEW.ranking AND OLD.live_ranking = NEW.live_ranking THEN
    RETURN NEW;
  END IF;

  -- Calculate new price based on live_ranking, falling back to ranking
  new_price := calculate_player_price(COALESCE(NEW.live_ranking, NEW.ranking, 999));

  -- Update the player's price
  NEW.price := new_price;

  -- Record price history (weekly tracking)
  current_week_start := date_trunc('week', CURRENT_DATE)::date;

  -- Insert or update price history for current week
  INSERT INTO player_price_history (player_id, week_start_date, price, ranking, live_ranking)
  VALUES (NEW.id, current_week_start, new_price, NEW.ranking, NEW.live_ranking)
  ON CONFLICT (player_id, week_start_date)
  DO UPDATE SET
    price = new_price,
    ranking = NEW.ranking,
    live_ranking = NEW.live_ranking,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix update_competition_status_on_deadline function
CREATE OR REPLACE FUNCTION update_competition_status_on_deadline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update competitions to 'active' when join_deadline has passed
  UPDATE competitions
  SET status = 'active', updated_at = now()
  WHERE status = 'upcoming'
    AND join_deadline IS NOT NULL
    AND join_deadline <= now();
END;
$$;

-- Fix is_team_owner function
CREATE OR REPLACE FUNCTION is_team_owner(team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_teams
    WHERE id = team_id
    AND user_id = auth.uid()
  );
END;
$$;

-- Fix calculate_player_price function
CREATE OR REPLACE FUNCTION calculate_player_price(player_rank integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
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
$$;

-- Fix update_tournament_matches_updated_at function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_tournament_matches_updated_at'
  ) THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION update_tournament_matches_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SET search_path = public
      AS $func$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $func$;';
  END IF;
END $$;

-- Fix update_tournament_seasons_updated_at function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_tournament_seasons_updated_at'
  ) THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION update_tournament_seasons_updated_at()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SET search_path = public
      AS $func$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $func$;';
  END IF;
END $$;

-- Add comments
COMMENT ON FUNCTION update_player_rankings(jsonb) IS 
  'Updates player rankings in bulk. Security: Uses fixed search_path to prevent SQL injection.';

COMMENT ON FUNCTION update_tournament_status_on_dates() IS 
  'Updates tournament status based on dates. Security: Uses fixed search_path to prevent SQL injection.';

COMMENT ON FUNCTION update_player_price_on_ranking_change() IS 
  'Trigger function that updates player price when ranking changes. Security: Uses fixed search_path to prevent SQL injection.';

COMMENT ON FUNCTION update_competition_status_on_deadline() IS 
  'Updates competition status when deadline passes. Security: Uses fixed search_path to prevent SQL injection.';

COMMENT ON FUNCTION is_team_owner(uuid) IS 
  'Checks if current user owns a team. Security: Uses fixed search_path to prevent SQL injection.';

COMMENT ON FUNCTION calculate_player_price(integer) IS 
  'Calculates player price based on ranking. Security: Uses fixed search_path to prevent SQL injection.';

