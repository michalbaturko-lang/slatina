import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireTeamAccess } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getStreamingUrl,
  deleteObject,
} from '../lib/s3.js';
import { v4 as uuid } from 'uuid';

export const videosRouter = Router();

const createVideoSchema = z.object({
  teamId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  filename: z.string(),
  contentType: z.string(),
  matchDate: z.string().optional(),
  opponent: z.string().optional(),
});

// Get videos for a team
videosRouter.get(
  '/team/:teamId',
  authenticate,
  requireTeamAccess,
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { status, limit = 50, offset = 0 } = req.query;

      const where: any = { teamId };
      if (status) {
        where.status = status;
      }

      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset),
          include: {
            uploadedBy: {
              select: { id: true, name: true },
            },
            _count: {
              select: { annotations: true, aiEvents: true, comments: true },
            },
          },
        }),
        prisma.video.count({ where }),
      ]);

      res.json({ videos, total });
    } catch (error) {
      next(error);
    }
  }
);

// Get single video
videosRouter.get('/:videoId', authenticate, async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        team: {
          select: { id: true, name: true },
        },
        uploadedBy: {
          select: { id: true, name: true },
        },
        annotations: {
          orderBy: { startTime: 'asc' },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        aiEvents: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    // Check team access
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: video.teamId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership && req.user!.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Get streaming URL
    let streamingUrl: string | null = null;
    if (video.status === 'READY' && video.s3KeyProcessed) {
      streamingUrl = getStreamingUrl(`${video.s3KeyProcessed}/hls/master.m3u8`);
    }

    res.json({ video, streamingUrl });
  } catch (error) {
    next(error);
  }
});

// Create video (get upload URL)
videosRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createVideoSchema.parse(req.body);

    // Verify team access
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: data.teamId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership && req.user!.role !== 'ADMIN') {
      throw new AppError('Not a member of this team', 403);
    }

    const videoId = uuid();

    // Get presigned upload URL
    const uploadData = await getPresignedUploadUrl({
      teamId: data.teamId,
      videoId,
      filename: data.filename,
      contentType: data.contentType,
    });

    // Create video record
    const video = await prisma.video.create({
      data: {
        id: videoId,
        teamId: data.teamId,
        title: data.title,
        description: data.description,
        s3Key: uploadData.key,
        uploadedById: req.user!.id,
        matchDate: data.matchDate ? new Date(data.matchDate) : null,
        opponent: data.opponent,
        status: 'UPLOADING',
      },
    });

    res.status(201).json({
      video,
      upload: uploadData,
    });
  } catch (error) {
    next(error);
  }
});

// Mark upload complete
videosRouter.post('/:videoId/complete', authenticate, async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    if (video.uploadedById !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Not authorized', 403);
    }

    // Update status - Lambda will pick this up for processing
    const updated = await prisma.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' },
    });

    res.json({ video: updated });
  } catch (error) {
    next(error);
  }
});

// Delete video
videosRouter.delete('/:videoId', authenticate, async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    // Check permissions
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: video.teamId,
          userId: req.user!.id,
        },
      },
    });

    const canDelete =
      req.user!.role === 'ADMIN' ||
      membership?.role === 'ADMIN' ||
      membership?.role === 'COACH' ||
      video.uploadedById === req.user!.id;

    if (!canDelete) {
      throw new AppError('Not authorized to delete this video', 403);
    }

    // Delete from S3
    await deleteObject(video.s3Key);
    if (video.s3KeyProcessed) {
      // TODO: Delete all processed files
    }

    // Delete from database
    await prisma.video.delete({
      where: { id: videoId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get download URL
videosRouter.get('/:videoId/download', authenticate, async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    const url = await getPresignedDownloadUrl(video.s3Key);

    res.json({ url });
  } catch (error) {
    next(error);
  }
});
