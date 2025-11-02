/*
  # Auto-update tournament status based on competition deadline dates

  1. Changes
    - Create a function to automatically update tournament status based on associated competition's join_deadline
    - Sets status to 'ongoing' when the associated competition's join_deadline has passed
    - Sets status to 'completed' when current date is after tournament end_date
    - Only updates tournaments that are not already completed

  2. Notes
    - Uses competition's join_deadline as the trigger for status change to 'ongoing'
    - Tournament must have an associated competition via competition_tournaments or competitions.tournament_id
    - Paris Master 2025 should show as 'ongoing' when its competition's deadline has passed
*/

-- Create function to update tournament status based on competition deadlines
CREATE OR REPLACE FUNCTION update_tournament_status_on_dates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update to 'ongoing' when the associated competition's join_deadline has passed
  -- Check tournaments linked via competition_tournaments junction table
  UPDATE tournaments t
  SET 
    status = 'ongoing',
    updated_at = now()
  WHERE 
    t.status != 'completed'
    AND EXISTS (
      SELECT 1
      FROM competition_tournaments ct
      JOIN competitions c ON ct.competition_id = c.id
      WHERE ct.tournament_id = t.id
        AND c.join_deadline IS NOT NULL
        AND c.join_deadline < now()
    );

  -- Also check tournaments linked directly via competitions.tournament_id
  UPDATE tournaments t
  SET 
    status = 'ongoing',
    updated_at = now()
  WHERE 
    t.status != 'completed'
    AND EXISTS (
      SELECT 1
      FROM competitions c
      WHERE c.tournament_id = t.id
        AND c.join_deadline IS NOT NULL
        AND c.join_deadline < now()
    );

  -- Update to 'completed' when current date is after end_date
  UPDATE tournaments
  SET 
    status = 'completed',
    updated_at = now()
  WHERE 
    status != 'completed'
    AND CURRENT_DATE > end_date;
END;
$$;

-- Add a comment to the function
COMMENT ON FUNCTION update_tournament_status_on_dates() IS 
  'Updates tournament status to ongoing based on associated competition join_deadline, or completed based on end_date';

