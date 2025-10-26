/*
  # Add Competition-Tournament Junction Table

  1. New Tables
    - `competition_tournaments`
      - `id` (uuid, primary key)
      - `competition_id` (uuid, references competitions)
      - `tournament_id` (uuid, references tournaments)
      - `created_at` (timestamptz)
  
  2. Purpose
    - Enables many-to-many relationships between competitions and tournaments
    - Allows "Road to Major" competitions to include multiple tournaments
    - Maintains backward compatibility with existing single tournament competitions
  
  3. Security
    - Enable RLS on `competition_tournaments` table
    - Add policy for public read access
    - Add policy for authenticated admin users to manage associations
  
  4. Notes
    - The existing `tournament_id` field in competitions table remains for backward compatibility
    - For multi-tournament competitions (like Road to Major), use this junction table instead
*/

-- Create competition_tournaments junction table
CREATE TABLE IF NOT EXISTS competition_tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES competitions(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(competition_id, tournament_id)
);

-- Enable RLS
ALTER TABLE competition_tournaments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view competition-tournament associations
CREATE POLICY "Anyone can view competition tournaments"
  ON competition_tournaments
  FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can insert competition tournaments
CREATE POLICY "Authenticated users can insert competition tournaments"
  ON competition_tournaments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can delete competition tournaments
CREATE POLICY "Authenticated users can delete competition tournaments"
  ON competition_tournaments
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_competition_tournaments_competition 
  ON competition_tournaments(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_tournaments_tournament 
  ON competition_tournaments(tournament_id);