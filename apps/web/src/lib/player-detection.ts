/**
 * Player Detection - Automatic detection of jersey numbers from video frames
 * Uses Supabase video_detections table for persistent storage
 */

import { supabase, isProductionMode } from './supabase';
import { getPlayers, Player } from './cloud-store';

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
      const allPlayers = await getPlayers();
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
 * Video detection data structure
 */
export interface VideoDetection {
  id: string;
  video_id: string;
  player_ids: string[];
  numbers: number[];
  confidence: 'high' | 'medium' | 'low';
  manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoPlayersData {
  [videoId: string]: {
    playerIds: string[];
    numbers: number[];
    confidence: 'high' | 'medium' | 'low';
    detectedAt: number;
    manual?: boolean;
  };
}

// Local cache for video detections
let detectionsCache: VideoPlayersData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get all video-player associations from Supabase
 */
export async function getVideoPlayersAsync(): Promise<VideoPlayersData> {
  if (!isProductionMode() || !supabase) {
    return {};
  }

  // Use cache if fresh
  if (detectionsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return detectionsCache;
  }

  try {
    const { data, error } = await (supabase
      .from('video_detections') as any)
      .select('*');

    if (error) throw error;

    const result: VideoPlayersData = {};
    const allPlayers = await getPlayers();

    interface DetectionRow {
      video_id: string;
      numbers: number[] | null;
      player_ids: string[] | null;
      confidence: 'high' | 'medium' | 'low' | null;
      manual: boolean | null;
      created_at: string;
    }

    for (const detection of (data as DetectionRow[]) || []) {
      // Re-derive playerIds from numbers to match current roster
      const correctIds = (detection.numbers || [])
        .map((num: number) => allPlayers.find(p => p.number === num))
        .filter((p): p is Player => p !== undefined)
        .map(p => p.id);

      result[detection.video_id] = {
        playerIds: correctIds.length > 0 ? correctIds : (detection.player_ids || []),
        numbers: detection.numbers || [],
        confidence: detection.confidence || 'medium',
        detectedAt: new Date(detection.created_at).getTime(),
        manual: detection.manual || false,
      };
    }

    detectionsCache = result;
    cacheTimestamp = Date.now();
    return result;
  } catch (err) {
    console.error('Failed to load video detections:', err);
    return detectionsCache || {};
  }
}

/**
 * Synchronous version for backward compatibility (uses cache)
 */
export function getVideoPlayers(): VideoPlayersData {
  return detectionsCache || {};
}

/**
 * Invalidate cache to force reload
 */
export function invalidateDetectionsCache(): void {
  detectionsCache = null;
  cacheTimestamp = 0;
}

/**
 * Get players for a specific video
 */
export async function getPlayersForVideoAsync(videoId: string): Promise<{ playerIds: string[]; numbers: number[]; confidence?: string; manual?: boolean } | null> {
  if (!isProductionMode() || !supabase) {
    return null;
  }

  try {
    const { data, error } = await (supabase
      .from('video_detections') as any)
      .select('*')
      .eq('video_id', videoId)
      .single();

    if (error || !data) return null;

    interface DetectionRow {
      numbers: number[] | null;
      player_ids: string[] | null;
      confidence: 'high' | 'medium' | 'low' | null;
      manual: boolean | null;
    }
    const detection = data as DetectionRow;

    const allPlayers = await getPlayers();
    const correctIds = (detection.numbers || [])
      .map((num: number) => allPlayers.find(p => p.number === num))
      .filter((p): p is Player => p !== undefined)
      .map(p => p.id);

    return {
      playerIds: correctIds.length > 0 ? correctIds : (detection.player_ids || []),
      numbers: detection.numbers || [],
      confidence: detection.confidence || undefined,
      manual: detection.manual || undefined,
    };
  } catch (err) {
    console.error('Failed to get video detection:', err);
    return null;
  }
}

/**
 * Synchronous version for backward compatibility
 */
export function getPlayersForVideo(videoId: string): { playerIds: string[]; numbers: number[]; confidence?: string; manual?: boolean } | null {
  const data = getVideoPlayers();
  return data[videoId] || null;
}

/**
 * Save detected players for a video to Supabase
 */
export async function savePlayersForVideo(
  videoId: string,
  result: DetectionResult,
  manual: boolean = false
): Promise<void> {
  if (!isProductionMode() || !supabase) {
    return;
  }

  try {
    const { error } = await (supabase
      .from('video_detections') as any)
      .upsert({
        video_id: videoId,
        player_ids: result.players.map(p => p.id),
        numbers: result.numbers,
        confidence: result.confidence,
        manual,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'video_id',
      });

    if (error) throw error;

    // Update local cache
    if (detectionsCache) {
      detectionsCache[videoId] = {
        playerIds: result.players.map(p => p.id),
        numbers: result.numbers,
        confidence: result.confidence,
        detectedAt: result.detectedAt,
        manual,
      };
    }
  } catch (err) {
    console.error('Failed to save video detection:', err);
    throw err;
  }
}

/**
 * Manually set players for a video
 */
export async function setPlayersForVideoManually(videoId: string, playerIds: string[]): Promise<void> {
  const allPlayers = await getPlayers();
  const selectedPlayers = playerIds
    .map(id => allPlayers.find(p => p.id === id))
    .filter(Boolean) as Player[];

  const numbers = selectedPlayers
    .map(p => p.number)
    .filter((n): n is number => n !== undefined && n !== null);

  const result: DetectionResult = {
    numbers,
    confidence: 'high',
    players: selectedPlayers,
    detectedAt: Date.now(),
  };

  await savePlayersForVideo(videoId, result, true);
}

/**
 * Remove player detection data for a video
 */
export async function removePlayersForVideo(videoId: string): Promise<void> {
  if (!isProductionMode() || !supabase) {
    return;
  }

  try {
    const { error } = await (supabase
      .from('video_detections') as any)
      .delete()
      .eq('video_id', videoId);

    if (error) throw error;

    // Update local cache
    if (detectionsCache) {
      delete detectionsCache[videoId];
    }
  } catch (err) {
    console.error('Failed to remove video detection:', err);
    throw err;
  }
}

/**
 * Get videos that have a specific player (by jersey number)
 */
export async function getVideoIdsWithPlayer(playerNumber: number): Promise<string[]> {
  if (!isProductionMode() || !supabase) {
    return [];
  }

  try {
    const { data, error } = await (supabase
      .from('video_detections') as any)
      .select('video_id, numbers');

    if (error) throw error;

    return (data || [])
      .filter((d: { video_id: string; numbers: number[] | null }) => d.numbers?.includes(playerNumber))
      .map((d: { video_id: string; numbers: number[] | null }) => d.video_id);
  } catch (err) {
    console.error('Failed to get videos with player:', err);
    return [];
  }
}

/**
 * Get videos that have a specific jersey number
 */
export async function getVideoIdsWithNumber(number: number): Promise<string[]> {
  return getVideoIdsWithPlayer(number);
}
