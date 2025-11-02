-- Add unique constraint on sportradar_season_id for proper upserts
ALTER TABLE tournaments 
ADD CONSTRAINT tournaments_sportradar_season_id_unique UNIQUE (sportradar_season_id);
