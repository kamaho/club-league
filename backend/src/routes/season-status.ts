import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();

// GET /season-status?date=ISO (optional, defaults to now)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return res.status(404).json({ error: 'User not found' });
  const dateParam = req.query.date as string | undefined;
  const currentDate = dateParam ? new Date(dateParam) : new Date();
  const season = await prisma.season.findFirst({
    where: { clubId: me.clubId, status: 'ACTIVE' },
  });
  if (!season) {
    const anySeason = await prisma.season.findFirst({
      where: { clubId: me.clubId },
      orderBy: { startDate: 'desc' },
    });
    if (!anySeason) return res.json({ activeRound: 0, totalRounds: 0, roundsLeft: 0, status: 'Not Started' });
  }
  const seasonToUse = season ?? (await prisma.season.findFirst({ where: { clubId: me.clubId }, orderBy: { startDate: 'desc' } }));
  if (!seasonToUse) return res.json({ activeRound: 0, totalRounds: 0, roundsLeft: 0, status: 'Not Started' });
  const startDate = new Date(seasonToUse.startDate);
  const msPerDay = 86400000;
  const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / msPerDay);
  const roundDurationDays = 14;
  if (daysDiff < 0) {
    return res.json({ activeRound: 0, totalRounds: 0, roundsLeft: 0, status: 'Not Started' });
  }
  const activeRound = Math.floor(daysDiff / roundDurationDays) + 1;
  const matches = await prisma.match.findMany({
    where: { divisionId: { not: null }, type: 'LEAGUE' },
  });
  const maxRound = matches.reduce((m, r) => Math.max(m, r.round ?? 0), 0) || 5;
  const roundsLeft = Math.max(0, maxRound - activeRound);
  const status = activeRound > maxRound ? 'Season Ended' : 'Active';
  res.json({ activeRound, totalRounds: maxRound, roundsLeft, status });
});

export default router;
