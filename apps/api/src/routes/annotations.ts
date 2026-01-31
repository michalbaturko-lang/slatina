import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadBuffer, getPresignedDownloadUrl } from '../lib/s3.js';
import { v4 as uuid } from 'uuid';

export const annotationsRouter = Router();

const createAnnotationSchema = z.object({
  videoId: z.string().uuid(),
  type: z.enum([
    'PENCIL',
    'ARROW',
    'CIRCLE',
    'RECTANGLE',
    'PLAYER_X',
    'PLAYER_O',
    'TEXT',
    'SPOTLIGHT',
    'MEASUREMENT',
  ]),
  startTime: z.number(),
  endTime: z.number().optional(),
  data: z.object({
    points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
    startPoint: z.object({ x: z.number(), y: z.number() }).optional(),
    endPoint: z.object({ x: z.number(), y: z.number() }).optional(),
    curvePoint: z.object({ x: z.number(), y: z.number() }).optional(),
    text: z.string().optional(),
    fontSize: z.number().optional(),
    color: z.string(),
    strokeWidth: z.number(),
    opacity: z.number().optional(),
  }),
});

const updateAnnotationSchema = createAnnotationSchema.partial().omit({
  videoId: true,
});

// Get annotations for a video
annotationsRouter.get('/video/:videoId', authenticate, async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const annotations = await prisma.annotation.findMany({
      where: { videoId },
      orderBy: { startTime: 'asc' },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Get audio URLs for annotations with audio
    const annotationsWithAudio = await Promise.all(
      annotations.map(async (annotation) => {
        let audioUrl: string | undefined;
        if (annotation.audioS3Key) {
          audioUrl = await getPresignedDownloadUrl(annotation.audioS3Key);
        }
        return { ...annotation, audioUrl };
      })
    );

    res.json({ annotations: annotationsWithAudio });
  } catch (error) {
    next(error);
  }
});

// Create annotation
annotationsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createAnnotationSchema.parse(req.body);

    // Verify video exists and user has access
    const video = await prisma.video.findUnique({
      where: { id: data.videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404);
    }

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

    const annotation = await prisma.annotation.create({
      data: {
        videoId: data.videoId,
        userId: req.user!.id,
        type: data.type,
        startTime: data.startTime,
        endTime: data.endTime,
        data: data.data,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({ annotation });
  } catch (error) {
    next(error);
  }
});

// Update annotation
annotationsRouter.put('/:annotationId', authenticate, async (req, res, next) => {
  try {
    const { annotationId } = req.params;
    const data = updateAnnotationSchema.parse(req.body);

    const existing = await prisma.annotation.findUnique({
      where: { id: annotationId },
    });

    if (!existing) {
      throw new AppError('Annotation not found', 404);
    }

    if (existing.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new AppError('Not authorized to edit this annotation', 403);
    }

    const annotation = await prisma.annotation.update({
      where: { id: annotationId },
      data: {
        type: data.type,
        startTime: data.startTime,
        endTime: data.endTime,
        data: data.data,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({ annotation });
  } catch (error) {
    next(error);
  }
});

// Delete annotation
annotationsRouter.delete(
  '/:annotationId',
  authenticate,
  async (req, res, next) => {
    try {
      const { annotationId } = req.params;

      const existing = await prisma.annotation.findUnique({
        where: { id: annotationId },
      });

      if (!existing) {
        throw new AppError('Annotation not found', 404);
      }

      if (existing.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new AppError('Not authorized to delete this annotation', 403);
      }

      await prisma.annotation.delete({
        where: { id: annotationId },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Upload audio for annotation
annotationsRouter.post(
  '/:annotationId/audio',
  authenticate,
  async (req, res, next) => {
    try {
      const { annotationId } = req.params;

      const annotation = await prisma.annotation.findUnique({
        where: { id: annotationId },
        include: { video: true },
      });

      if (!annotation) {
        throw new AppError('Annotation not found', 404);
      }

      if (annotation.userId !== req.user!.id) {
        throw new AppError('Not authorized', 403);
      }

      // Expect base64 audio in body
      const { audio } = req.body;
      if (!audio) {
        throw new AppError('Audio data required', 400);
      }

      const buffer = Buffer.from(audio, 'base64');
      const s3Key = `annotations/${annotation.videoId}/${annotationId}.webm`;

      await uploadBuffer(s3Key, buffer, 'audio/webm');

      const updated = await prisma.annotation.update({
        where: { id: annotationId },
        data: { audioS3Key: s3Key },
      });

      const audioUrl = await getPresignedDownloadUrl(s3Key);

      res.json({ annotation: updated, audioUrl });
    } catch (error) {
      next(error);
    }
  }
);
