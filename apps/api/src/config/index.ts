import 'dotenv/config';

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // AWS
  aws: {
    region: process.env.AWS_REGION || 'eu-central-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3: {
      bucket: process.env.S3_BUCKET || 'slatina-videos-dev',
      uploadExpiration: 3600, // 1 hour
    },
    cloudfront: {
      domain: process.env.CLOUDFRONT_DOMAIN,
      keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
    },
    mediaConvert: {
      endpoint: process.env.MEDIACONVERT_ENDPOINT,
      queue: process.env.MEDIACONVERT_QUEUE,
      role: process.env.MEDIACONVERT_ROLE,
    },
    sagemaker: {
      endpoint: process.env.SAGEMAKER_ENDPOINT,
    },
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Upload limits
  upload: {
    maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE || '10737418240', 10), // 10GB
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
    ],
  },
} as const;
