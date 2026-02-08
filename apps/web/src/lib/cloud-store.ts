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
  profile_background_url: string | null;
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

export interface Coach {
  id: string;
  name: string;
  role: string;
  photo_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Static data - opponents and default coaches
export const OPPONENT_TEAMS = [
  { id: 'prace', name: 'Prace' },
  { id: 'ratiskovice', name: 'Ratíškovice' },
  { id: 'slovan', name: 'Slovan' },
  { id: 'rafk', name: 'RAFK' },
  { id: 'vyskov', name: 'Vyškov' },
  { id: 'chrlice', name: 'Chrlice' },
  { id: 'velke-nemcice-a', name: 'Velké Němčice A' },
  { id: 'velke-nemcice-b', name: 'Velké Němčice B' },
  { id: 'cezava', name: 'Cézava' },
  { id: 'boretice', name: 'Bořetice' },
  { id: 'pohorelice', name: 'Pohořelice' },
];

export const DEFAULT_COACHES = [
  { id: 'ales', name: 'Aleš', role: 'Hlavní trenér' },
  { id: 'jirka', name: 'Jirka', role: 'Asistent' },
  { id: 'david', name: 'David', role: 'Asistent' },
];

export interface TeamConfig {
  id: string;
  name: string;
  jersey_color: string;
  secondary_color: string;
  age_group: string;
  formation: string;
  focus_areas: string[];
  created_at: string;
  updated_at: string;
}

export interface CoachComment {
  id: string;
  video_id: string;
  time: number;
  text: string;
  category: 'praise' | 'improvement' | 'tactic' | 'note';
  player_ids: string[];
  created_at: string;
}

export interface AIFeedback {
  id: string;
  event_id: string;
  video_id: string;
  is_correct: boolean;
  comment: string | null;
  correct_label: string | null;
  created_at: string;
}

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

// ============================================
// HELPER: Retry with exponential backoff
// ============================================
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
        const waitMs = Math.pow(2, attempt) * 1000;
        console.log(`[${label}] Retry ${attempt + 1}/${maxRetries} after ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }
  throw lastError;
}

// ============================================
// PLAYERS
// ============================================

export async function getPlayers(): Promise<Player[]> {
  if (!supabase) {
    console.error('[getPlayers] Supabase client not available');
    return [];
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
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createPlayer(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<Player> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('players')
    .insert(player as any)
    .select()
    .single();

  if (error) throw error;
  return data as Player;
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<Player | null> {
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) throw new Error('Supabase not available');

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

export async function seedPlayersIfEmpty(): Promise<{ seeded: boolean; count: number }> {
  try {
    const existing = await getPlayers();
    if (existing.length > 0) {
      return { seeded: false, count: existing.length };
    }

    for (const player of DEFAULT_ROSTER) {
      await createPlayer({
        name: player.name,
        number: player.number,
        position: player.position,
        photo_url: null,
        intro_video_url: null,
        profile_background_url: null,
        active: true,
      });
    }

    return { seeded: true, count: DEFAULT_ROSTER.length };
  } catch (err) {
    console.error('Failed to seed players:', err);
    throw err;
  }
}

export async function resetRosterToDefault(): Promise<{ count: number }> {
  const existing = await getPlayers();
  for (const player of existing) {
    await deletePlayerCloud(player.id);
  }
  return seedPlayersIfEmpty();
}

// ============================================
// VIDEOS
// ============================================

export async function getVideos(): Promise<Video[]> {
  if (!supabase) {
    console.error('[getVideos] Supabase client not available');
    return [];
  }

  try {
    const videos = await withRetry(async () => {
      const { data, error, status } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message} (${status})`);
      }
      return data || [];
    }, 2, 'getVideos');

    return videos;
  } catch (err) {
    console.error('[getVideos] Failed:', err);
    throw err;
  }
}

export async function getVideo(id: string): Promise<Video | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createVideo(video: Omit<Video, 'id' | 'created_at' | 'updated_at'>): Promise<Video> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('videos')
    .insert(video as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('video_id', videoId)
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('comments')
    .insert(comment as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .eq('video_id', videoId)
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createScreenshot(screenshot: Omit<Screenshot, 'id' | 'created_at'>): Promise<Screenshot> {
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('audio_comments')
    .select('*')
    .eq('video_id', videoId)
    .order('time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createAudioComment(comment: Omit<AudioComment, 'id' | 'created_at'>): Promise<AudioComment> {
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) return [];

  try {
    const matches = await withRetry(async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }, 2, 'getMatches');

    return matches;
  } catch (err) {
    console.error('[getMatches] Failed:', err);
    throw err;
  }
}

export async function getMatch(id: string): Promise<Match | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createMatch(match: Omit<Match, 'id' | 'created_at' | 'updated_at'>): Promise<Match> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('matches')
    .insert(match as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMatch(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('player_photos')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPlayerPhoto(photo: Omit<PlayerPhoto, 'id' | 'created_at'>): Promise<PlayerPhoto> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('player_photos')
    .insert(photo as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlayerPhoto(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('player_clips')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPlayerClip(clip: Omit<PlayerClip, 'id' | 'created_at'>): Promise<PlayerClip> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('player_clips')
    .insert(clip as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlayerClip(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not available');

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
  if (!supabase) return [];

  let query = supabase.from('goals').select('*');
  if (matchId) {
    query = query.eq('match_id', matchId);
  }

  const { data, error } = await query.order('minute', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createGoal(goal: Omit<Goal, 'id' | 'created_at'>): Promise<Goal> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('goals')
    .insert(goal as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGoalsForPlayer(playerId: string): Promise<Goal[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('scorer_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get goals for player:', error);
    return [];
  }
  return data || [];
}

export async function getAssistsForPlayer(playerId: string): Promise<Goal[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('assist_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get assists for player:', error);
    return [];
  }
  return data || [];
}

// ============================================
// MATCH PLAYERS (Lineup/Roster)
// ============================================

export async function getMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('match_players')
    .select('*')
    .eq('match_id', matchId);

  if (error) throw error;
  return data || [];
}

export async function addPlayerToMatch(matchPlayer: Omit<MatchPlayer, 'id' | 'created_at'>): Promise<MatchPlayer> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('match_players')
    .insert(matchPlayer as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removePlayerFromMatch(matchId: string, playerId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not available');

  const { error } = await supabase
    .from('match_players')
    .delete()
    .eq('match_id', matchId)
    .eq('player_id', playerId);

  if (error) throw error;
}

export async function updateMatchPlayer(id: string, updates: Partial<MatchPlayer>): Promise<MatchPlayer | null> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('match_players')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMatchesForPlayer(playerId: string): Promise<Match[]> {
  if (!supabase) return [];

  const { data: matchPlayerData, error: mpError } = await supabase
    .from('match_players')
    .select('match_id')
    .eq('player_id', playerId);

  if (mpError || !matchPlayerData || matchPlayerData.length === 0) {
    return [];
  }

  const matchIds = matchPlayerData.map(mp => mp.match_id);

  const { data: matchesData, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .in('id', matchIds)
    .order('date', { ascending: false });

  if (matchError) throw matchError;
  return matchesData || [];
}

// ============================================
// VIDEO RATINGS
// ============================================

export async function getRatings(videoId: string): Promise<VideoRating[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('video_ratings')
    .select('*')
    .eq('video_id', videoId)
    .order('time', { ascending: true });

  if (error) {
    console.error('Failed to get ratings:', error);
    return [];
  }
  return data || [];
}

export async function getAllRatings(): Promise<VideoRating[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('video_ratings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get all ratings:', error);
    return [];
  }
  return data || [];
}

export async function createRating(rating: Omit<VideoRating, 'id' | 'created_at'>): Promise<VideoRating> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('video_ratings')
    .insert(rating as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRating(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not available');

  const { error } = await supabase
    .from('video_ratings')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getRatingsForPlayer(playerId: string): Promise<VideoRating[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('video_ratings')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get ratings for player:', error);
    return [];
  }
  return data || [];
}

export async function getVideoIdsWithPlayerRating(playerId: string): Promise<string[]> {
  const ratings = await getRatingsForPlayer(playerId);
  return [...new Set(ratings.map(r => r.video_id))];
}

// ============================================
// COACHES
// ============================================

export async function getCoaches(): Promise<Coach[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Failed to get coaches:', error);
    return [];
  }
  return data || [];
}

export async function updateCoach(id: string, updates: Partial<Coach>): Promise<Coach | null> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('coaches')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// TEAM CONFIG
// ============================================

export async function getTeamConfig(): Promise<TeamConfig | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('team_config')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Failed to get team config:', error);
    return null;
  }
  return data;
}

export async function updateTeamConfig(updates: Partial<TeamConfig>): Promise<TeamConfig | null> {
  if (!supabase) throw new Error('Supabase not available');

  const existing = await getTeamConfig();
  if (!existing) return null;

  const { data, error } = await supabase
    .from('team_config')
    .update(updates as any)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// COACH COMMENTS (extended)
// ============================================

export async function getCoachComments(videoId?: string): Promise<CoachComment[]> {
  if (!supabase) return [];

  let query = supabase.from('coach_comments').select('*');
  if (videoId) {
    query = query.eq('video_id', videoId);
  }

  const { data, error } = await query.order('time', { ascending: true });
  if (error) {
    console.error('Failed to get coach comments:', error);
    return [];
  }
  return data || [];
}

export async function createCoachComment(comment: Omit<CoachComment, 'id' | 'created_at'>): Promise<CoachComment> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('coach_comments')
    .insert(comment as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCoachComment(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not available');

  const { error } = await supabase
    .from('coach_comments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getCoachCommentsForPlayer(playerId: string): Promise<CoachComment[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('coach_comments')
    .select('*')
    .contains('player_ids', [playerId])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get coach comments for player:', error);
    return [];
  }
  return data || [];
}

// ============================================
// AI FEEDBACK
// ============================================

export async function getAIFeedback(videoId?: string): Promise<AIFeedback[]> {
  if (!supabase) return [];

  let query = supabase.from('ai_feedback').select('*');
  if (videoId) {
    query = query.eq('video_id', videoId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to get AI feedback:', error);
    return [];
  }
  return data || [];
}

export async function createAIFeedback(feedback: Omit<AIFeedback, 'id' | 'created_at'>): Promise<AIFeedback> {
  if (!supabase) throw new Error('Supabase not available');

  const { data, error } = await supabase
    .from('ai_feedback')
    .insert(feedback as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getLearningStats(): Promise<{ total: number; correct: number; incorrect: number; accuracy: number }> {
  const feedback = await getAIFeedback();
  const correct = feedback.filter(f => f.is_correct).length;
  const incorrect = feedback.filter(f => !f.is_correct).length;
  const total = feedback.length;
  return {
    total,
    correct,
    incorrect,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
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

export async function exportAllData(): Promise<ExportData> {
  const [players, matches, videos, goals, playerPhotos, playerClips, comments, ratings] = await Promise.all([
    getPlayers(),
    getMatches(),
    getVideos(),
    getGoals(),
    getAllPlayerPhotos(),
    getAllPlayerClips(),
    getAllComments(),
    getAllRatings(),
  ]);

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

async function getAllPlayerPhotos(): Promise<PlayerPhoto[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('player_photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getAllPlayerClips(): Promise<PlayerClip[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('player_clips')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getAllComments(): Promise<Comment[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

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

export async function importData(jsonData: ExportData): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

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
            profile_background_url: player.profile_background_url || null,
            active: player.active,
          });
          imported++;
        } else {
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

  if (jsonData.ratings?.length) {
    const existingRatings = await getAllRatings();
    const existingIds = new Set(existingRatings.map(r => r.id));

    for (const rating of jsonData.ratings) {
      if (!existingIds.has(rating.id)) {
        try {
          await createRating({
            video_id: rating.video_id,
            time: rating.time,
            type: rating.type,
            player_id: rating.player_id,
            player_name: rating.player_name,
            note: rating.note,
          });
          imported++;
        } catch (err) {
          console.error('Failed to import rating:', err);
          skipped++;
        }
      } else {
        skipped++;
      }
    }
  }

  return { imported, skipped };
}
