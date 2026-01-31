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

export interface CoachComment {
  id: string;
  videoId: string;
  time: number;
  text: string;
  category: 'praise' | 'improvement' | 'tactic' | 'note';
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

const TEAM_KEY = 'slatina-team';
const COMMENTS_KEY = 'slatina-comments';
const FEEDBACK_KEY = 'slatina-feedback';

// Default team configuration - SK Slatina 2007
const DEFAULT_TEAM: TeamConfig = {
  id: 'default',
  name: 'SK Slatina 2007',
  jerseyColor: '#22c55e', // zelená
  secondaryColor: '#ffffff',
  ageGroup: 'U15', // ročník 2007 = U15 v roce 2022, U18 v 2025
  formation: '4-3-3',
  focusAreas: ['pressing', 'transition', 'marking', 'combination'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Trenéři SK Slatina
export const COACHES = [
  { id: 'ales', name: 'Aleš', role: 'Hlavní trenér' },
  { id: 'jirka', name: 'Jirka', role: 'Asistent' },
  { id: 'david', name: 'David', role: 'Asistent' },
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
