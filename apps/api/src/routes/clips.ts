import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { getPresignedDownloadUrl } from '../lib/s3.js';
import { v4 as uuid } from 'uuid';

export const clipsRouter = Router();

const createClipSchema = z.object({
  videoId: z.string().uuid(),
  title: z.string().optional(),
  description: z.string().optional(),
  startTime: z.number(),
  endTime: z.number(),
  includeAnnotations: z.boolean().default(true),
});

// Get clips for a video
clipsRouter.get('/video/:videoId', authenticate, async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const clips = await prisma.clip.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        shares: true,
      },
    });

    res.json({ clips });
  } catch (error) {
    next(error);
  }
});

// Create clip
clipsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createClipSchema.parse(req.body);

    // Verify video exists
    const video = await prisma.video.findUnique({
      where: { id: data.videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    // Verify team access
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: video.teamId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership && req.user!.role !== 'ADMIN') {
      throw new AppError('Not a member of this team', 403);
    }

    const clip = await prisma.clip.create({
      data: {
        videoId: data.videoId,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        createdById: req.user!.id,
        status: 'pending',
      },
    });

    // TODO: Trigger Lambda to create the clip
    // This would use MediaConvert or FFmpeg Lambda to:
    // 1. Extract the clip from the video
    // 2. Overlay annotations if requested
    // 3. Upload to S3
    // 4. Update clip status to 'ready'

    res.status(201).json({ clip });
  } catch (error) {
    next(error);
  }
});

// Get clip
clipsRouter.get('/:clipId', authenticate, async (req, res, next) => {
  try {
    const { clipId } = req.params;

    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
      include: {
        video: {
          select: { id: true, title: true, teamId: true },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (!clip) {
      throw new AppError('Clip not found', 404);
    }

    let downloadUrl: string | undefined;
    if (clip.s3Key && clip.status === 'ready') {
      downloadUrl = await getPresignedDownloadUrl(clip.s3Key);
    }

    res.json({ clip, downloadUrl });
  } catch (error) {
    next(error);
  }
});

// Share clip
clipsRouter.post('/:clipId/share', authenticate, async (req, res, next) => {
  try {
    const { clipId } = req.params;
    const { shareType = 'link', expiresInDays = 7 } = req.body;

    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
    });

    if (!clip) {
      throw new AppError('Clip not found', 404);
    }

    if (clip.status !== 'ready') {
      throw new AppError('Clip is not ready yet', 400);
    }

    const shareToken = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const share = await prisma.clipShare.create({
      data: {
        clipId,
        shareType,
        shareUrl: `/share/${shareToken}`,
        expiresAt,
      },
    });

    res.json({ share });
  } catch (error) {
    next(error);
  }
});

// Delete clip
clipsRouter.delete('/:clipId', authenticate, async (req, res, next) => {
  try {
    const { clipId } = req.params;

    const clip = await prisma.clip.findUnique({
      where: { id: clipId },
    });

    if (!clip) {
      throw new AppError('Clip not found', 404);
    }

    if (clip.createdById !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Not authorized', 403);
    }

    await prisma.clip.delete({
      where: { id: clipId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
