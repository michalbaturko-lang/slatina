-- Add video_detections table to store detected players in videos
-- This enables sync between devices (mobile/desktop)

CREATE TABLE IF NOT EXISTS video_detections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  player_ids uuid[] NOT NULL DEFAULT '{}',
  numbers int[] NOT NULL DEFAULT '{}',
  confidence text CHECK (confidence IN ('high', 'medium', 'low')) DEFAULT 'medium',
  manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one detection per video
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_detections_video ON video_detections(video_id);

-- Enable RLS
ALTER TABLE video_detections ENABLE ROW LEVEL SECURITY;

-- Public access (for now)
CREATE POLICY "Public read" ON video_detections FOR SELECT USING (true);
CREATE POLICY "Public insert" ON video_detections FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON video_detections FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON video_detections FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER video_detections_updated_at BEFORE UPDATE ON video_detections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
