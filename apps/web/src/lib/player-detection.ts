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

  // Add random offset (up to half the interval) so "Znovu" gives different frames
  const randomOffset = Math.random() * (frameInterval / 2);

  for (let i = 0; i < actualNumFrames; i++) {
    let time = startTime + randomOffset + (frameInterval * i);
    // Make sure we don't exceed the video duration
    if (time > maxEndTime) {
      time = maxEndTime - Math.random() * 2; // Random position near end
    }
    if (time < 0) time = 0;

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
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Detect players from video frames using the API
 * Includes retry logic with exponential backoff for rate limiting (429 errors)
 */
export async function detectPlayersFromFrames(
  frames: string[],
  maxRetries: number = 3
): Promise<DetectionResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/detect-players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: frames }),
      });

      if (response.status === 429) {
        // Rate limited - wait and retry with exponential backoff
        const waitTime = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s
        console.log(`Rate limited (429), waiting ${waitTime / 1000}s before retry ${attempt + 1}/${maxRetries}`);

        if (attempt < maxRetries) {
          await sleep(waitTime);
          continue;
        } else {
          throw new Error('OpenAI API error: 429 - Příliš mnoho požadavků. Zkuste to za chvíli znovu.');
        }
      }

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
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on non-429 errors
      if (!lastError.message.includes('429')) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('Detection failed after retries');
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
 * Re-maps playerIds from jersey numbers to ensure they match current roster
 */
export function getVideoPlayers(): VideoPlayersData {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(VIDEO_PLAYERS_KEY);
  if (!data) return {};

  const parsed: VideoPlayersData = JSON.parse(data);
  const allPlayers = getPlayers();

  // Re-derive playerIds from numbers to match current roster IDs
  let changed = false;
  for (const videoId of Object.keys(parsed)) {
    const entry = parsed[videoId];
    if (!entry.numbers || entry.numbers.length === 0) continue;

    const correctIds = entry.numbers
      .map(num => allPlayers.find(p => p.number === num))
      .filter(Boolean)
      .map(p => p!.id);

    // Check if IDs need updating
    const currentIds = entry.playerIds || [];
    if (correctIds.length > 0 && (
      correctIds.length !== currentIds.length ||
      correctIds.some(id => !currentIds.includes(id))
    )) {
      parsed[videoId] = { ...entry, playerIds: correctIds };
      changed = true;
    }
  }

  if (changed) {
    localStorage.setItem(VIDEO_PLAYERS_KEY, JSON.stringify(parsed));
  }

  return parsed;
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
