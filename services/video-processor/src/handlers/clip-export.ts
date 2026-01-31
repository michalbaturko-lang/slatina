/**
 * Lambda handler for exporting video clips with annotations
 *
 * Creates a rendered video clip with overlaid annotations
 * using FFmpeg (via Lambda layer).
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { spawn } from 'child_process';
import { createWriteStream, createReadStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const s3Client = new S3Client({});
const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET!;
const FFMPEG_PATH = process.env.FFMPEG_PATH || '/opt/bin/ffmpeg';

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  type: 'pencil' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'playerX' | 'playerO';
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string;
  startTime: number;
  endTime: number;
}

interface AudioAnnotation {
  id: string;
  s3Key: string;
  startTime: number;
  volume: number;
}

interface ClipExportRequest {
  videoId: string;
  teamId: string;
  sourceKey: string;
  startTime: number;
  endTime: number;
  annotations: Annotation[];
  audioAnnotations?: AudioAnnotation[];
  outputFormat?: 'mp4' | 'webm';
  resolution?: '1080p' | '720p' | '480p';
  includeOriginalAudio?: boolean;
}

interface ClipExportResponse {
  clipId: string;
  s3Key: string;
  presignedUrl: string;
  duration: number;
}

export async function handler(event: ClipExportRequest): Promise<ClipExportResponse> {
  console.log('Clip export request:', JSON.stringify(event, null, 2));

  const clipId = uuidv4();
  const tempDir = `/tmp/${clipId}`;
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // Download source video
    const sourcePath = path.join(tempDir, 'source.mp4');
    await downloadFromS3(event.sourceKey, sourcePath);

    // Generate annotation overlay filter
    const overlayFilter = generateAnnotationFilter(
      event.annotations,
      event.startTime,
      event.endTime,
      getResolution(event.resolution)
    );

    // Download and prepare audio annotations
    const audioInputs: string[] = [];
    const audioFilters: string[] = [];

    if (event.audioAnnotations && event.audioAnnotations.length > 0) {
      for (let i = 0; i < event.audioAnnotations.length; i++) {
        const audio = event.audioAnnotations[i];
        const audioPath = path.join(tempDir, `audio_${i}.webm`);
        await downloadFromS3(audio.s3Key, audioPath);
        audioInputs.push('-i', audioPath);

        // Delay audio to match annotation time
        const delay = (audio.startTime - event.startTime) * 1000;
        audioFilters.push(
          `[${i + 1}:a]adelay=${Math.max(0, delay)}|${Math.max(0, delay)},volume=${audio.volume}[a${i}]`
        );
      }
    }

    // Build FFmpeg command
    const outputPath = path.join(tempDir, `output.${event.outputFormat || 'mp4'}`);
    const duration = event.endTime - event.startTime;

    const ffmpegArgs = [
      '-y',
      '-ss', event.startTime.toString(),
      '-t', duration.toString(),
      '-i', sourcePath,
      ...audioInputs,
    ];

    // Video filter complex
    let filterComplex = `[0:v]${overlayFilter}[vout]`;

    // Audio mixing
    if (audioFilters.length > 0) {
      filterComplex += `;${audioFilters.join(';')}`;

      if (event.includeOriginalAudio !== false) {
        const audioMixInputs = audioFilters.map((_, i) => `[a${i}]`).join('');
        filterComplex += `;[0:a]${audioMixInputs}amix=inputs=${audioFilters.length + 1}[aout]`;
      } else {
        const audioMixInputs = audioFilters.map((_, i) => `[a${i}]`).join('');
        filterComplex += `;${audioMixInputs}amix=inputs=${audioFilters.length}[aout]`;
      }

      ffmpegArgs.push(
        '-filter_complex', filterComplex,
        '-map', '[vout]',
        '-map', '[aout]'
      );
    } else {
      ffmpegArgs.push(
        '-filter_complex', filterComplex,
        '-map', '[vout]',
        '-map', '0:a?'
      );
    }

    // Output settings
    const { width, height } = getResolution(event.resolution);
    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-s', `${width}x${height}`,
      '-movflags', '+faststart',
      outputPath
    );

    // Run FFmpeg
    await runFFmpeg(ffmpegArgs);

    // Upload result to S3
    const outputKey = `processed/${event.teamId}/${event.videoId}/clips/${clipId}.${event.outputFormat || 'mp4'}`;
    await uploadToS3(outputPath, outputKey);

    // Generate presigned URL
    const presignedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: OUTPUT_BUCKET,
        Key: outputKey,
      }),
      { expiresIn: 3600 * 24 } // 24 hours
    );

    return {
      clipId,
      s3Key: outputKey,
      presignedUrl,
      duration,
    };
  } finally {
    // Cleanup temp files
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function getResolution(resolution?: string): { width: number; height: number } {
  switch (resolution) {
    case '1080p':
      return { width: 1920, height: 1080 };
    case '480p':
      return { width: 854, height: 480 };
    case '720p':
    default:
      return { width: 1280, height: 720 };
  }
}

function generateAnnotationFilter(
  annotations: Annotation[],
  clipStart: number,
  clipEnd: number,
  resolution: { width: number; height: number }
): string {
  if (annotations.length === 0) {
    return 'null';
  }

  const filters: string[] = [];

  for (const annotation of annotations) {
    // Adjust times relative to clip start
    const showStart = Math.max(0, annotation.startTime - clipStart);
    const showEnd = Math.min(clipEnd - clipStart, annotation.endTime - clipStart);

    if (showStart >= showEnd) continue;

    const drawFilter = generateDrawFilter(annotation, resolution);
    if (drawFilter) {
      filters.push(`${drawFilter}:enable='between(t,${showStart},${showEnd})'`);
    }
  }

  if (filters.length === 0) {
    return 'null';
  }

  return filters.join(',');
}

function generateDrawFilter(
  annotation: Annotation,
  resolution: { width: number; height: number }
): string | null {
  const { width, height } = resolution;
  const { points, color, strokeWidth } = annotation;

  // Convert hex color to FFmpeg format
  const ffColor = color.replace('#', '0x');

  const toPixel = (p: Point) => ({
    x: Math.round(p.x * width),
    y: Math.round(p.y * height),
  });

  switch (annotation.type) {
    case 'circle':
      if (points.length < 2) return null;
      const c1 = toPixel(points[0]);
      const c2 = toPixel(points[1]);
      const radius = Math.round(
        Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2))
      );
      // FFmpeg doesn't have native circle, use ellipse
      return `drawbox=x=${c1.x - radius}:y=${c1.y - radius}:w=${radius * 2}:h=${radius * 2}:color=${ffColor}@0.8:t=${strokeWidth}`;

    case 'rectangle':
      if (points.length < 2) return null;
      const r1 = toPixel(points[0]);
      const r2 = toPixel(points[1]);
      const rx = Math.min(r1.x, r2.x);
      const ry = Math.min(r1.y, r2.y);
      const rw = Math.abs(r2.x - r1.x);
      const rh = Math.abs(r2.y - r1.y);
      return `drawbox=x=${rx}:y=${ry}:w=${rw}:h=${rh}:color=${ffColor}@0.8:t=${strokeWidth}`;

    case 'arrow':
      if (points.length < 2) return null;
      const a1 = toPixel(points[0]);
      const a2 = toPixel(points[1]);
      // Draw line (arrow head would require more complex filter)
      return `drawbox=x=${Math.min(a1.x, a2.x)}:y=${Math.min(a1.y, a2.y)}:w=${Math.abs(a2.x - a1.x) || strokeWidth}:h=${Math.abs(a2.y - a1.y) || strokeWidth}:color=${ffColor}@0.8:t=fill`;

    case 'text':
      if (!annotation.text || points.length < 1) return null;
      const tp = toPixel(points[0]);
      const escapedText = annotation.text.replace(/'/g, "\\'").replace(/:/g, "\\:");
      return `drawtext=text='${escapedText}':x=${tp.x}:y=${tp.y}:fontsize=24:fontcolor=${ffColor}`;

    case 'playerX':
      if (points.length < 1) return null;
      const px = toPixel(points[0]);
      // Draw X using two lines approximated with boxes
      return `drawbox=x=${px.x - 20}:y=${px.y - 2}:w=40:h=4:color=${ffColor}:t=fill,drawbox=x=${px.x - 2}:y=${px.y - 20}:w=4:h=40:color=${ffColor}:t=fill`;

    case 'playerO':
      if (points.length < 1) return null;
      const po = toPixel(points[0]);
      // Approximate circle with box (would need custom filter for real circle)
      return `drawbox=x=${po.x - 20}:y=${po.y - 20}:w=40:h=40:color=${ffColor}:t=${strokeWidth}`;

    default:
      return null;
  }
}

async function downloadFromS3(key: string, localPath: string): Promise<void> {
  const command = new GetObjectCommand({
    Bucket: OUTPUT_BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const writeStream = createWriteStream(localPath);

  await pipeline(response.Body as Readable, writeStream);
}

async function uploadToS3(localPath: string, key: string): Promise<void> {
  const readStream = createReadStream(localPath);

  const command = new PutObjectCommand({
    Bucket: OUTPUT_BUCKET,
    Key: key,
    Body: readStream,
    ContentType: key.endsWith('.webm') ? 'video/webm' : 'video/mp4',
  });

  await s3Client.send(command);
}

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Running FFmpeg:', FFMPEG_PATH, args.join(' '));

    const process = spawn(FFMPEG_PATH, args);

    let stderr = '';
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}
