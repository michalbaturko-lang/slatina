import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const teamsRouter = Router();

const createTeamSchema = z.object({
  name: z.string().min(2),
  sport: z.string().min(2),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'COACH', 'ASSISTANT', 'PLAYER']).default('PLAYER'),
});

// Get user's teams
teamsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: req.user!.id,
          },
        },
      },
      include: {
        _count: {
          select: { members: true, videos: true },
        },
        members: {
          where: { userId: req.user!.id },
          select: { role: true },
        },
      },
    });

    res.json({ teams });
  } catch (error) {
    next(error);
  }
});

// Get single team
teamsRouter.get('/:teamId', authenticate, async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        _count: {
          select: { videos: true },
        },
      },
    });

    if (!team) {
      throw new AppError('Team not found', 404);
    }

    const isMember = team.members.some((m) => m.userId === req.user!.id);
    if (!isMember && req.user!.role !== 'ADMIN') {
      throw new AppError('Not a member of this team', 403);
    }

    res.json({ team });
  } catch (error) {
    next(error);
  }
});

// Create team
teamsRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createTeamSchema.parse(req.body);

    const team = await prisma.team.create({
      data: {
        name: data.name,
        sport: data.sport,
        members: {
          create: {
            userId: req.user!.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    res.status(201).json({ team });
  } catch (error) {
    next(error);
  }
});

// Update team
teamsRouter.put('/:teamId', authenticate, async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const data = createTeamSchema.partial().parse(req.body);

    // Check admin access
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: req.user!.id,
        },
      },
    });

    if (membership?.role !== 'ADMIN' && req.user!.role !== 'ADMIN') {
      throw new AppError('Only team admins can update the team', 403);
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data,
    });

    res.json({ team });
  } catch (error) {
    next(error);
  }
});

// Add member
teamsRouter.post('/:teamId/members', authenticate, async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const data = addMemberSchema.parse(req.body);

    // Check admin access
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if already member
    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new AppError('User is already a member', 400);
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: user.id,
        role: data.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ member });
  } catch (error) {
    next(error);
  }
});

// Remove member
teamsRouter.delete(
  '/:teamId/members/:userId',
  authenticate,
  async (req, res, next) => {
    try {
      const { teamId, userId } = req.params;

      // Check admin access (or self-removal)
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user!.id,
          },
        },
      });

      const isSelf = userId === req.user!.id;
      const isAdmin = membership?.role === 'ADMIN' || req.user!.role === 'ADMIN';

      if (!isSelf && !isAdmin) {
        throw new AppError('Insufficient permissions', 403);
      }

      await prisma.teamMember.delete({
        where: {
          teamId_userId: {
            teamId,
            userId,
          },
        },
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
