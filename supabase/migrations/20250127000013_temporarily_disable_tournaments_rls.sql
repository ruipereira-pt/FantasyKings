-- Temporarily disable RLS for tournaments table to allow manual data insertion
-- This migration will be reverted after adding the Paris Masters data

-- Disable RLS temporarily
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;

-- Add a comment explaining this is temporary
COMMENT ON TABLE tournaments IS 'RLS temporarily disabled for manual data insertion - will be re-enabled after Paris Masters data is added';
