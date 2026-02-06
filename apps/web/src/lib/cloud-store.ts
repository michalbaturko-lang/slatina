// @ts-nocheck
'use client';

import { supabase, isProductionMode } from './supabase';

// Types matching database schema
export interface Player {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  photo_url: string | null;
  intro_video_url: string | null;
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

export interface MatchPlayer {
  id: string;
  match_id: string;
  player_id: string;
  played: boolean;
  minutes_played: number | null;
  goals: number;
  assists: number;
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

export async function deletePlayerCloud(id: string): Promise<void> {
  if (!isProductionMode()) {
    const players = JSON.parse(localStorage.getItem('slatina-players') || '[]');
    const filtered = players.filter((p: Player) => p.id !== id);
    localStorage.setItem('slatina-players', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Default roster for SK Slatina 2017
const DEFAULT_ROSTER = [
  { name: 'Tom Frank', number: 1, position: 'Brankář' },
  { name: 'Míša Nguyen', number: 2, position: null },
  { name: 'Domča Handl', number: 3, position: null },
  { name: 'Adri Do', number: 6, position: null },
  { name: 'Aďa Štěpán', number: 7, position: null },
  { name: 'Míša Baturko', number: 8, position: null },
  { name: 'Patrik Beneš', number: 9, position: null },
  { name: 'Honza Joura', number: 10, position: null },
  { name: 'Filip Braun', number: 11, position: null },
  { name: 'Hugo Heger', number: 12, position: null },
  { name: 'Lukáš Hrdlička', number: null, position: null },
  { name: 'Jindra Tomsa', number: null, position: null },
  { name: 'David Peterka', number: null, position: null },
];

/**
 * Seed default players into Supabase if empty
 * Call this on app init to ensure players exist
 */
export async function seedPlayersIfEmpty(): Promise<{ seeded: boolean; count: number }> {
  try {
    const existing = await getPlayers();
    if (existing.length > 0) {
      return { seeded: false, count: existing.length };
    }

    // Insert default roster
    for (const player of DEFAULT_ROSTER) {
      await createPlayer({
        name: player.name,
        number: player.number,
        position: player.position,
        photo_url: null,
        intro_video_url: null,
        active: true,
      });
    }

    return { seeded: true, count: DEFAULT_ROSTER.length };
  } catch (err) {
    console.error('Failed to seed players:', err);
    throw err;
  }
}

/**
 * Reset roster to default (delete all and re-seed)
 */
export async function resetRosterToDefault(): Promise<{ count: number }> {
  if (!isProductionMode()) {
    localStorage.removeItem('slatina-players');
    return seedPlayersIfEmpty();
  }

  // Delete all existing players
  const existing = await getPlayers();
  for (const player of existing) {
    await deletePlayerCloud(player.id);
  }

  // Re-seed
  return seedPlayersIfEmpty();
}

// ============================================
// VIDEOS
// ============================================

const VIDEOS_CACHE_KEY = 'slatina-videos-cache';
const MATCHES_CACHE_KEY = 'slatina-matches-cache';

/**
 * Helper: retry a Supabase query with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  label: string = ''
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt) * 1000; // 1s, 2s
        console.log(`[${label}] Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }
  throw lastError;
}

export async function getVideos(): Promise<Video[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-videos');
    return data ? JSON.parse(data) : [];
  }

  if (!supabase) {
    console.error('[getVideos] Supabase client is null!');
    // Fallback to cache
    const cached = typeof window !== 'undefined' ? localStorage.getItem(VIDEOS_CACHE_KEY) : null;
    if (cached) {
      console.log('[getVideos] Using cached data as fallback');
      return JSON.parse(cached);
    }
    throw new Error('Supabase připojení selhalo');
  }

  try {
    const videos = await withRetry(async () => {
      const { data, error, status } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Chyba databáze: ${error.message} (${status})`);
      }
      return data || [];
    }, 2, 'getVideos');

    // Cache successful results for fallback
    if (videos.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(VIDEOS_CACHE_KEY, JSON.stringify(videos));
    }

    // If Supabase returned 0 but we have cache, use cache
    if (videos.length === 0 && typeof window !== 'undefined') {
      const cached = localStorage.getItem(VIDEOS_CACHE_KEY);
      if (cached) {
        const cachedVideos = JSON.parse(cached);
        if (cachedVideos.length > 0) {
          console.warn('[getVideos] Supabase returned 0 videos, using cache with', cachedVideos.length, 'videos');
          return cachedVideos;
        }
      }
    }

    return videos;
  } catch (err) {
    // On complete failure, try cache
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(VIDEOS_CACHE_KEY);
      if (cached) {
        const cachedVideos = JSON.parse(cached);
        if (cachedVideos.length > 0) {
          console.warn('[getVideos] Using cached data after error:', err);
          return cachedVideos;
        }
      }
    }
    throw err;
  }
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

  if (!supabase) {
    const cached = typeof window !== 'undefined' ? localStorage.getItem(MATCHES_CACHE_KEY) : null;
    return cached ? JSON.parse(cached) : [];
  }

  try {
    const matches = await withRetry(async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }, 2, 'getMatches');

    if (matches.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(MATCHES_CACHE_KEY, JSON.stringify(matches));
    }

    if (matches.length === 0 && typeof window !== 'undefined') {
      const cached = localStorage.getItem(MATCHES_CACHE_KEY);
      if (cached) {
        const cachedMatches = JSON.parse(cached);
        if (cachedMatches.length > 0) return cachedMatches;
      }
    }

    return matches;
  } catch (err) {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(MATCHES_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    }
    throw err;
  }
}

export async function getMatch(id: string): Promise<Match | null> {
  if (!isProductionMode()) {
    const matches = JSON.parse(localStorage.getItem('slatina-matches') || '[]');
    return matches.find((m: Match) => m.id === id) || null;
  }

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
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

export async function deleteMatch(id: string): Promise<void> {
  if (!isProductionMode()) {
    const matches = JSON.parse(localStorage.getItem('slatina-matches') || '[]');
    const filtered = matches.filter((m: Match) => m.id !== id);
    localStorage.setItem('slatina-matches', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', id);

  if (error) throw error;
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

// ============================================
// MATCH PLAYERS (Lineup/Roster)
// ============================================

export async function getMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-match-players');
    const players = data ? JSON.parse(data) : [];
    return players.filter((p: MatchPlayer) => p.match_id === matchId);
  }

  const { data, error } = await supabase
    .from('match_players')
    .select('*')
    .eq('match_id', matchId);

  if (error) throw error;
  return data || [];
}

export async function addPlayerToMatch(matchPlayer: Omit<MatchPlayer, 'id' | 'created_at'>): Promise<MatchPlayer> {
  if (!isProductionMode()) {
    const players = JSON.parse(localStorage.getItem('slatina-match-players') || '[]');
    const newPlayer = { ...matchPlayer, id: `mp-${Date.now()}`, created_at: new Date().toISOString() };
    players.push(newPlayer);
    localStorage.setItem('slatina-match-players', JSON.stringify(players));
    return newPlayer as MatchPlayer;
  }

  const { data, error } = await supabase
    .from('match_players')
    .insert(matchPlayer as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removePlayerFromMatch(matchId: string, playerId: string): Promise<void> {
  if (!isProductionMode()) {
    const players = JSON.parse(localStorage.getItem('slatina-match-players') || '[]');
    const filtered = players.filter((p: MatchPlayer) => !(p.match_id === matchId && p.player_id === playerId));
    localStorage.setItem('slatina-match-players', JSON.stringify(filtered));
    return;
  }

  const { error } = await supabase
    .from('match_players')
    .delete()
    .eq('match_id', matchId)
    .eq('player_id', playerId);

  if (error) throw error;
}

export async function updateMatchPlayer(id: string, updates: Partial<MatchPlayer>): Promise<MatchPlayer | null> {
  if (!isProductionMode()) {
    const players = JSON.parse(localStorage.getItem('slatina-match-players') || '[]');
    const index = players.findIndex((p: MatchPlayer) => p.id === id);
    if (index === -1) return null;
    players[index] = { ...players[index], ...updates };
    localStorage.setItem('slatina-match-players', JSON.stringify(players));
    return players[index];
  }

  const { data, error } = await supabase
    .from('match_players')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============ VIDEO RATINGS (Hodnocení) ============

export type RatingType = 'problem' | 'interesting' | 'praise';

export interface VideoRating {
  id: string;
  video_id: string;
  time: number;
  type: RatingType;
  player_id?: string;
  player_name?: string;
  note?: string;
  created_at: string;
}

export async function getRatings(videoId: string): Promise<VideoRating[]> {
  // Local storage only for now
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('slatina-video-ratings');
  const ratings: VideoRating[] = data ? JSON.parse(data) : [];
  return ratings.filter(r => r.video_id === videoId);
}

export async function getAllRatings(): Promise<VideoRating[]> {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('slatina-video-ratings');
  return data ? JSON.parse(data) : [];
}

export async function createRating(rating: Omit<VideoRating, 'id' | 'created_at'>): Promise<VideoRating> {
  const newRating: VideoRating = {
    ...rating,
    id: `rating-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const ratings = JSON.parse(localStorage.getItem('slatina-video-ratings') || '[]');
    ratings.push(newRating);
    localStorage.setItem('slatina-video-ratings', JSON.stringify(ratings));
  }

  return newRating;
}

export async function deleteRating(id: string): Promise<void> {
  if (typeof window !== 'undefined') {
    const ratings = JSON.parse(localStorage.getItem('slatina-video-ratings') || '[]');
    const filtered = ratings.filter((r: VideoRating) => r.id !== id);
    localStorage.setItem('slatina-video-ratings', JSON.stringify(filtered));
  }
}

export async function getRatingsForPlayer(playerId: string): Promise<VideoRating[]> {
  const ratings = await getAllRatings();
  return ratings.filter(r => r.player_id === playerId);
}

export async function getVideoIdsWithPlayerRating(playerId: string): Promise<string[]> {
  const ratings = await getRatingsForPlayer(playerId);
  return [...new Set(ratings.map(r => r.video_id))];
}

// ============================================
// DATA EXPORT/IMPORT
// ============================================

export interface ExportData {
  version: number;
  exportedAt: string;
  players: Player[];
  matches: Match[];
  videos: Video[];
  goals: Goal[];
  playerPhotos: PlayerPhoto[];
  playerClips: PlayerClip[];
  comments: Comment[];
  ratings: VideoRating[];
}

/**
 * Export all data to JSON (for backup/transfer between devices)
 */
export async function exportAllData(): Promise<ExportData> {
  const [players, matches, videos, goals, playerPhotos, playerClips, ratings] = await Promise.all([
    getPlayers(),
    getMatches(),
    getVideos(),
    getGoals(),
    getAllPlayerPhotos(),
    getAllPlayerClips(),
    getAllRatings(),
  ]);

  // Comments need special handling - load all from localStorage
  const commentsData = typeof window !== 'undefined' ? localStorage.getItem('slatina-comments') : null;
  const comments = commentsData ? JSON.parse(commentsData) : [];

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    players,
    matches,
    videos,
    goals,
    playerPhotos,
    playerClips,
    comments,
    ratings,
  };
}

/**
 * Get all player photos (not filtered by player)
 */
async function getAllPlayerPhotos(): Promise<PlayerPhoto[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-player-photos');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('player_photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get all player clips (not filtered by player)
 */
async function getAllPlayerClips(): Promise<PlayerClip[]> {
  if (!isProductionMode()) {
    const data = localStorage.getItem('slatina-player-clips');
    return data ? JSON.parse(data) : [];
  }

  const { data, error } = await supabase
    .from('player_clips')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Download export as JSON file
 */
export async function downloadExport(): Promise<void> {
  const data = await exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `skslatina-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import data from JSON file (merges with existing data)
 */
export async function importData(jsonData: ExportData): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  // Import players
  if (jsonData.players?.length) {
    for (const player of jsonData.players) {
      try {
        const existing = await getPlayer(player.id);
        if (!existing) {
          await createPlayer({
            name: player.name,
            number: player.number,
            position: player.position,
            photo_url: player.photo_url,
            intro_video_url: player.intro_video_url,
            active: player.active,
          });
          imported++;
        } else {
          // Update existing player with photo/video URLs if missing
          if (!existing.photo_url && player.photo_url) {
            await updatePlayer(player.id, { photo_url: player.photo_url });
            imported++;
          } else if (!existing.intro_video_url && player.intro_video_url) {
            await updatePlayer(player.id, { intro_video_url: player.intro_video_url });
            imported++;
          } else {
            skipped++;
          }
        }
      } catch (err) {
        console.error('Failed to import player:', player.name, err);
        skipped++;
      }
    }
  }

  // Import ratings to localStorage
  if (jsonData.ratings?.length) {
    const existingRatings = await getAllRatings();
    const existingIds = new Set(existingRatings.map(r => r.id));
    const newRatings = jsonData.ratings.filter(r => !existingIds.has(r.id));

    if (newRatings.length > 0) {
      const allRatings = [...existingRatings, ...newRatings];
      localStorage.setItem('slatina-video-ratings', JSON.stringify(allRatings));
      imported += newRatings.length;
    }
    skipped += jsonData.ratings.length - newRatings.length;
  }

  return { imported, skipped };
}
