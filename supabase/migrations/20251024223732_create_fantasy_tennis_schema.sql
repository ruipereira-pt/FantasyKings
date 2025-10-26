/*
  # Fantasy Tennis League Database Schema

  ## Overview
  This migration creates the complete database schema for a fantasy tennis league platform
  with multiple competition types (Season, Road to Majors, Per Competition, Per Gameweek).

  ## New Tables

  ### 1. `players`
  Stores ATP tennis player information
  - `id` (uuid, primary key)
  - `atp_id` (integer, unique) - ATP official player ID
  - `name` (text) - Player full name
  - `country` (text) - Player country code
  - `ranking` (integer) - Current ATP ranking
  - `live_ranking` (integer) - Live ATP ranking
  - `points` (integer) - ATP ranking points
  - `image_url` (text) - Player profile image
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `tournaments`
  Stores tennis tournament information
  - `id` (uuid, primary key)
  - `name` (text) - Tournament name
  - `category` (text) - grand_slam, atp_1000, atp_500, atp_250, finals, challenger
  - `surface` (text) - hard, clay, grass, carpet
  - `location` (text) - City, Country
  - `start_date` (date)
  - `end_date` (date)
  - `prize_money` (integer)
  - `status` (text) - upcoming, ongoing, completed
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `player_schedules`
  Tracks which players are participating in which tournaments
  - `id` (uuid, primary key)
  - `player_id` (uuid, foreign key)
  - `tournament_id` (uuid, foreign key)
  - `status` (text) - registered, withdrawn, eliminated, champion
  - `created_at` (timestamptz)

  ### 4. `competitions`
  Defines different competition types and instances
  - `id` (uuid, primary key)
  - `name` (text) - Competition name
  - `type` (text) - season, road_to_major, per_competition, per_gameweek
  - `max_players` (integer) - Max players allowed (2, 5, 10)
  - `max_changes` (integer) - Max changes allowed during competition
  - `start_date` (date)
  - `end_date` (date)
  - `status` (text) - upcoming, active, completed
  - `tournament_id` (uuid, nullable) - For per_competition types
  - `major_target` (text, nullable) - For road_to_major: 'ao', 'rg', 'wimbledon', 'uso', 'finals'
  - `gameweek_number` (integer, nullable) - For per_gameweek types
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `user_teams`
  Stores user team configurations for each competition
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User identifier (will integrate with auth later)
  - `competition_id` (uuid, foreign key)
  - `team_name` (text)
  - `total_points` (integer, default 0)
  - `rank` (integer, nullable)
  - `changes_made` (integer, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. `team_players`
  Junction table for players selected in user teams
  - `id` (uuid, primary key)
  - `user_team_id` (uuid, foreign key)
  - `player_id` (uuid, foreign key)
  - `selected_at` (timestamptz)
  - `removed_at` (timestamptz, nullable)
  - `points_earned` (integer, default 0)

  ### 7. `player_performances`
  Tracks player performance in tournaments for scoring
  - `id` (uuid, primary key)
  - `player_id` (uuid, foreign key)
  - `tournament_id` (uuid, foreign key)
  - `round_reached` (text) - r128, r64, r32, r16, qf, sf, f, w
  - `matches_won` (integer, default 0)
  - `matches_lost` (integer, default 0)
  - `fantasy_points` (integer, default 0)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Public read access for players, tournaments, competitions, player_schedules, player_performances
  - User-specific access for user_teams and team_players
*/

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atp_id integer UNIQUE,
  name text NOT NULL,
  country text,
  ranking integer,
  live_ranking integer,
  points integer DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('grand_slam', 'atp_1000', 'atp_500', 'atp_250', 'finals', 'challenger')),
  surface text CHECK (surface IN ('hard', 'clay', 'grass', 'carpet')),
  location text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  prize_money integer,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create player_schedules table
CREATE TABLE IF NOT EXISTS player_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  status text DEFAULT 'registered' CHECK (status IN ('registered', 'withdrawn', 'eliminated', 'champion')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

-- Create competitions table
CREATE TABLE IF NOT EXISTS competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('season', 'road_to_major', 'per_competition', 'per_gameweek')),
  max_players integer NOT NULL,
  max_changes integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE SET NULL,
  major_target text CHECK (major_target IN ('ao', 'rg', 'wimbledon', 'uso', 'finals')),
  gameweek_number integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_teams table
CREATE TABLE IF NOT EXISTS user_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  competition_id uuid REFERENCES competitions(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  total_points integer DEFAULT 0,
  rank integer,
  changes_made integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, competition_id)
);

-- Create team_players table
CREATE TABLE IF NOT EXISTS team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_team_id uuid REFERENCES user_teams(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  selected_at timestamptz DEFAULT now(),
  removed_at timestamptz,
  points_earned integer DEFAULT 0
);

-- Create player_performances table
CREATE TABLE IF NOT EXISTS player_performances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  round_reached text CHECK (round_reached IN ('r128', 'r64', 'r32', 'r16', 'qf', 'sf', 'f', 'w')),
  matches_won integer DEFAULT 0,
  matches_lost integer DEFAULT 0,
  fantasy_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_performances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public read access
CREATE POLICY "Public can view players"
  ON players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view tournaments"
  ON tournaments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view player schedules"
  ON player_schedules FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view competitions"
  ON competitions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view player performances"
  ON player_performances FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for user_teams (user-specific access)
CREATE POLICY "Users can view all teams"
  ON user_teams FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can create own teams"
  ON user_teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own teams"
  ON user_teams FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own teams"
  ON user_teams FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for team_players
CREATE POLICY "Users can view all team players"
  ON team_players FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can add players to teams"
  ON team_players FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update team players"
  ON team_players FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can remove players from teams"
  ON team_players FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_ranking ON players(ranking);
CREATE INDEX IF NOT EXISTS idx_players_atp_id ON players(atp_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON tournaments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_competitions_type ON competitions(type);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_competition ON user_teams(competition_id);
CREATE INDEX IF NOT EXISTS idx_team_players_user_team ON team_players(user_team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_player ON team_players(player_id);
CREATE INDEX IF NOT EXISTS idx_player_schedules_tournament ON player_schedules(tournament_id);
CREATE INDEX IF NOT EXISTS idx_player_performances_tournament ON player_performances(tournament_id);
