/*
  # Auto-update competition status when deadline passes

  1. Changes
    - Create a function to automatically update competition status to 'active' 
      when the join_deadline has passed and status is still 'upcoming' or 'open'
    - This ensures competitions transition to 'active' status automatically
      when their registration deadline expires

  2. Notes
    - Only updates competitions that have a join_deadline set
    - Only updates if current status is 'upcoming' or 'open'
    - Sets status to 'active' when deadline has passed
*/

-- Create function to update competition status based on deadline
CREATE OR REPLACE FUNCTION update_competition_status_on_deadline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE competitions
  SET 
    status = 'active',
    updated_at = now()
  WHERE 
    join_deadline IS NOT NULL
    AND join_deadline < now()
    AND status IN ('upcoming', 'open')
    AND status != 'completed';
END;
$$;

-- Add a comment to the function
COMMENT ON FUNCTION update_competition_status_on_deadline() IS 
  'Updates competition status to active when join_deadline has passed';

