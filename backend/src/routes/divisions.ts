import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();

function toDivision(row: { id: string; seasonId: string; name: string }) {
  return { id: row.id, seasonId: row.seasonId, name: row.name };
}

// GET /divisions?seasonId=xxx
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const seasonId = req.query.seasonId as string;
  if (!seasonId) {
    return res.status(400).json({ error: 'seasonId query required' });
  }
  const divisions = await prisma.division.findMany({
    where: { seasonId },
    orderBy: { name: 'asc' },
  });
  res.json(divisions.map(toDivision));
});

// GET /divisions/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const division = await prisma.division.findUnique({
    where: { id: req.params.id },
  });
  if (!division) return res.status(404).json({ error: 'Division not found' });
  res.json(toDivision(division));
});

// POST /divisions (admin)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const body = req.body as { seasonId: string; name: string };
  if (!body.seasonId || !body.name) {
    return res.status(400).json({ error: 'seasonId and name required' });
  }
  const division = await prisma.division.create({
    data: { seasonId: body.seasonId, name: body.name },
  });
  res.status(201).json(toDivision(division));
});

// POST /divisions/:id/enroll (admin can enroll anyone; player can enroll themselves)
router.post('/:id/enroll', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  const divisionId = req.params.id;
  const body = req.body as { userId: string };
  if (!body.userId) return res.status(400).json({ error: 'userId required' });
  if (me.role !== 'ADMIN' && body.userId !== me.id) {
    return res.status(403).json({ error: 'You can only enroll yourself' });
  }
  const enrollment = await prisma.enrollment.upsert({
    where: { divisionId_userId: { divisionId, userId: body.userId } },
    update: {},
    create: { divisionId, userId: body.userId },
  });
  res.status(201).json({ id: enrollment.id, divisionId, userId: enrollment.userId });
});

// DELETE /divisions/:id/players/:userId (admin)
router.delete('/:id/players/:userId', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const { id: divisionId, userId: targetUserId } = req.params;
  await prisma.enrollment.delete({
    where: { divisionId_userId: { divisionId, userId: targetUserId } },
  });
  res.status(204).send();
});

// POST /divisions/:id/generate-matches (admin)
router.post('/:id/generate-matches', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const divisionId = req.params.id;
  const enrollments = await prisma.enrollment.findMany({
    where: { divisionId },
  });
  const playerIds = enrollments.map((e) => e.userId);
  if (playerIds.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players' });
  }
  function toMatch(row: { id: string; divisionId: string | null; type: string; playerAId: string; playerBId: string; round: number | null; status: string; scheduledAt: Date | null; score: string | null; logistics: string | null; createdAt: Date }) {
    return {
      id: row.id,
      divisionId: row.divisionId ?? undefined,
      type: row.type,
      playerAId: row.playerAId,
      playerBId: row.playerBId,
      round: row.round ?? undefined,
      status: row.status,
      scheduledAt: row.scheduledAt?.toISOString(),
      score: row.score ? JSON.parse(row.score) : undefined,
      logistics: row.logistics ? JSON.parse(row.logistics) : undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }
  let ids = [...playerIds];
  if (ids.length % 2 !== 0) ids.push('BYE');
  const n = ids.length;
  const half = n / 2;
  const created: unknown[] = [];
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < half; i++) {
      const p1 = ids[i];
      const p2 = ids[n - 1 - i];
      if (p1 !== 'BYE' && p2 !== 'BYE') {
        const match = await prisma.match.create({
          data: {
            divisionId,
            type: 'LEAGUE',
            playerAId: p1,
            playerBId: p2,
            round: round + 1,
            status: 'PENDING',
          },
        });
        created.push(toMatch(match));
      }
    }
    ids = [ids[0], ids[n - 1], ...ids.slice(1, n - 1)];
  }
  res.status(201).json(created);
});

export default router;
