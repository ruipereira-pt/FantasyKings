/*
  # Update Player Schedules Status Constraint

  1. Changes
    - Drop existing check constraint on player_schedules.status
    - Add new check constraint with 'confirmed' status option
  
  2. Notes
    - This allows the 'confirmed' status that is currently in use
*/

ALTER TABLE player_schedules 
DROP CONSTRAINT IF EXISTS player_schedules_status_check;

ALTER TABLE player_schedules 
ADD CONSTRAINT player_schedules_status_check 
CHECK (status IN ('confirmed', 'qualifying', 'alternate', 'withdrawn', 'eliminated', 'champion'));

