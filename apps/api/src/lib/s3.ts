import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { config } from '../config/index.js';

const s3Client = new S3Client({
  region: config.aws.region,
  credentials: config.aws.accessKeyId
    ? {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey!,
      }
    : undefined,
});

export interface PresignedUploadParams {
  teamId: string;
  videoId: string;
  filename: string;
  contentType: string;
}

export async function getPresignedUploadUrl(params: PresignedUploadParams) {
  const key = `raw/${params.teamId}/${params.videoId}/${params.filename}`;

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: config.aws.s3.bucket,
    Key: key,
    Conditions: [
      ['content-length-range', 0, config.upload.maxVideoSize],
      ['starts-with', '$Content-Type', 'video/'],
    ],
    Fields: {
      'Content-Type': params.contentType,
    },
    Expires: config.aws.s3.uploadExpiration,
  });

  return { url, fields, key };
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3.bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: config.aws.s3.bucket,
    Key: key,
  });

  return s3Client.send(command);
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  return s3Client.send(command);
}

export function getStreamingUrl(key: string): string {
  if (config.aws.cloudfront.domain) {
    return `https://${config.aws.cloudfront.domain}/${key}`;
  }
  return `https://${config.aws.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
}
