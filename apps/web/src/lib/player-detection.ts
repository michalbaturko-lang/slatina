/**
 * Player Detection - Automatic detection of jersey numbers from video frames
 */

import { getPlayers, Player } from './team-store';

export interface DetectionResult {
  numbers: number[];
  confidence: 'high' | 'medium' | 'low';
  players: Player[];
  detectedAt: number;
}

/**
 * Calculate optimal frame extraction parameters based on video duration
 */
function getFrameExtractionParams(duration: number): { numFrames: number; interval: number } {
  if (duration <= 10) {
    // Up to 10 seconds: 5 frames, ~2 seconds apart
    return { numFrames: 5, interval: 2 };
  } else if (duration <= 30) {
    // Up to 30 seconds: 10 frames, ~3 seconds apart
    return { numFrames: 10, interval: 3 };
  } else if (duration <= 60) {
    // Up to 60 seconds: 10 frames, ~6 seconds apart
    return { numFrames: 10, interval: 6 };
  } else if (duration <= 120) {
    // Up to 2 minutes: 10 frames, ~12 seconds apart
    return { numFrames: 10, interval: 12 };
  } else {
    // Longer videos: 10 frames evenly distributed
    return { numFrames: 10, interval: duration / 10 };
  }
}

/**
 * Extract frames from a video element at regular intervals
 */
export async function extractFramesFromVideo(
  videoElement: HTMLVideoElement,
  numFrames?: number,
  quality: number = 0.85
): Promise<string[]> {
  const frames: string[] = [];
  const duration = videoElement.duration;

  if (!duration || duration <= 0) {
    throw new Error('Video has no duration');
  }

  // Get optimal parameters based on video duration
  const params = getFrameExtractionParams(duration);
  const actualNumFrames = numFrames || params.numFrames;
  const frameInterval = params.interval;

  // Create canvas for capturing frames
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Set canvas size - higher resolution for better number detection
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / videoElement.videoWidth);
  canvas.width = videoElement.videoWidth * scale;
  canvas.height = videoElement.videoHeight * scale;

  // Calculate frame times using the interval
  const startTime = Math.min(1, duration * 0.05); // Start at 1 second or 5% of video
  const maxEndTime = duration - 1; // End 1 second before the end

  for (let i = 0; i < actualNumFrames; i++) {
    let time = startTime + (frameInterval * i);
    // Make sure we don't exceed the video duration
    if (time > maxEndTime) {
      time = maxEndTime;
    }

    // Seek to time
    videoElement.currentTime = time;

    // Wait for seek to complete
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        resolve();
      };
      videoElement.addEventListener('seeked', onSeeked);
    });

    // Draw frame to canvas
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    frames.push(dataUrl);
  }

  return frames;
}

/**
 * Detect players from video frames using the API
 */
export async function detectPlayersFromFrames(frames: string[]): Promise<DetectionResult> {
  const response = await fetch('/api/detect-players', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ images: frames }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Detection failed');
  }

  const data = await response.json();

  // Match detected numbers to players
  const allPlayers = getPlayers();
  const detectedPlayers = data.numbers
    .map((num: number) => allPlayers.find(p => p.number === num))
    .filter(Boolean) as Player[];

  return {
    numbers: data.numbers,
    confidence: data.confidence,
    players: detectedPlayers,
    detectedAt: Date.now(),
  };
}

/**
 * Main function to detect players from a video URL
 */
export async function detectPlayersFromVideoUrl(
  videoUrl: string,
  onProgress?: (status: string) => void
): Promise<DetectionResult> {
  onProgress?.('Načítání videa...');

  // Create video element
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.preload = 'auto';

  // Load video
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = videoUrl;
  });

  // Wait for video to be ready
  await new Promise<void>((resolve) => {
    if (video.readyState >= 2) {
      resolve();
    } else {
      video.oncanplay = () => resolve();
    }
  });

  onProgress?.('Extrahování snímků...');
  const frames = await extractFramesFromVideo(video, 8);

  onProgress?.('Analyzování snímků...');
  const result = await detectPlayersFromFrames(frames);

  // Clean up
  video.src = '';
  video.load();

  return result;
}

/**
 * Storage key for detected players on videos
 */
const VIDEO_PLAYERS_KEY = 'slatina-video-players';

export interface VideoPlayersData {
  [videoId: string]: {
    playerIds: string[];
    numbers: number[];
    confidence: 'high' | 'medium' | 'low';
    detectedAt: number;
    manual?: boolean; // true if manually edited
  };
}

/**
 * Get all video-player associations
 */
export function getVideoPlayers(): VideoPlayersData {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(VIDEO_PLAYERS_KEY);
  return data ? JSON.parse(data) : {};
}

/**
 * Save video-player associations
 */
export function saveVideoPlayers(data: VideoPlayersData): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(VIDEO_PLAYERS_KEY, JSON.stringify(data));
  }
}

/**
 * Get players for a specific video
 */
export function getPlayersForVideo(videoId: string): { playerIds: string[]; numbers: number[]; confidence?: string; manual?: boolean } | null {
  const data = getVideoPlayers();
  return data[videoId] || null;
}

/**
 * Save detected players for a video
 */
export function savePlayersForVideo(
  videoId: string,
  result: DetectionResult,
  manual: boolean = false
): void {
  const data = getVideoPlayers();
  data[videoId] = {
    playerIds: result.players.map(p => p.id),
    numbers: result.numbers,
    confidence: result.confidence,
    detectedAt: result.detectedAt,
    manual,
  };
  saveVideoPlayers(data);
}

/**
 * Manually set players for a video
 */
export function setPlayersForVideoManually(videoId: string, playerIds: string[]): void {
  const allPlayers = getPlayers();
  const selectedPlayers = playerIds
    .map(id => allPlayers.find(p => p.id === id))
    .filter(Boolean) as Player[];

  const numbers = selectedPlayers
    .map(p => p.number)
    .filter((n): n is number => n !== undefined);

  const data = getVideoPlayers();
  data[videoId] = {
    playerIds,
    numbers,
    confidence: 'high',
    detectedAt: Date.now(),
    manual: true,
  };
  saveVideoPlayers(data);
}

/**
 * Remove player detection data for a video
 */
export function removePlayersForVideo(videoId: string): void {
  const data = getVideoPlayers();
  delete data[videoId];
  saveVideoPlayers(data);
}

/**
 * Get videos that have a specific player
 */
export function getVideoIdsWithPlayer(playerId: string): string[] {
  const data = getVideoPlayers();
  return Object.entries(data)
    .filter(([, value]) => value.playerIds.includes(playerId))
    .map(([videoId]) => videoId);
}

/**
 * Get videos that have a specific jersey number
 */
export function getVideoIdsWithNumber(number: number): string[] {
  const data = getVideoPlayers();
  return Object.entries(data)
    .filter(([, value]) => value.numbers.includes(number))
    .map(([videoId]) => videoId);
}
