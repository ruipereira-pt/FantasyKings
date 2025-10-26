/*
  # Add Player Schedules Table

  1. New Tables
    - `player_schedules`
      - `id` (uuid, primary key)
      - `player_id` (uuid, foreign key to players)
      - `tournament_id` (uuid, foreign key to tournaments)
      - `status` (text) - confirmed, alternate, withdrawn, etc.
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `player_schedules` table
    - Add policy for public read access (anyone can view player schedules)
    - Add policy for authenticated users to manage schedules
  
  3. Indexes
    - Add index on player_id for efficient player schedule queries
    - Add index on tournament_id for efficient tournament entry queries
    - Add unique constraint on (player_id, tournament_id) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS player_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_player_schedules_player_id ON player_schedules(player_id);
CREATE INDEX IF NOT EXISTS idx_player_schedules_tournament_id ON player_schedules(tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_schedules_status ON player_schedules(status);

ALTER TABLE player_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player schedules"
  ON player_schedules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert player schedules"
  ON player_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update player schedules"
  ON player_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete player schedules"
  ON player_schedules FOR DELETE
  TO authenticated
  USING (true);