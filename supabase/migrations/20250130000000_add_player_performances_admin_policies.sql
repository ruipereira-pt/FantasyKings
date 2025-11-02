/*
  # Add Admin Policies for Player Performances

  ## Overview
  This migration adds INSERT and UPDATE policies to the player_performances table
  to allow admins to update tournament results.

  ## Changes
  1. Add INSERT policy for authenticated users (admins) to create player performances
  2. Add UPDATE policy for authenticated users (admins) to update player performances
  3. Add DELETE policy for authenticated users (admins) to delete player performances

  ## Security
  - Only authenticated users (admins) can insert, update, or delete player performances
  - Public read access remains unchanged
*/

-- Add INSERT policy for admin users only
CREATE POLICY "Admins can insert player performances"
  ON player_performances FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  );

-- Add UPDATE policy for admin users only
CREATE POLICY "Admins can update player performances"
  ON player_performances FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  );

-- Add DELETE policy for admin users only (in case results need to be corrected)
CREATE POLICY "Admins can delete player performances"
  ON player_performances FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('rui@fk.com', 'admin@fk.com')
  );

COMMENT ON POLICY "Admins can insert player performances" ON player_performances IS 'Allow authenticated admin users to insert tournament result data';
COMMENT ON POLICY "Admins can update player performances" ON player_performances IS 'Allow authenticated admin users to update tournament result data';
COMMENT ON POLICY "Admins can delete player performances" ON player_performances IS 'Allow authenticated admin users to delete tournament result data for corrections';

