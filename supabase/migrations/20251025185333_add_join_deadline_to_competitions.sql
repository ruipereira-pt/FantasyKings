/*
  # Add join_deadline column to competitions

  1. Changes
    - Add `join_deadline` column to `competitions` table
      - Type: timestamptz (timestamp with timezone)
      - Nullable: true (allows competitions without a deadline)
      - Description: Deadline for users to join or make changes to their teams

  2. Notes
    - This column will be used to control when users can no longer join a competition or modify their teams
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'join_deadline'
  ) THEN
    ALTER TABLE competitions ADD COLUMN join_deadline timestamptz;
  END IF;
END $$;