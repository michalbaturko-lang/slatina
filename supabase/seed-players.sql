-- SK Slatina 2017 - Seed Players
-- Run this in Supabase SQL Editor to populate players

-- First, clear existing players (optional - uncomment if needed)
-- DELETE FROM players;

-- Insert default roster
INSERT INTO players (name, number, position, active) VALUES
  ('Tom Frank', 1, 'Brankář', true),
  ('Míša Nguyen', 2, NULL, true),
  ('Domča Handl', 3, NULL, true),
  ('Adri Do', 6, NULL, true),
  ('Aďa Štěpán', 7, NULL, true),
  ('Míša Baturko', 8, NULL, true),
  ('Patrik Beneš', 9, NULL, true),
  ('Honza Joura', 10, NULL, true),
  ('Filip Braun', 11, NULL, true),
  ('Hugo Heger', 12, NULL, true),
  ('Lukáš Hrdlička', NULL, NULL, true),
  ('Jindra Tomsa', NULL, NULL, true),
  ('David Peterka', NULL, NULL, true)
ON CONFLICT DO NOTHING;

-- Show result
SELECT id, name, number, position, active FROM players ORDER BY number NULLS LAST;
