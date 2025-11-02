-- Create tournament_matches table for storing draw data
CREATE TABLE IF NOT EXISTS tournament_matches (
  id text PRIMARY KEY,
  tournament_id text NOT NULL,
  round text NOT NULL,
  player1_id text,
  player1_name text,
  player2_id text,
  player2_name text,
  scheduled_date timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  winner_id text,
  score text,
  surface text,
  best_of integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_scheduled_date ON tournament_matches(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player1_id ON tournament_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player2_id ON tournament_matches(player2_id);

-- Enable RLS
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view tournament matches"
  ON tournament_matches FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admin users can manage tournament matches"
  ON tournament_matches FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_tournament_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournament_matches_updated_at
  BEFORE UPDATE ON tournament_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_tournament_matches_updated_at();
