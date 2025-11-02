-- Create tournament_seasons table to store season information for tournaments
CREATE TABLE IF NOT EXISTS tournament_seasons (
  id text PRIMARY KEY,
  tournament_id text NOT NULL,
  season_urn text NOT NULL UNIQUE,
  season_name text,
  year integer,
  start_date timestamptz,
  end_date timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournament_seasons_tournament_id ON tournament_seasons(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_seasons_season_urn ON tournament_seasons(season_urn);
CREATE INDEX IF NOT EXISTS idx_tournament_seasons_year ON tournament_seasons(year);

-- Enable RLS
ALTER TABLE tournament_seasons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view tournament seasons" ON tournament_seasons
  FOR SELECT USING (true);

CREATE POLICY "Admin users can manage tournament seasons" ON tournament_seasons
  FOR ALL USING (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tournament_seasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tournament_seasons_updated_at
  BEFORE UPDATE ON tournament_seasons
  FOR EACH ROW
  EXECUTE FUNCTION update_tournament_seasons_updated_at();
