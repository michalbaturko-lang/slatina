import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// GOAL & ASSIST TRACKING
// ============================================================================

interface GoalEvent {
  id: string;
  videoId: string;
  timestamp: number;
  scorerId: string;
  assisterId?: string;
  type: 'goal' | 'own_goal';
  detectedBy: 'ai' | 'manual';
  confidence?: number;
  verified: boolean;
}

/**
 * GET /api/stats/goals/:videoId
 * Get all goals detected in a video
 */
router.get('/goals/:videoId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const goals = await prisma.goalEvent.findMany({
      where: { videoId },
      include: {
        scorer: { select: { id: true, name: true, number: true } },
        assister: { select: { id: true, name: true, number: true } },
      },
      orderBy: { timestamp: 'asc' },
    });

    res.json({ goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

/**
 * POST /api/stats/goals
 * Add a goal (manual or AI-detected)
 */
router.post('/goals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { videoId, timestamp, scorerId, assisterId, type, detectedBy, confidence } = req.body;

    const goal = await prisma.goalEvent.create({
      data: {
        videoId,
        timestamp,
        scorerId,
        assisterId,
        type: type || 'goal',
        detectedBy: detectedBy || 'manual',
        confidence,
        verified: detectedBy === 'manual',
        createdBy: req.userId,
      },
      include: {
        scorer: { select: { id: true, name: true, number: true } },
        assister: { select: { id: true, name: true, number: true } },
      },
    });

    // Update player stats
    await updatePlayerGoalStats(scorerId, assisterId);

    res.status(201).json({ goal });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * PUT /api/stats/goals/:id/verify
 * Verify or reject an AI-detected goal
 */
router.put('/goals/:id/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { verified, scorerId, assisterId } = req.body;

    const goal = await prisma.goalEvent.update({
      where: { id },
      data: {
        verified,
        scorerId: scorerId || undefined,
        assisterId: assisterId || undefined,
        verifiedBy: req.userId,
        verifiedAt: new Date(),
      },
    });

    // Update stats if verified
    if (verified) {
      await updatePlayerGoalStats(goal.scorerId, goal.assisterId);
    }

    res.json({ goal });
  } catch (error) {
    console.error('Error verifying goal:', error);
    res.status(500).json({ error: 'Failed to verify goal' });
  }
});

/**
 * GET /api/stats/players/:playerId
 * Get comprehensive player statistics
 */
router.get('/players/:playerId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { playerId } = req.params;
    const { seasonId } = req.query;

    // Get basic stats
    const [goals, assists, appearances] = await Promise.all([
      prisma.goalEvent.count({
        where: { scorerId: playerId, verified: true },
      }),
      prisma.goalEvent.count({
        where: { assisterId: playerId, verified: true },
      }),
      prisma.videoAppearance.count({
        where: { playerId },
      }),
    ]);

    // Get AI-detected tactical stats
    const tacticalStats = await prisma.playerTacticalStat.findFirst({
      where: { playerId, seasonId: seasonId as string || undefined },
    });

    // Get recent issues
    const recentIssues = await prisma.playerIssue.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        video: { select: { id: true, title: true } },
      },
    });

    // Calculate improvement trend
    const previousMonthStats = await prisma.playerTacticalStat.findFirst({
      where: {
        playerId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    let improvementTrend: 'up' | 'down' | 'stable' = 'stable';
    if (tacticalStats && previousMonthStats) {
      const currentScore = tacticalStats.overallScore;
      const previousScore = previousMonthStats.overallScore;
      if (currentScore > previousScore + 5) improvementTrend = 'up';
      else if (currentScore < previousScore - 5) improvementTrend = 'down';
    }

    res.json({
      playerId,
      stats: {
        goals,
        assists,
        appearances,
        minutesPlayed: tacticalStats?.minutesPlayed || 0,
        // Tactical stats
        goodSquareCount: tacticalStats?.goodSquareCount || 0,
        offerCount: tacticalStats?.offerCount || 0,
        markingScore: tacticalStats?.markingScore || 0,
        improvementTrend,
      },
      recentIssues: recentIssues.map(issue => ({
        id: issue.id,
        type: issue.type,
        description: issue.description,
        videoId: issue.videoId,
        timestamp: issue.timestamp,
        severity: issue.severity,
        videoTitle: issue.video.title,
      })),
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

/**
 * GET /api/stats/team/:teamId
 * Get team statistics summary
 */
router.get('/team/:teamId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;

    // Get all team members
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const playerIds = members.map(m => m.userId);

    // Aggregate stats
    const [totalGoals, totalAssists, playersWithIssues] = await Promise.all([
      prisma.goalEvent.count({
        where: { scorerId: { in: playerIds }, verified: true },
      }),
      prisma.goalEvent.count({
        where: { assisterId: { in: playerIds }, verified: true },
      }),
      prisma.playerIssue.groupBy({
        by: ['playerId'],
        where: { playerId: { in: playerIds } },
        _count: true,
      }),
    ]);

    // Get average marking score
    const tacticalStats = await prisma.playerTacticalStat.aggregate({
      where: { playerId: { in: playerIds } },
      _avg: { markingScore: true },
    });

    res.json({
      teamId,
      playerCount: members.length,
      stats: {
        totalGoals,
        totalAssists,
        avgMarkingScore: Math.round(tacticalStats._avg.markingScore || 0),
        playersWithIssues: playersWithIssues.length,
      },
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: 'Failed to fetch team stats' });
  }
});

/**
 * GET /api/stats/leaderboard/:teamId
 * Get goal/assist leaderboard for team
 */
router.get('/leaderboard/:teamId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const { type = 'goals' } = req.query;

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: { user: true },
    });

    const leaderboard = await Promise.all(
      members.map(async (member) => {
        const goals = await prisma.goalEvent.count({
          where: { scorerId: member.userId, verified: true },
        });
        const assists = await prisma.goalEvent.count({
          where: { assisterId: member.userId, verified: true },
        });

        return {
          playerId: member.userId,
          name: member.user.name,
          number: member.number,
          goals,
          assists,
          total: goals + assists,
        };
      })
    );

    // Sort by requested type
    leaderboard.sort((a, b) => {
      if (type === 'assists') return b.assists - a.assists;
      if (type === 'total') return b.total - a.total;
      return b.goals - a.goals;
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updatePlayerGoalStats(scorerId: string, assisterId?: string | null) {
  // This would update cached stats in a real implementation
  // For now, stats are calculated on-the-fly
  console.log(`Updating stats for scorer: ${scorerId}, assister: ${assisterId}`);
}

export default router;
