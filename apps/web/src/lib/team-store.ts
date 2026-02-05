/**
 * Team Store - Konfigurace týmu pro AI analýzu
 */

export interface TeamConfig {
  id: string;
  name: string;
  jerseyColor: string;
  secondaryColor: string;
  ageGroup: 'U7' | 'U8' | 'U9' | 'U10' | 'U11' | 'U12' | 'U13' | 'U14' | 'U15';
  formation: string;
  focusAreas: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Player {
  id: string;
  name: string;
  number?: number;
  position?: string;
  active: boolean;
  photoUrl?: string;
  introVideoUrl?: string;
}

// Player photo in gallery
export interface PlayerPhoto {
  id: string;
  playerId: string;
  photoUrl: string;
  matchId?: string;
  caption?: string;
  createdAt: number;
}

// Player video clip (best moment)
export interface PlayerClip {
  id: string;
  playerId: string;
  videoId: string;
  startTime: number;
  endTime: number;
  title: string;
  category: 'goal' | 'assist' | 'skill' | 'defense' | 'other';
  createdAt: number;
}

export interface CoachComment {
  id: string;
  videoId: string;
  time: number;
  text: string;
  category: 'praise' | 'improvement' | 'tactic' | 'note';
  playerIds: string[]; // Hráči, kterých se komentář týká
  createdAt: number;
}

export interface AIFeedback {
  id: string;
  eventId: string;
  videoId: string;
  isCorrect: boolean;
  comment: string;
  correctLabel?: string;
  createdAt: number;
}

// Zápas nebo turnaj
export interface Match {
  id: string;
  type: 'match' | 'tournament' | 'training';
  name: string;
  opponent?: string;
  date: string;
  location?: string;
  result?: {
    goalsFor: number;
    goalsAgainst: number;
  };
  videoIds: string[];
  playerIds: string[]; // Hráči, kteří se účastnili
  createdAt: number;
}

// Gól nebo asistence
export interface Goal {
  id: string;
  matchId: string;
  videoId?: string;
  playerId: string;
  assistPlayerId?: string;
  minute?: number;
  videoTime?: number; // Čas ve videu
  createdAt: number;
}

// Statistiky hráče
export interface PlayerStats {
  playerId: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  commentsCount: number;
}

const TEAM_KEY = 'slatina-team';
const COMMENTS_KEY = 'slatina-comments';
const FEEDBACK_KEY = 'slatina-feedback';
const PLAYERS_KEY = 'slatina-players';
const MATCHES_KEY = 'slatina-matches';
const GOALS_KEY = 'slatina-goals';
const PLAYER_PHOTOS_KEY = 'slatina-player-photos';
const PLAYER_CLIPS_KEY = 'slatina-player-clips';

// Default team configuration - SK Slatina 2017
const DEFAULT_TEAM: TeamConfig = {
  id: 'default',
  name: 'SK Slatina 2017',
  jerseyColor: '#ffffff', // bílá
  secondaryColor: '#22c55e', // zelená
  ageGroup: 'U9', // ročník 2017 = U9 v roce 2026
  formation: '3-1',
  focusAreas: ['square_basics', 'offer_basics', 'small_games'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Trenéři SK Slatina
export interface Coach {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
}

const COACHES_KEY = 'slatina-coaches';

const DEFAULT_COACHES: Coach[] = [
  { id: 'ales', name: 'Aleš', role: 'Hlavní trenér' },
  { id: 'jirka', name: 'Jirka', role: 'Asistent' },
  { id: 'david', name: 'David', role: 'Asistent' },
];

export function getCoaches(): Coach[] {
  if (typeof window === 'undefined') return DEFAULT_COACHES;
  const data = localStorage.getItem(COACHES_KEY);
  return data ? JSON.parse(data) : DEFAULT_COACHES;
}

export function updateCoach(id: string, updates: Partial<Coach>): Coach | null {
  const coaches = getCoaches();
  const index = coaches.findIndex(c => c.id === id);
  if (index === -1) return null;
  coaches[index] = { ...coaches[index], ...updates };
  if (typeof window !== 'undefined') {
    localStorage.setItem(COACHES_KEY, JSON.stringify(coaches));
  }
  return coaches[index];
}

// Legacy export for compatibility
export const COACHES = DEFAULT_COACHES;

// Soupeři - týmy proti kterým hrajeme
export const OPPONENT_TEAMS = [
  { id: 'prace', name: 'Prace' },
  { id: 'ratiskovice', name: 'Ratíškovice' },
  { id: 'slovan', name: 'Slovan' },
  { id: 'rafk', name: 'RAFK' },
  { id: 'vyskov', name: 'Vyškov' },
  { id: 'chrlice', name: 'Chrlice' },
];

// Seznam hráčů SK Slatina 2017
const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Tom Frank', number: 1, active: true }, // také 15
  { id: 'p2', name: 'Míša Nguyen', number: 2, active: true },
  { id: 'p3', name: 'Domča Handl', number: 3, active: true },
  { id: 'p6', name: 'Adri Do', number: 6, active: true },
  { id: 'p7', name: 'Aďa Štěpán', number: 7, active: true },
  { id: 'p8', name: 'Míša Baturko', number: 8, active: true },
  { id: 'p9', name: 'Patrik Beneš', number: 9, active: true },
  { id: 'p10', name: 'Honza Joura', number: 10, active: true },
  { id: 'p11', name: 'Filip Braun', number: 11, active: true },
  { id: 'p12', name: 'Hugo Heger', number: 12, active: true },
  { id: 'p13', name: 'Lukáš Hrdlička', active: true },
  { id: 'p14', name: 'Jindra Tomsa', active: true },
  { id: 'p15', name: 'David Peterka', active: true },
];

// Team configuration
export function getTeam(): TeamConfig {
  if (typeof window === 'undefined') return DEFAULT_TEAM;
  const data = localStorage.getItem(TEAM_KEY);
  return data ? JSON.parse(data) : DEFAULT_TEAM;
}

export function saveTeam(team: Partial<TeamConfig>): TeamConfig {
  const current = getTeam();
  const updated = {
    ...current,
    ...team,
    updatedAt: Date.now(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(TEAM_KEY, JSON.stringify(updated));
  }
  return updated;
}

// Coach comments
export function getComments(videoId?: string): CoachComment[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(COMMENTS_KEY);
  const comments: CoachComment[] = data ? JSON.parse(data) : [];
  return videoId ? comments.filter(c => c.videoId === videoId) : comments;
}

export function addComment(comment: Omit<CoachComment, 'id' | 'createdAt'>): CoachComment {
  const newComment: CoachComment = {
    ...comment,
    id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  const comments = getComments();
  comments.push(newComment);
  if (typeof window !== 'undefined') {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  }
  return newComment;
}

export function deleteComment(id: string): void {
  const comments = getComments().filter(c => c.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  }
}

// AI Feedback for learning
export function getFeedback(videoId?: string): AIFeedback[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(FEEDBACK_KEY);
  const feedback: AIFeedback[] = data ? JSON.parse(data) : [];
  return videoId ? feedback.filter(f => f.videoId === videoId) : feedback;
}

export function addFeedback(feedback: Omit<AIFeedback, 'id' | 'createdAt'>): AIFeedback {
  const newFeedback: AIFeedback = {
    ...feedback,
    id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  const allFeedback = getFeedback();
  allFeedback.push(newFeedback);
  if (typeof window !== 'undefined') {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(allFeedback));
  }
  return newFeedback;
}

// Get learning stats
export function getLearningStats(): { total: number; correct: number; incorrect: number; accuracy: number } {
  const feedback = getFeedback();
  const correct = feedback.filter(f => f.isCorrect).length;
  const incorrect = feedback.filter(f => !f.isCorrect).length;
  const total = feedback.length;
  return {
    total,
    correct,
    incorrect,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

// Age group specific focus areas
export const AGE_GROUP_FOCUS: Record<string, string[]> = {
  'U7': ['fun', 'ball_control', 'dribbling'],
  'U8': ['fun', 'ball_control', 'passing_basics'],
  'U9': ['square_basics', 'offer_basics', 'small_games'],
  'U10': ['square', 'offer', 'simple_combinations'],
  'U11': ['square', 'offer', 'marking_basics', 'positions'],
  'U12': ['square', 'offer', 'marking', 'transitions'],
  'U13': ['tactics', 'pressing', 'build_up', 'set_pieces'],
  'U14': ['tactics', 'pressing', 'counter_attack', 'defensive_line'],
  'U15': ['advanced_tactics', 'game_reading', 'leadership'],
};

// Formation options by age group
export const FORMATIONS: Record<string, string[]> = {
  'U7': ['bez formace'],
  'U8': ['2-1', '1-2'],
  'U9': ['2-2', '3-1', '1-3'],
  'U10': ['3-2-1', '2-3-1', '3-3'],
  'U11': ['3-2-1', '2-3-1', '3-3', '4-2'],
  'U12': ['3-3-1', '4-2-1', '3-2-2'],
  'U13': ['4-3-1', '3-4-1', '4-2-2'],
  'U14': ['4-3-3', '4-4-2', '3-5-2'],
  'U15': ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'],
};

// === PLAYER MANAGEMENT ===

// Force reset players to default (useful when roster changes)
export function resetPlayersToDefault(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PLAYERS_KEY);
  }
}

export function getPlayers(): Player[] {
  if (typeof window === 'undefined') return DEFAULT_PLAYERS;
  const data = localStorage.getItem(PLAYERS_KEY);
  return data ? JSON.parse(data) : DEFAULT_PLAYERS;
}

export function savePlayers(players: Player[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  }
}

export function addPlayer(player: Omit<Player, 'id'>): Player {
  const newPlayer: Player = {
    ...player,
    id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  const players = getPlayers();
  players.push(newPlayer);
  savePlayers(players);
  return newPlayer;
}

export function updatePlayer(id: string, updates: Partial<Player>): Player | null {
  const players = getPlayers();
  const index = players.findIndex(p => p.id === id);
  if (index === -1) return null;
  players[index] = { ...players[index], ...updates };
  savePlayers(players);
  return players[index];
}

export function deletePlayer(id: string): void {
  const players = getPlayers().filter(p => p.id !== id);
  savePlayers(players);
}

export function getPlayerById(id: string): Player | undefined {
  return getPlayers().find(p => p.id === id);
}

export function getPlayersByIds(ids: string[]): Player[] {
  const players = getPlayers();
  return ids.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];
}

export function searchPlayers(query: string): Player[] {
  const players = getPlayers().filter(p => p.active);
  if (!query.trim()) return players;
  const lowerQuery = query.toLowerCase();
  return players.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    (p.number && p.number.toString().includes(query))
  );
}

// Get comments for a specific player across all videos
export function getCommentsForPlayer(playerId: string): CoachComment[] {
  const comments = getComments();
  return comments.filter(c => c.playerIds?.includes(playerId));
}

// Get all videos that have comments about a specific player
export function getVideoIdsForPlayer(playerId: string): string[] {
  const comments = getCommentsForPlayer(playerId);
  return [...new Set(comments.map(c => c.videoId))];
}

// === MATCH/TOURNAMENT MANAGEMENT ===

export function getMatches(): Match[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(MATCHES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveMatches(matches: Match[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  }
}

export function addMatch(match: Omit<Match, 'id' | 'createdAt' | 'videoIds'>): Match {
  const newMatch: Match = {
    ...match,
    id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    videoIds: [],
    createdAt: Date.now(),
  };
  const matches = getMatches();
  matches.unshift(newMatch);
  saveMatches(matches);
  return newMatch;
}

export function updateMatch(id: string, updates: Partial<Match>): Match | null {
  const matches = getMatches();
  const index = matches.findIndex(m => m.id === id);
  if (index === -1) return null;
  matches[index] = { ...matches[index], ...updates };
  saveMatches(matches);
  return matches[index];
}

export function deleteMatch(id: string): void {
  const matches = getMatches().filter(m => m.id !== id);
  saveMatches(matches);
}

export function getMatchById(id: string): Match | undefined {
  return getMatches().find(m => m.id === id);
}

export function addVideoToMatch(matchId: string, videoId: string): void {
  const match = getMatchById(matchId);
  if (match && !match.videoIds.includes(videoId)) {
    updateMatch(matchId, { videoIds: [...match.videoIds, videoId] });
  }
}

export function getMatchesForPlayer(playerId: string): Match[] {
  return getMatches().filter(m => m.playerIds?.includes(playerId));
}

// === GOAL MANAGEMENT ===

export function getGoals(): Goal[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(GOALS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveGoals(goals: Goal[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  }
}

export function addGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Goal {
  const newGoal: Goal = {
    ...goal,
    id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  const goals = getGoals();
  goals.push(newGoal);
  saveGoals(goals);
  return newGoal;
}

export function deleteGoal(id: string): void {
  const goals = getGoals().filter(g => g.id !== id);
  saveGoals(goals);
}

export function getGoalsForMatch(matchId: string): Goal[] {
  return getGoals().filter(g => g.matchId === matchId);
}

export function getGoalsForPlayer(playerId: string): Goal[] {
  return getGoals().filter(g => g.playerId === playerId);
}

export function getAssistsForPlayer(playerId: string): Goal[] {
  return getGoals().filter(g => g.assistPlayerId === playerId);
}

// === PLAYER STATISTICS ===

export function getPlayerStats(playerId: string): PlayerStats {
  const matches = getMatchesForPlayer(playerId);
  const goals = getGoalsForPlayer(playerId);
  const assists = getAssistsForPlayer(playerId);
  const comments = getCommentsForPlayer(playerId);

  return {
    playerId,
    matchesPlayed: matches.length,
    goals: goals.length,
    assists: assists.length,
    commentsCount: comments.length,
  };
}

export function getAllPlayerStats(): PlayerStats[] {
  const players = getPlayers();
  return players.map(p => getPlayerStats(p.id));
}

// === PLAYER PHOTO GALLERY ===

export function getPlayerPhotos(playerId?: string): PlayerPhoto[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PLAYER_PHOTOS_KEY);
  const photos: PlayerPhoto[] = data ? JSON.parse(data) : [];
  return playerId ? photos.filter(p => p.playerId === playerId) : photos;
}

export function savePlayerPhotos(photos: PlayerPhoto[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PLAYER_PHOTOS_KEY, JSON.stringify(photos));
  }
}

export function addPlayerPhoto(photo: Omit<PlayerPhoto, 'id' | 'createdAt'>): PlayerPhoto {
  const newPhoto: PlayerPhoto = {
    ...photo,
    id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  const photos = getPlayerPhotos();
  photos.unshift(newPhoto);
  savePlayerPhotos(photos);
  return newPhoto;
}

export function deletePlayerPhoto(id: string): void {
  const photos = getPlayerPhotos().filter(p => p.id !== id);
  savePlayerPhotos(photos);
}

// === PLAYER CLIPS (BEST MOMENTS) ===

export function getPlayerClips(playerId?: string): PlayerClip[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PLAYER_CLIPS_KEY);
  const clips: PlayerClip[] = data ? JSON.parse(data) : [];
  return playerId ? clips.filter(c => c.playerId === playerId) : clips;
}

export function savePlayerClips(clips: PlayerClip[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PLAYER_CLIPS_KEY, JSON.stringify(clips));
  }
}

export function addPlayerClip(clip: Omit<PlayerClip, 'id' | 'createdAt'>): PlayerClip {
  const newClip: PlayerClip = {
    ...clip,
    id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  const clips = getPlayerClips();
  clips.unshift(newClip);
  savePlayerClips(clips);
  return newClip;
}

export function deletePlayerClip(id: string): void {
  const clips = getPlayerClips().filter(c => c.id !== id);
  savePlayerClips(clips);
}
