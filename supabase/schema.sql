-- SK Slatina 2017 - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PLAYERS
-- ============================================
create table players (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  number int,
  position text,
  photo_url text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- OPPONENTS (teams we play against)
-- ============================================
create table opponents (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz default now()
);

-- ============================================
-- MATCHES
-- ============================================
create table matches (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  date date not null,
  type text check (type in ('match', 'training', 'tournament')) default 'match',
  opponent_id uuid references opponents(id),
  goals_for int default 0,
  goals_against int default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Match players (who played in which match)
create table match_players (
  match_id uuid references matches(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (match_id, player_id)
);

-- ============================================
-- VIDEOS
-- ============================================
create table videos (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  file_url text not null,
  thumbnail_url text,
  duration float,
  match_id uuid references matches(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- COMMENTS (text annotations on videos)
-- ============================================
create table comments (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos(id) on delete cascade not null,
  time float not null,
  text text not null,
  created_at timestamptz default now()
);

-- Comment player tags
create table comment_players (
  comment_id uuid references comments(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (comment_id, player_id)
);

-- ============================================
-- AUDIO COMMENTS
-- ============================================
create table audio_comments (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos(id) on delete cascade not null,
  time float not null,
  duration float,
  audio_url text not null,
  transcript text,
  created_at timestamptz default now()
);

-- Audio comment player tags
create table audio_comment_players (
  audio_comment_id uuid references audio_comments(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  primary key (audio_comment_id, player_id)
);

-- ============================================
-- SCREENSHOTS
-- ============================================
create table screenshots (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos(id) on delete cascade not null,
  time float not null,
  image_url text not null,
  annotations_json jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- GOALS
-- ============================================
create table goals (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade not null,
  scorer_id uuid references players(id) not null,
  assist_id uuid references players(id),
  minute int,
  video_id uuid references videos(id),
  video_time float,
  created_at timestamptz default now()
);

-- ============================================
-- PLAYER PHOTOS (gallery)
-- ============================================
create table player_photos (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references players(id) on delete cascade not null,
  photo_url text not null,
  match_id uuid references matches(id),
  caption text,
  created_at timestamptz default now()
);

-- ============================================
-- PLAYER CLIPS (best moments)
-- ============================================
create table player_clips (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid references players(id) on delete cascade not null,
  video_id uuid references videos(id) on delete cascade not null,
  start_time float not null,
  end_time float not null,
  title text not null,
  category text check (category in ('goal', 'assist', 'skill', 'defense', 'other')) default 'other',
  created_at timestamptz default now()
);

-- ============================================
-- ANNOTATIONS (drawings on video)
-- ============================================
create table annotations (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid references videos(id) on delete cascade not null,
  time float not null,
  annotations_json jsonb not null,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_videos_match on videos(match_id);
create index idx_comments_video on comments(video_id);
create index idx_audio_comments_video on audio_comments(video_id);
create index idx_screenshots_video on screenshots(video_id);
create index idx_goals_match on goals(match_id);
create index idx_goals_scorer on goals(scorer_id);
create index idx_player_photos_player on player_photos(player_id);
create index idx_player_clips_player on player_clips(player_id);
create index idx_annotations_video on annotations(video_id);

-- ============================================
-- ROW LEVEL SECURITY (public read, later add auth)
-- ============================================
alter table players enable row level security;
alter table opponents enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table videos enable row level security;
alter table comments enable row level security;
alter table comment_players enable row level security;
alter table audio_comments enable row level security;
alter table audio_comment_players enable row level security;
alter table screenshots enable row level security;
alter table goals enable row level security;
alter table player_photos enable row level security;
alter table player_clips enable row level security;
alter table annotations enable row level security;

-- Public read access (for now - add auth later)
create policy "Public read" on players for select using (true);
create policy "Public insert" on players for insert with check (true);
create policy "Public update" on players for update using (true);
create policy "Public delete" on players for delete using (true);

create policy "Public read" on opponents for select using (true);
create policy "Public insert" on opponents for insert with check (true);
create policy "Public update" on opponents for update using (true);
create policy "Public delete" on opponents for delete using (true);

create policy "Public read" on matches for select using (true);
create policy "Public insert" on matches for insert with check (true);
create policy "Public update" on matches for update using (true);
create policy "Public delete" on matches for delete using (true);

create policy "Public read" on match_players for select using (true);
create policy "Public insert" on match_players for insert with check (true);
create policy "Public delete" on match_players for delete using (true);

create policy "Public read" on videos for select using (true);
create policy "Public insert" on videos for insert with check (true);
create policy "Public update" on videos for update using (true);
create policy "Public delete" on videos for delete using (true);

create policy "Public read" on comments for select using (true);
create policy "Public insert" on comments for insert with check (true);
create policy "Public update" on comments for update using (true);
create policy "Public delete" on comments for delete using (true);

create policy "Public read" on comment_players for select using (true);
create policy "Public insert" on comment_players for insert with check (true);
create policy "Public delete" on comment_players for delete using (true);

create policy "Public read" on audio_comments for select using (true);
create policy "Public insert" on audio_comments for insert with check (true);
create policy "Public update" on audio_comments for update using (true);
create policy "Public delete" on audio_comments for delete using (true);

create policy "Public read" on audio_comment_players for select using (true);
create policy "Public insert" on audio_comment_players for insert with check (true);
create policy "Public delete" on audio_comment_players for delete using (true);

create policy "Public read" on screenshots for select using (true);
create policy "Public insert" on screenshots for insert with check (true);
create policy "Public delete" on screenshots for delete using (true);

create policy "Public read" on goals for select using (true);
create policy "Public insert" on goals for insert with check (true);
create policy "Public update" on goals for update using (true);
create policy "Public delete" on goals for delete using (true);

create policy "Public read" on player_photos for select using (true);
create policy "Public insert" on player_photos for insert with check (true);
create policy "Public delete" on player_photos for delete using (true);

create policy "Public read" on player_clips for select using (true);
create policy "Public insert" on player_clips for insert with check (true);
create policy "Public delete" on player_clips for delete using (true);

create policy "Public read" on annotations for select using (true);
create policy "Public insert" on annotations for insert with check (true);
create policy "Public update" on annotations for update using (true);
create policy "Public delete" on annotations for delete using (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger players_updated_at before update on players
  for each row execute function update_updated_at();

create trigger matches_updated_at before update on matches
  for each row execute function update_updated_at();

create trigger videos_updated_at before update on videos
  for each row execute function update_updated_at();
