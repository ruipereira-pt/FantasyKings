-- Add Sportradar fields to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS sportradar_competition_id text,
ADD COLUMN IF NOT EXISTS sportradar_season_id text,
ADD COLUMN IF NOT EXISTS year integer;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_sportradar_competition_id 
ON tournaments(sportradar_competition_id);

CREATE INDEX IF NOT EXISTS idx_tournaments_sportradar_season_id 
ON tournaments(sportradar_season_id);

CREATE INDEX IF NOT EXISTS idx_tournaments_year 
ON tournaments(year);

-- Add comments for documentation
COMMENT ON COLUMN tournaments.sportradar_competition_id IS 'Sportradar competition ID (e.g., sr:competition:2567)';
COMMENT ON COLUMN tournaments.sportradar_season_id IS 'Sportradar season ID (e.g., sr:season:128143)';
COMMENT ON COLUMN tournaments.year IS 'Tournament year for multi-year competitions';
