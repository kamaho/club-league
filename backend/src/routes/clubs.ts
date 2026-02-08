import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /clubs/:clubId/activity-ranking – må komme før /:id
router.get('/:clubId/activity-ranking', authMiddleware, async (req: Request, res: Response) => {
  const { clubId } = req.params;
  const clubUserIds = await prisma.user.findMany({
    where: { clubId },
    select: { id: true },
  });
  const ids = new Set(clubUserIds.map((u) => u.id));
  if (ids.size === 0) return res.json([]);

  const completed = await prisma.match.findMany({
    where: {
      status: { in: ['CONFIRMED', 'WALKOVER'] },
      playerAId: { in: [...ids] },
      playerBId: { in: [...ids] },
    },
  });

  const countByUser: Record<string, number> = {};
  ids.forEach((id) => {
    countByUser[id] = 0;
  });
  completed.forEach((m) => {
    countByUser[m.playerAId]++;
    countByUser[m.playerBId]++;
  });

  const sorted = [...ids].sort((a, b) => (countByUser[b] ?? 0) - (countByUser[a] ?? 0));
  const result = sorted.map((userId, i) => ({
    userId,
    completedMatches: countByUser[userId] ?? 0,
    rank: i + 1,
  }));
  res.json(result);
});

// GET /clubs/:id – hent en klubb (navn, by)
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const club = await prisma.club.findUnique({
    where: { id: req.params.id },
  });
  if (!club) return res.status(404).json({ error: 'Club not found' });
  res.json({
    id: club.id,
    name: club.name,
    city: club.city ?? undefined,
  });
});

export default router;
