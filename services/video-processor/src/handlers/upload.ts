/**
 * Lambda handler for processing uploaded videos
 *
 * Triggered by S3 upload events, starts MediaConvert job
 * and triggers AI analysis pipeline.
 */

import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import {
  MediaConvertClient,
  CreateJobCommand,
  CreateJobCommandInput,
} from '@aws-sdk/client-mediaconvert';
import {
  LambdaClient,
  InvokeCommand,
} from '@aws-sdk/client-lambda';
import { S3Event, Context } from 'aws-lambda';

const s3Client = new S3Client({});
const mediaConvertClient = new MediaConvertClient({
  endpoint: process.env.MEDIACONVERT_ENDPOINT,
});
const lambdaClient = new LambdaClient({});

const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET!;
const MEDIACONVERT_ROLE = process.env.MEDIACONVERT_ROLE!;
const AI_ANALYZER_FUNCTION = process.env.AI_ANALYZER_FUNCTION!;
const WEBHOOK_URL = process.env.WEBHOOK_URL!;

interface VideoMetadata {
  videoId: string;
  teamId: string;
  uploadedBy: string;
  title: string;
}

export async function handler(event: S3Event, context: Context) {
  console.log('Processing upload event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing file: s3://${bucket}/${key}`);

    try {
      // Get video metadata from S3 object tags/metadata
      const metadata = await getVideoMetadata(bucket, key);

      // Start MediaConvert job
      const jobId = await startTranscodeJob(bucket, key, metadata);
      console.log(`Started MediaConvert job: ${jobId}`);

      // Trigger AI analysis (async)
      await triggerAIAnalysis(bucket, key, metadata);

      // Notify API about processing start
      await notifyWebhook({
        event: 'video.processing_started',
        videoId: metadata.videoId,
        jobId,
      });
    } catch (error) {
      console.error(`Error processing ${key}:`, error);

      // Notify about failure
      await notifyWebhook({
        event: 'video.processing_failed',
        key,
        error: String(error),
      });

      throw error;
    }
  }
}

async function getVideoMetadata(bucket: string, key: string): Promise<VideoMetadata> {
  const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);

  const metadata = response.Metadata || {};

  return {
    videoId: metadata['video-id'] || key.split('/').pop()?.replace(/\.[^.]+$/, '') || 'unknown',
    teamId: metadata['team-id'] || 'unknown',
    uploadedBy: metadata['uploaded-by'] || 'unknown',
    title: metadata['title'] || 'Untitled Video',
  };
}

async function startTranscodeJob(
  inputBucket: string,
  inputKey: string,
  metadata: VideoMetadata
): Promise<string> {
  const outputPrefix = `processed/${metadata.teamId}/${metadata.videoId}`;

  const jobSettings: CreateJobCommandInput = {
    Role: MEDIACONVERT_ROLE,
    Settings: {
      Inputs: [
        {
          FileInput: `s3://${inputBucket}/${inputKey}`,
          AudioSelectors: {
            'Audio Selector 1': {
              DefaultSelection: 'DEFAULT',
            },
          },
          VideoSelector: {},
          TimecodeSource: 'ZEROBASED',
        },
      ],
      OutputGroups: [
        // HLS output for adaptive streaming
        {
          Name: 'HLS',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              Destination: `s3://${OUTPUT_BUCKET}/${outputPrefix}/hls/`,
              SegmentLength: 6,
              MinSegmentLength: 2,
              ManifestDurationFormat: 'FLOATING_POINT',
              StreamInfResolution: 'INCLUDE',
            },
          },
          Outputs: [
            // 1080p
            {
              ContainerSettings: {
                Container: 'M3U8',
              },
              VideoDescription: {
                Width: 1920,
                Height: 1080,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'QVBR',
                    MaxBitrate: 8000000,
                    QvbrSettings: {
                      QvbrQualityLevel: 8,
                    },
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 128000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000,
                    },
                  },
                },
              ],
              NameModifier: '_1080p',
            },
            // 720p
            {
              ContainerSettings: {
                Container: 'M3U8',
              },
              VideoDescription: {
                Width: 1280,
                Height: 720,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'QVBR',
                    MaxBitrate: 5000000,
                    QvbrSettings: {
                      QvbrQualityLevel: 7,
                    },
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 128000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000,
                    },
                  },
                },
              ],
              NameModifier: '_720p',
            },
            // 480p
            {
              ContainerSettings: {
                Container: 'M3U8',
              },
              VideoDescription: {
                Width: 854,
                Height: 480,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'QVBR',
                    MaxBitrate: 2500000,
                    QvbrSettings: {
                      QvbrQualityLevel: 6,
                    },
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 96000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000,
                    },
                  },
                },
              ],
              NameModifier: '_480p',
            },
          ],
        },
        // Thumbnails
        {
          Name: 'Thumbnails',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: `s3://${OUTPUT_BUCKET}/${outputPrefix}/thumbnails/`,
            },
          },
          Outputs: [
            {
              ContainerSettings: {
                Container: 'RAW',
              },
              VideoDescription: {
                Width: 640,
                Height: 360,
                CodecSettings: {
                  Codec: 'FRAME_CAPTURE',
                  FrameCaptureSettings: {
                    FramerateNumerator: 1,
                    FramerateDenominator: 30, // 1 frame every 30 seconds
                    MaxCaptures: 20,
                    Quality: 80,
                  },
                },
              },
            },
          ],
        },
      ],
    },
    UserMetadata: {
      videoId: metadata.videoId,
      teamId: metadata.teamId,
    },
  };

  const command = new CreateJobCommand(jobSettings);
  const response = await mediaConvertClient.send(command);

  return response.Job?.Id || 'unknown';
}

async function triggerAIAnalysis(
  bucket: string,
  key: string,
  metadata: VideoMetadata
): Promise<void> {
  const command = new InvokeCommand({
    FunctionName: AI_ANALYZER_FUNCTION,
    InvocationType: 'Event', // Async invocation
    Payload: JSON.stringify({
      bucket,
      key,
      videoId: metadata.videoId,
      teamId: metadata.teamId,
    }),
  });

  await lambdaClient.send(command);
  console.log('Triggered AI analysis for video:', metadata.videoId);
}

async function notifyWebhook(payload: Record<string, unknown>): Promise<void> {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Webhook notification failed:', response.status);
    }
  } catch (error) {
    console.error('Failed to send webhook:', error);
  }
}
