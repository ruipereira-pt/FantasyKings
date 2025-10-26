/*
  # Update Tournament Categories

  1. Changes
    - Remove ATP-specific references from tournament categories
    - Update category constraint to use generic tournament levels:
      - 'grand_slam' - Grand Slam tournaments (4 per year)
      - 'masters_1000' - Masters 1000 level (formerly ATP 1000)
      - '500' - 500 level tournaments (formerly ATP 500)
      - '250' - 250 level tournaments (formerly ATP 250)
      - 'finals' - Year-end finals
      - 'challenger' - Challenger level tournaments
      - 'other' - Other tournaments
  
  2. Data Migration
    - Update existing tournament records to use new category names:
      - 'atp_1000' → 'masters_1000'
      - 'atp_500' → '500'
      - 'atp_250' → '250'
  
  3. Notes
    - Category names now reflect the tournament level without ATP branding
    - Maintains backward compatibility through data migration
*/

-- Drop old constraint first
ALTER TABLE tournaments 
DROP CONSTRAINT IF EXISTS tournaments_category_check;

-- Add new constraint with updated categories
ALTER TABLE tournaments 
ADD CONSTRAINT tournaments_category_check 
CHECK (category IN ('grand_slam', 'masters_1000', '500', '250', 'finals', 'challenger', 'other', 'atp_1000', 'atp_500', 'atp_250'));

-- Update existing tournament categories
UPDATE tournaments SET category = 'masters_1000' WHERE category = 'atp_1000';
UPDATE tournaments SET category = '500' WHERE category = 'atp_500';
UPDATE tournaments SET category = '250' WHERE category = 'atp_250';

-- Drop old values from constraint
ALTER TABLE tournaments 
DROP CONSTRAINT tournaments_category_check;

-- Add final constraint without old values
ALTER TABLE tournaments 
ADD CONSTRAINT tournaments_category_check 
CHECK (category IN ('grand_slam', 'masters_1000', '500', '250', 'finals', 'challenger', 'other'));