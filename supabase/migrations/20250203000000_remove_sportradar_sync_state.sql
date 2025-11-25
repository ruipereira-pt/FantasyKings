-- Remove sportradar_sync_state table and all related policies
-- This table is no longer needed as sync state tracking is being removed

-- Drop RLS policies first
DROP POLICY IF EXISTS "Admin users can view sync state" ON sportradar_sync_state;
DROP POLICY IF EXISTS "Admin users can update sync state" ON sportradar_sync_state;
DROP POLICY IF EXISTS "Admin users can insert sync state" ON sportradar_sync_state;

-- Drop the unique index
DROP INDEX IF EXISTS idx_sportradar_sync_state_single;

-- Drop the table
DROP TABLE IF EXISTS sportradar_sync_state;

