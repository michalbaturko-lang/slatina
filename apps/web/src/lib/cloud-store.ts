'use client';

import { supabase, isProductionMode } from './supabase';

// Types matching database schema
export interface Player {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  photo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  name: string;
  date: string;
  type: 'match' | 'training' | 'tournament';
  opponent_id: string | null;
  goals_for: number;
  goals_against: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  match_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  video_id: string;
  time: number;
  text: string;
  created_at: string;
}

export interface AudioComment {
  id: string;
  video_id: string;
  time: number;
  duration: number | null;
  audio_url: string;
  transcript: string | null;
  created_at: string;
}

export interface Screenshot {
  id: string;
  video_id: string;
  time: number;
  image_url: string;
  annotations_json: any;
  created_at: string;
}

export interface Goal {
  id: string;
  match_id: string;
  scorer_id: string;
  assist_id: string | null;
  minute: number | null;
  video_id: string | null;
  video_time: number | null;
  created_at: string;
}

export interface PlayerPhoto {
  id: string;
  player_id: string;
  photo_url: string;
  match_id: string | null;
  caption: string | null;
  created_at: string;
}

export interface PlayerClip {
  id: string;
  player_id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  title: string;
  category: 'goal' | 'assist' | 'skill' | 'defense' | 'other';
  created_at: string;
}

// ============================================
// PLAYERS
// ============================================

export async function getPlayers(): Promise<Player[]> {
  if (!isProductionMode()) {
    // Fallback to localStorage
    const data = localStorage.getItem('slatina-players');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('active', true)
    .order('number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPlayer(id: string): Promise<Player | null> {
  if (!isProductionMode()) {
    const players = JSON.parse(localStorage.getItem('slatina-players') || '[]');
    return players.find((p: Player) => p.id === id) || null;
  }

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createPlayer(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<Player> {
  if (!isProductionMode()) {
    const players = JSON.parse(localStorage.getItem('slatina-players') || '[]');
    const newPlayer = { ...player, id: `player-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    players.push(newPlayer);
    localStorage.setItem('slatina-players', JSON.stringify(players));
    return newPlayer as Player;
  }

  const { data, error } = await supabase
    .from('players')
    .insert(player as any)
    .select()
    .single();

  if (error) throw error;
  return data as Player;
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<Player | null> {
  if (!isProductionMode()) {
    const players = JSON.parse(localStorage.getItem('slatina-players') || '[]');
    const index = players.findIndex((p: Player) => p.id === id);
    if (index === -1) return null;
    players[index] = { ...players[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('slatina-players', JSON.stringify(players));
    return players[index];
  }

  const { data, error } = await supabase
    .from('players')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Player;
}

// ============================================
// VIDEOS
// ============================================

export async function getVideos(): Promise<Video[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-videos');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getVideo(id: string): Promise<Video | null> {
  if (!isProductionMode()) {
    const videos = JSON.parse(localStorage.getItem('slatina-videos') || '[]');
    return videos.find((v: Video) => v.id === id) || null;
  }

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createVideo(video: Omit<Video, 'id' | 'created_at' | 'updated_at'>): Promise<Video> {
  if (!isProductionMode()) {
    const videos = JSON.parse(localStorage.getItem('slatina-videos') || '[]');
    const newVideo = { ...video, id: `video-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    videos.unshift(newVideo);
    localStorage.setItem('slatina-videos', JSON.stringify(videos));
    return newVideo as Video;
  }

  const { data, error } = await supabase
    .from('videos')
    .insert(video as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
  if (!isProductionMode()) {
    const videos = JSON.parse(localStorage.getItem('slatina-videos') || '[]');
    const index = videos.findIndex((v: Video) => v.id === id);
    if (index === -1) return null;
    videos[index] = { ...videos[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('slatina-videos', JSON.stringify(videos));
    return videos[index];
  }

  const { data, error } = await supabase
    .from('videos')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVideo(id: string): Promise<void> {
  if (!isProductionMode()) {
    const videos = JSON.parse(localStorage.getItem('slatina-videos') || '[]');
    const filtered = videos.filter((v: Video) => v.id !== id);
    localStorage.setItem('slatina-videos', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// COMMENTS
// ============================================

export async function getComments(videoId: string): Promise<Comment[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-comments');
    const comments = data ? JSON.parse(data) : [];
    return comments.filter((c: Comment) => c.video_id === videoId);
  }

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('video_id', videoId)
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment> {
  if (!isProductionMode()) {
    const comments = JSON.parse(localStorage.getItem('slatina-comments') || '[]');
    const newComment = { ...comment, id: `comment-${Date.now()}`, created_at: new Date().toISOString() };
    comments.push(newComment);
    localStorage.setItem('slatina-comments', JSON.stringify(comments));
    return newComment as Comment;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert(comment as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  if (!isProductionMode()) {
    const comments = JSON.parse(localStorage.getItem('slatina-comments') || '[]');
    const filtered = comments.filter((c: Comment) => c.id !== id);
    localStorage.setItem('slatina-comments', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// SCREENSHOTS
// ============================================

export async function getScreenshots(videoId: string): Promise<Screenshot[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-screenshots');
    const screenshots = data ? JSON.parse(data) : [];
    return screenshots.filter((s: Screenshot) => s.video_id === videoId);
  }

  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .eq('video_id', videoId)
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createScreenshot(screenshot: Omit<Screenshot, 'id' | 'created_at'>): Promise<Screenshot> {
  if (!isProductionMode()) {
    const screenshots = JSON.parse(localStorage.getItem('slatina-screenshots') || '[]');
    const newScreenshot = { ...screenshot, id: `screenshot-${Date.now()}`, created_at: new Date().toISOString() };
    screenshots.push(newScreenshot);
    localStorage.setItem('slatina-screenshots', JSON.stringify(screenshots));
    return newScreenshot as Screenshot;
  }

  const { data, error } = await supabase
    .from('screenshots')
    .insert(screenshot as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// AUDIO COMMENTS
// ============================================

export async function getAudioComments(videoId: string): Promise<AudioComment[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-audio-comments');
    const comments = data ? JSON.parse(data) : [];
    return comments.filter((c: AudioComment) => c.video_id === videoId);
  }

  const { data, error } = await supabase
    .from('audio_comments')
    .select('*')
    .eq('video_id', videoId)
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createAudioComment(comment: Omit<AudioComment, 'id' | 'created_at'>): Promise<AudioComment> {
  if (!isProductionMode()) {
    const comments = JSON.parse(localStorage.getItem('slatina-audio-comments') || '[]');
    const newComment = { ...comment, id: `audio-${Date.now()}`, created_at: new Date().toISOString() };
    comments.push(newComment);
    localStorage.setItem('slatina-audio-comments', JSON.stringify(comments));
    return newComment as AudioComment;
  }

  const { data, error } = await supabase
    .from('audio_comments')
    .insert(comment as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// MATCHES
// ============================================

export async function getMatches(): Promise<Match[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-matches');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMatch(match: Omit<Match, 'id' | 'created_at' | 'updated_at'>): Promise<Match> {
  if (!isProductionMode()) {
    const matches = JSON.parse(localStorage.getItem('slatina-matches') || '[]');
    const newMatch = { ...match, id: `match-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    matches.unshift(newMatch);
    localStorage.setItem('slatina-matches', JSON.stringify(matches));
    return newMatch as Match;
  }

  const { data, error } = await supabase
    .from('matches')
    .insert(match as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// PLAYER PHOTOS
// ============================================

export async function getPlayerPhotos(playerId: string): Promise<PlayerPhoto[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-player-photos');
    const photos = data ? JSON.parse(data) : [];
    return photos.filter((p: PlayerPhoto) => p.player_id === playerId);
  }

  const { data, error } = await supabase
    .from('player_photos')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPlayerPhoto(photo: Omit<PlayerPhoto, 'id' | 'created_at'>): Promise<PlayerPhoto> {
  if (!isProductionMode()) {
    const photos = JSON.parse(localStorage.getItem('slatina-player-photos') || '[]');
    const newPhoto = { ...photo, id: `photo-${Date.now()}`, created_at: new Date().toISOString() };
    photos.unshift(newPhoto);
    localStorage.setItem('slatina-player-photos', JSON.stringify(photos));
    return newPhoto as PlayerPhoto;
  }

  const { data, error } = await supabase
    .from('player_photos')
    .insert(photo as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlayerPhoto(id: string): Promise<void> {
  if (!isProductionMode()) {
    const photos = JSON.parse(localStorage.getItem('slatina-player-photos') || '[]');
    const filtered = photos.filter((p: PlayerPhoto) => p.id !== id);
    localStorage.setItem('slatina-player-photos', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('player_photos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// PLAYER CLIPS
// ============================================

export async function getPlayerClips(playerId: string): Promise<PlayerClip[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-player-clips');
    const clips = data ? JSON.parse(data) : [];
    return clips.filter((c: PlayerClip) => c.player_id === playerId);
  }

  const { data, error } = await supabase
    .from('player_clips')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPlayerClip(clip: Omit<PlayerClip, 'id' | 'created_at'>): Promise<PlayerClip> {
  if (!isProductionMode()) {
    const clips = JSON.parse(localStorage.getItem('slatina-player-clips') || '[]');
    const newClip = { ...clip, id: `clip-${Date.now()}`, created_at: new Date().toISOString() };
    clips.unshift(newClip);
    localStorage.setItem('slatina-player-clips', JSON.stringify(clips));
    return newClip as PlayerClip;
  }

  const { data, error } = await supabase
    .from('player_clips')
    .insert(clip as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlayerClip(id: string): Promise<void> {
  if (!isProductionMode()) {
    const clips = JSON.parse(localStorage.getItem('slatina-player-clips') || '[]');
    const filtered = clips.filter((c: PlayerClip) => c.id !== id);
    localStorage.setItem('slatina-player-clips', JSON.stringify(clips));
    return;
  }

  const { error } = await supabase
    .from('player_clips')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// GOALS
// ============================================

export async function getGoals(matchId?: string): Promise<Goal[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-goals');
    const goals = data ? JSON.parse(data) : [];
    return matchId ? goals.filter((g: Goal) => g.match_id === matchId) : goals;
  }

  let query = supabase.from('goals').select('*');
  if (matchId) {
    query = query.eq('match_id', matchId);
  }

  const { data, error } = await query.order('minute', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createGoal(goal: Omit<Goal, 'id' | 'created_at'>): Promise<Goal> {
  if (!isProductionMode()) {
    const goals = JSON.parse(localStorage.getItem('slatina-goals') || '[]');
    const newGoal = { ...goal, id: `goal-${Date.now()}`, created_at: new Date().toISOString() };
    goals.push(newGoal);
    localStorage.setItem('slatina-goals', JSON.stringify(goals));
    return newGoal as Goal;
  }

  const { data, error } = await supabase
    .from('goals')
    .insert(goal as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}
