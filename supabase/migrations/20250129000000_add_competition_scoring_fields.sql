-- Add scoring and configuration fields to competitions table
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS number_of_players integer,
ADD COLUMN IF NOT EXISTS first_round text,
ADD COLUMN IF NOT EXISTS points_per_round jsonb;

-- Add comment for documentation
COMMENT ON COLUMN competitions.number_of_players IS 'Number of players in the tournament';
COMMENT ON COLUMN competitions.first_round IS 'First round of the tournament (e.g., r128, r64, r32, r16, qf, sf, f, w)';
COMMENT ON COLUMN competitions.points_per_round IS 'JSON object mapping rounds to points (e.g., {"r128": 10, "r64": 25, "r32": 50, ...})';

-- Add sportradar_competitor_id to players table if it doesn't exist
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS sportradar_competitor_id text;

-- Add unique constraint on sportradar_competitor_id (allow NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_sportradar_competitor_id 
ON players(sportradar_competitor_id) 
WHERE sportradar_competitor_id IS NOT NULL;

-- Create table to track last fetched competition ID for SportsRadar sync
CREATE TABLE IF NOT EXISTS sportradar_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_competition_id text,
  last_sync_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint to ensure only one sync state record
CREATE UNIQUE INDEX IF NOT EXISTS idx_sportradar_sync_state_single 
ON sportradar_sync_state((1));

-- Insert initial sync state if it doesn't exist
INSERT INTO sportradar_sync_state (id, last_competition_id, last_sync_at)
SELECT gen_random_uuid(), NULL, now()
WHERE NOT EXISTS (SELECT 1 FROM sportradar_sync_state LIMIT 1);

-- Add eliminated_round to player_schedules for tracking tournament results
ALTER TABLE player_schedules
ADD COLUMN IF NOT EXISTS eliminated_round text CHECK (eliminated_round IN ('r128', 'r64', 'r32', 'r16', 'qf', 'sf', 'f'));

COMMENT ON COLUMN player_schedules.eliminated_round IS 'Round in which the player was eliminated (for calculating tournament points)';

-- Create player price history table for tracking weekly price changes
CREATE TABLE IF NOT EXISTS player_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  price numeric(10, 2) NOT NULL,
  ranking integer,
  week_start_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_player_price_history_player_id ON player_price_history(player_id);
CREATE INDEX IF NOT EXISTS idx_player_price_history_week ON player_price_history(week_start_date);

COMMENT ON TABLE player_price_history IS 'Weekly price history for players, used for price history dashboard';

-- Enable RLS on player_price_history
ALTER TABLE player_price_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to price history
CREATE POLICY "Public can view player price history"
  ON player_price_history FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create function to automatically update player price when ranking changes
CREATE OR REPLACE FUNCTION update_player_price_on_ranking_change()
RETURNS TRIGGER AS $$
DECLARE
  new_price numeric;
  current_week_start date;
BEGIN
  -- Only update if ranking changed
  IF OLD.ranking IS DISTINCT FROM NEW.ranking OR OLD.live_ranking IS DISTINCT FROM NEW.live_ranking THEN
    -- Calculate new price based on ranking
    new_price := CASE
      WHEN NEW.ranking IS NOT NULL THEN
        GREATEST(2, 100 - (NEW.ranking::numeric - 1) * (98.0 / 999.0))
      WHEN NEW.live_ranking IS NOT NULL THEN
        GREATEST(2, 100 - (NEW.live_ranking::numeric - 1) * (98.0 / 999.0))
      ELSE
        NEW.price
    END;
    
    -- Update price
    NEW.price := new_price;
    
    -- Record in price history (weekly)
    current_week_start := date_trunc('week', CURRENT_DATE)::date;
    
    INSERT INTO player_price_history (player_id, price, ranking, week_start_date)
    VALUES (NEW.id, new_price, COALESCE(NEW.ranking, NEW.live_ranking), current_week_start)
    ON CONFLICT (player_id, week_start_date) 
    DO UPDATE SET 
      price = new_price,
      ranking = COALESCE(NEW.ranking, NEW.live_ranking),
      created_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_player_price ON players;
CREATE TRIGGER trigger_update_player_price
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_player_price_on_ranking_change();

