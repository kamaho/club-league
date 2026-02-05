import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();

function toSeason(row: { id: string; clubId: string; name: string; startDate: string; endDate: string; status: string }) {
  return {
    id: row.id,
    clubId: row.clubId,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
  };
}

// GET /seasons
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return res.status(404).json({ error: 'User not found' });
  const seasons = await prisma.season.findMany({
    where: { clubId: me.clubId },
    orderBy: { startDate: 'desc' },
  });
  res.json(seasons.map(toSeason));
});

// POST /seasons (admin)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const body = req.body as { name: string; startDate: string; endDate: string; status?: string };
  if (!body.name || !body.startDate || !body.endDate) {
    return res.status(400).json({ error: 'name, startDate, endDate required' });
  }
  const season = await prisma.season.create({
    data: {
      clubId: me.clubId,
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status ?? 'UPCOMING',
    },
  });
  res.status(201).json(toSeason(season));
});

// PATCH /seasons/:id (admin)
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const body = req.body as { name?: string; startDate?: string; endDate?: string; status?: string };
  const season = await prisma.season.update({
    where: { id: req.params.id },
    data: body,
  });
  res.json(toSeason(season));
});

export default router;
