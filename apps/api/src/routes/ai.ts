import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const aiRouter = Router();

const feedbackSchema = z.object({
  eventId: z.string().uuid(),
  isCorrect: z.boolean(),
});

const customPatternSchema = z.object({
  sport: z.string(),
  name: z.string(),
  description: z.string().optional(),
  pattern: z.object({
    playerPositions: z
      .array(
        z.object({
          role: z.string(),
          relativePosition: z.object({ x: z.number(), y: z.number() }),
          tolerance: z.number(),
        })
      )
      .optional(),
    eventSequence: z
      .array(
        z.object({
          event: z.string(),
          maxTimeDelta: z.number(),
        })
      )
      .optional(),
  }),
  teamId: z.string().uuid().optional(),
});

// Get AI events for a video
aiRouter.get('/events/:videoId', authenticate, async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { eventType, minConfidence = 0.5 } = req.query;

    const where: any = {
      videoId,
      confidence: { gte: Number(minConfidence) },
    };

    if (eventType) {
      where.eventType = eventType;
    }

    const events = await prisma.aIEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    res.json({ events });
  } catch (error) {
    next(error);
  }
});

// Trigger AI analysis for a video
aiRouter.post('/analyze/:videoId', authenticate, async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new AppError('Video not found', 404);
    }

    if (video.status !== 'READY') {
      throw new AppError('Video must be processed first', 400);
    }

    // Update status
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'ANALYZING' },
    });

    // TODO: Trigger Lambda/SageMaker analysis
    // This would:
    // 1. Extract frames from video
    // 2. Run object detection (YOLO/Rekognition)
    // 3. Run player tracking (DeepSORT)
    // 4. Run event detection (custom model)
    // 5. Store results in ai_events table
    // 6. Update video status back to READY

    res.json({ message: 'Analysis started', videoId });
  } catch (error) {
    next(error);
  }
});

// Submit feedback on AI detection
aiRouter.post('/feedback', authenticate, async (req, res, next) => {
  try {
    const data = feedbackSchema.parse(req.body);

    const event = await prisma.aIEvent.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const updated = await prisma.aIEvent.update({
      where: { id: data.eventId },
      data: {
        verifiedById: req.user!.id,
        isCorrect: data.isCorrect,
      },
    });

    // This feedback will be used for model improvement
    // Could trigger a training data collection job

    res.json({ event: updated });
  } catch (error) {
    next(error);
  }
});

// Get strategy patterns
aiRouter.get('/patterns', authenticate, async (req, res, next) => {
  try {
    const { sport, teamId } = req.query;

    const where: any = {
      OR: [{ isGlobal: true }],
    };

    if (teamId) {
      where.OR.push({ teamId: teamId as string });
    }

    if (sport) {
      where.sport = sport;
    }

    const patterns = await prisma.strategyPattern.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ patterns });
  } catch (error) {
    next(error);
  }
});

// Create custom pattern
aiRouter.post('/patterns', authenticate, async (req, res, next) => {
  try {
    const data = customPatternSchema.parse(req.body);

    // If teamId provided, verify access
    if (data.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: data.teamId,
            userId: req.user!.id,
          },
        },
      });

      if (
        !['ADMIN', 'COACH'].includes(membership?.role || '') &&
        req.user!.role !== 'ADMIN'
      ) {
        throw new AppError('Insufficient permissions', 403);
      }
    }

    const pattern = await prisma.strategyPattern.create({
      data: {
        sport: data.sport,
        name: data.name,
        description: data.description,
        pattern: data.pattern,
        teamId: data.teamId,
        isGlobal: !data.teamId && req.user!.role === 'ADMIN',
      },
    });

    res.status(201).json({ pattern });
  } catch (error) {
    next(error);
  }
});

// Get AI statistics for a team
aiRouter.get('/stats/:teamId', authenticate, async (req, res, next) => {
  try {
    const { teamId } = req.params;

    // Get event type distribution
    const eventStats = await prisma.aIEvent.groupBy({
      by: ['eventType'],
      where: {
        video: { teamId },
      },
      _count: true,
      _avg: { confidence: true },
    });

    // Get feedback stats
    const feedbackStats = await prisma.aIEvent.groupBy({
      by: ['isCorrect'],
      where: {
        video: { teamId },
        isCorrect: { not: null },
      },
      _count: true,
    });

    const totalVerified = feedbackStats.reduce((sum, f) => sum + f._count, 0);
    const correctCount =
      feedbackStats.find((f) => f.isCorrect === true)?._count || 0;
    const accuracy = totalVerified > 0 ? correctCount / totalVerified : null;

    res.json({
      eventStats,
      feedbackStats: {
        totalVerified,
        accuracy,
      },
    });
  } catch (error) {
    next(error);
  }
});
