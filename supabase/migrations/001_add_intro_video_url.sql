-- Migration: Add intro_video_url to players table
-- Run this in Supabase SQL Editor to add support for player intro videos

ALTER TABLE players
ADD COLUMN IF NOT EXISTS intro_video_url text;

-- Add comment
COMMENT ON COLUMN players.intro_video_url IS 'URL to player intro video (short profile video)';
