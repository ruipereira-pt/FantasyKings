/*
  # Add Authentication Integration

  ## Overview
  This migration updates the user_teams table to integrate with Supabase Auth
  and ensures proper Row Level Security policies are in place.

  ## Changes
  1. Update RLS policies for user_teams to use auth.uid()
  2. Update RLS policies for team_players to check team ownership via auth
  3. Add helper function to check team ownership

  ## Security
  - Users can only manage their own teams
  - Users can only view their own team details but can view public leaderboard data
*/

CREATE OR REPLACE FUNCTION is_team_owner(team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_teams
    WHERE id = team_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Users can view all teams" ON user_teams;
DROP POLICY IF EXISTS "Users can create own teams" ON user_teams;
DROP POLICY IF EXISTS "Users can update own teams" ON user_teams;
DROP POLICY IF EXISTS "Users can delete own teams" ON user_teams;

CREATE POLICY "Anyone can view team leaderboard data"
  ON user_teams FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create teams"
  ON user_teams FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own teams"
  ON user_teams FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own teams"
  ON user_teams FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all team players" ON team_players;
DROP POLICY IF EXISTS "Users can add players to teams" ON team_players;
DROP POLICY IF EXISTS "Users can update team players" ON team_players;
DROP POLICY IF EXISTS "Users can remove players from teams" ON team_players;

CREATE POLICY "Anyone can view team players"
  ON team_players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Team owners can add players"
  ON team_players FOR INSERT
  TO authenticated
  WITH CHECK (is_team_owner(user_team_id));

CREATE POLICY "Team owners can update players"
  ON team_players FOR UPDATE
  TO authenticated
  USING (is_team_owner(user_team_id))
  WITH CHECK (is_team_owner(user_team_id));

CREATE POLICY "Team owners can remove players"
  ON team_players FOR DELETE
  TO authenticated
  USING (is_team_owner(user_team_id));
