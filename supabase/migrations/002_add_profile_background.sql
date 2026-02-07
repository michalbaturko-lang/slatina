-- Add profile background image URL to players table
-- This allows a custom background image around the profile photo

ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_background_url TEXT;
