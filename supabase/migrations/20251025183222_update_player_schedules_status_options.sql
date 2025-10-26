/*
  # Update Player Schedules Status Options

  1. Changes
    - Drop existing check constraint on player_schedules.status
    - Add new check constraint with additional status values:
      - 'registered' - Player is confirmed for main draw
      - 'qualifying' - Player will play qualifying rounds
      - 'alternate' - Player is on standby/alternate list
      - 'withdrawn' - Player has withdrawn from tournament
      - 'eliminated' - Player has been eliminated
      - 'champion' - Player won the tournament
  
  2. Notes
    - This allows tracking players through their tournament journey
    - 'qualifying' players can be updated to 'registered' if they qualify for main draw
    - 'alternate' players can be updated to 'registered' if they get a spot
*/

ALTER TABLE player_schedules 
DROP CONSTRAINT IF EXISTS player_schedules_status_check;

ALTER TABLE player_schedules 
ADD CONSTRAINT player_schedules_status_check 
CHECK (status IN ('registered', 'qualifying', 'alternate', 'withdrawn', 'eliminated', 'champion'));