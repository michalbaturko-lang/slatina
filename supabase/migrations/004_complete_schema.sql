-- Complete schema migration: Move all localStorage data to Supabase
-- This migration adds all missing tables to eliminate localStorage usage

-- ============================================
-- COACHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS coaches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Trenér',
  photo_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "coaches_select" ON coaches FOR SELECT USING (true);
CREATE POLICY "coaches_insert" ON coaches FOR INSERT WITH CHECK (true);
CREATE POLICY "coaches_update" ON coaches FOR UPDATE USING (true);
CREATE POLICY "coaches_delete" ON coaches FOR DELETE USING (true);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER coaches_updated_at BEFORE UPDATE ON coaches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default coaches
INSERT INTO coaches (id, name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Aleš', 'Hlavní trenér'),
  ('00000000-0000-0000-0000-000000000002', 'Jirka', 'Asistent'),
  ('00000000-0000-0000-0000-000000000003', 'David', 'Asistent')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEAM CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS team_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL DEFAULT 'SK Slatina 2017',
  jersey_color text NOT NULL DEFAULT '#ffffff',
  secondary_color text NOT NULL DEFAULT '#22c55e',
  age_group text NOT NULL DEFAULT 'U9',
  formation text NOT NULL DEFAULT '3-1',
  focus_areas text[] DEFAULT ARRAY['square_basics', 'offer_basics', 'small_games'],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE team_config ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "team_config_select" ON team_config FOR SELECT USING (true);
CREATE POLICY "team_config_insert" ON team_config FOR INSERT WITH CHECK (true);
CREATE POLICY "team_config_update" ON team_config FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER team_config_updated_at BEFORE UPDATE ON team_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default team config
INSERT INTO team_config (id, name, jersey_color, secondary_color, age_group, formation, focus_areas) VALUES
  ('00000000-0000-0000-0000-000000000001', 'SK Slatina 2017', '#ffffff', '#22c55e', 'U9', '3-1', ARRAY['square_basics', 'offer_basics', 'small_games'])
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- COACH COMMENTS TABLE (extended version)
-- ============================================
CREATE TABLE IF NOT EXISTS coach_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  time float NOT NULL,
  text text NOT NULL,
  category text CHECK (category IN ('praise', 'improvement', 'tactic', 'note')) DEFAULT 'note',
  player_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE coach_comments ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "coach_comments_select" ON coach_comments FOR SELECT USING (true);
CREATE POLICY "coach_comments_insert" ON coach_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "coach_comments_update" ON coach_comments FOR UPDATE USING (true);
CREATE POLICY "coach_comments_delete" ON coach_comments FOR DELETE USING (true);

-- Index for faster video lookups
CREATE INDEX IF NOT EXISTS idx_coach_comments_video ON coach_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_coach_comments_players ON coach_comments USING GIN(player_ids);

-- ============================================
-- AI FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id text NOT NULL,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  is_correct boolean NOT NULL,
  comment text,
  correct_label text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "ai_feedback_select" ON ai_feedback FOR SELECT USING (true);
CREATE POLICY "ai_feedback_insert" ON ai_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "ai_feedback_update" ON ai_feedback FOR UPDATE USING (true);
CREATE POLICY "ai_feedback_delete" ON ai_feedback FOR DELETE USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_feedback_video ON ai_feedback(video_id);

-- ============================================
-- VIDEO RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS video_ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  time float NOT NULL,
  type text CHECK (type IN ('problem', 'interesting', 'praise')) NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  player_name text,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE video_ratings ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "video_ratings_select" ON video_ratings FOR SELECT USING (true);
CREATE POLICY "video_ratings_insert" ON video_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "video_ratings_update" ON video_ratings FOR UPDATE USING (true);
CREATE POLICY "video_ratings_delete" ON video_ratings FOR DELETE USING (true);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_ratings_video ON video_ratings(video_id);
CREATE INDEX IF NOT EXISTS idx_video_ratings_player ON video_ratings(player_id);

-- ============================================
-- ENSURE player_photos TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS player_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE player_photos ENABLE ROW LEVEL SECURITY;

-- Public access policies (only create if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_photos' AND policyname = 'player_photos_select') THEN
    CREATE POLICY "player_photos_select" ON player_photos FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_photos' AND policyname = 'player_photos_insert') THEN
    CREATE POLICY "player_photos_insert" ON player_photos FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_photos' AND policyname = 'player_photos_delete') THEN
    CREATE POLICY "player_photos_delete" ON player_photos FOR DELETE USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_player_photos_player ON player_photos(player_id);

-- ============================================
-- ENSURE player_clips TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS player_clips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  start_time float NOT NULL,
  end_time float NOT NULL,
  title text NOT NULL,
  category text CHECK (category IN ('goal', 'assist', 'skill', 'defense', 'other')) DEFAULT 'other',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE player_clips ENABLE ROW LEVEL SECURITY;

-- Public access policies (only create if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_clips' AND policyname = 'player_clips_select') THEN
    CREATE POLICY "player_clips_select" ON player_clips FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_clips' AND policyname = 'player_clips_insert') THEN
    CREATE POLICY "player_clips_insert" ON player_clips FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_clips' AND policyname = 'player_clips_delete') THEN
    CREATE POLICY "player_clips_delete" ON player_clips FOR DELETE USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_player_clips_player ON player_clips(player_id);
CREATE INDEX IF NOT EXISTS idx_player_clips_video ON player_clips(video_id);

-- ============================================
-- ENSURE goals TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  scorer_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  assist_id uuid REFERENCES players(id) ON DELETE SET NULL,
  minute int,
  video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  video_time float,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Public access policies (only create if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'goals_select') THEN
    CREATE POLICY "goals_select" ON goals FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'goals_insert') THEN
    CREATE POLICY "goals_insert" ON goals FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'goals_delete') THEN
    CREATE POLICY "goals_delete" ON goals FOR DELETE USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_goals_match ON goals(match_id);
CREATE INDEX IF NOT EXISTS idx_goals_scorer ON goals(scorer_id);

-- ============================================
-- ENSURE match_players TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS match_players (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  played boolean DEFAULT true,
  minutes_played int,
  goals int DEFAULT 0,
  assists int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Enable RLS
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

-- Public access policies (only create if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'match_players' AND policyname = 'match_players_select') THEN
    CREATE POLICY "match_players_select" ON match_players FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'match_players' AND policyname = 'match_players_insert') THEN
    CREATE POLICY "match_players_insert" ON match_players FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'match_players' AND policyname = 'match_players_update') THEN
    CREATE POLICY "match_players_update" ON match_players FOR UPDATE USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'match_players' AND policyname = 'match_players_delete') THEN
    CREATE POLICY "match_players_delete" ON match_players FOR DELETE USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);

-- ============================================
-- ENSURE screenshots TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS screenshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  time float NOT NULL,
  image_url text NOT NULL,
  annotations_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- Public access policies (only create if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'screenshots' AND policyname = 'screenshots_select') THEN
    CREATE POLICY "screenshots_select" ON screenshots FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'screenshots' AND policyname = 'screenshots_insert') THEN
    CREATE POLICY "screenshots_insert" ON screenshots FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'screenshots' AND policyname = 'screenshots_delete') THEN
    CREATE POLICY "screenshots_delete" ON screenshots FOR DELETE USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_screenshots_video ON screenshots(video_id);

-- ============================================
-- ENSURE audio_comments TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS audio_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  time float NOT NULL,
  duration float,
  audio_url text NOT NULL,
  transcript text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audio_comments ENABLE ROW LEVEL SECURITY;

-- Public access policies (only create if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audio_comments' AND policyname = 'audio_comments_select') THEN
    CREATE POLICY "audio_comments_select" ON audio_comments FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audio_comments' AND policyname = 'audio_comments_insert') THEN
    CREATE POLICY "audio_comments_insert" ON audio_comments FOR INSERT WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audio_comments_video ON audio_comments(video_id);
