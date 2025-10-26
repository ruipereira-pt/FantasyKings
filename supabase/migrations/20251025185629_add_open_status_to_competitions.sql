/*
  # Add 'open' status to competitions

  1. Changes
    - Modify the competitions status check constraint to include 'open'
    - Valid statuses: upcoming, open, active, completed
    
  2. Notes
    - 'open' status indicates registration is open for a competition
    - This allows competitions to transition from upcoming -> open -> active -> completed
*/

-- Drop the old constraint
ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_status_check;

-- Add the new constraint with 'open' status
ALTER TABLE competitions ADD CONSTRAINT competitions_status_check 
CHECK (status IN ('upcoming', 'open', 'active', 'completed'));