-- Update player_schedules table to better support entry lists
-- Add columns for better tournament entry tracking
ALTER TABLE player_schedules 
ADD COLUMN IF NOT EXISTS season_urn text,
ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'main_draw' CHECK (entry_type IN ('main_draw', 'qualifying', 'alternate', 'wildcard')),
ADD COLUMN IF NOT EXISTS seed_number integer,
ADD COLUMN IF NOT EXISTS entry_date timestamptz;

-- Create index for season_urn
CREATE INDEX IF NOT EXISTS idx_player_schedules_season_urn ON player_schedules(season_urn);

-- Update the existing status column to be more specific
ALTER TABLE player_schedules 
DROP CONSTRAINT IF EXISTS player_schedules_status_check;

ALTER TABLE player_schedules 
ADD CONSTRAINT player_schedules_status_check 
CHECK (status IN ('confirmed', 'withdrawn', 'alternate', 'qualifying'));
