-- Re-enable RLS for tournaments and players tables after manual data insertion
-- This migration reverts the temporary RLS disable

-- Re-enable RLS for tournaments table
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS for players table  
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Remove temporary comments
COMMENT ON TABLE tournaments IS NULL;
COMMENT ON TABLE players IS NULL;
