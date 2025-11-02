-- Temporarily disable RLS for players table to allow manual data insertion
-- This migration will be reverted after adding the Paris Masters players

-- Disable RLS temporarily
ALTER TABLE players DISABLE ROW LEVEL SECURITY;

-- Add a comment explaining this is temporary
COMMENT ON TABLE players IS 'RLS temporarily disabled for manual data insertion - will be re-enabled after Paris Masters players are added';
