import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();

function toMatch(row: {
  id: string;
  divisionId: string | null;
  type: string;
  playerAId: string;
  playerBId: string;
  round: number | null;
  status: string;
  scheduledAt: Date | null;
  score: string | null;
  logistics: string | null;
  createdAt: Date;
}) {
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

// POST /matches/submit-score (before /:id)
router.post('/submit-score', authMiddleware, async (req: Request, res: Response) => {
  const body = req.body as { matchId: string; score: { winnerId: string; sets: Array<{ scoreA: number; scoreB: number }> } };
  if (!body.matchId || !body.score) {
    return res.status(400).json({ error: 'matchId and score required' });
  }
  const match = await prisma.match.update({
    where: { id: body.matchId },
    data: { status: 'REPORTED', score: JSON.stringify(body.score) },
  });
  res.json(toMatch(match));
});

// POST /matches/confirm-score
router.post('/confirm-score', authMiddleware, async (req: Request, res: Response) => {
  const body = req.body as { matchId: string };
  if (!body.matchId) return res.status(400).json({ error: 'matchId required' });
  const match = await prisma.match.update({
    where: { id: body.matchId },
    data: { status: 'CONFIRMED' },
  });
  res.json(toMatch(match));
});

// POST /matches/friendly
router.post('/friendly', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const body = req.body as { opponentId: string };
  if (!body.opponentId) return res.status(400).json({ error: 'opponentId required' });
  const match = await prisma.match.create({
    data: {
      type: 'FRIENDLY',
      playerAId: userId,
      playerBId: body.opponentId,
      status: 'PENDING',
    },
  });
  res.status(201).json(toMatch(match));
});

// GET /matches?divisionId=xxx | ?userId=xxx
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const divisionId = req.query.divisionId as string | undefined;
  const userId = req.query.userId as string | undefined;
  const { userId: authUserId } = (req as Request & { user: AuthPayload }).user;

  if (divisionId) {
    const matches = await prisma.match.findMany({
      where: { divisionId },
      orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
    });
    return res.json(matches.map(toMatch));
  }
  if (userId) {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ playerAId: userId }, { playerBId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(matches.map(toMatch));
  }
  // default: current user's matches
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ playerAId: authUserId }, { playerBId: authUserId }],
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(matches.map(toMatch));
});

// GET /matches/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
  });
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(toMatch(match));
});

// PATCH /matches/:id (status, scheduledAt, logistics)
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  const body = req.body as { status?: string; scheduledAt?: string; logistics?: object };
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.logistics !== undefined) data.logistics = JSON.stringify(body.logistics);
  const match = await prisma.match.update({
    where: { id: req.params.id },
    data: data as never,
  });
  res.json(toMatch(match));
});

export default router;
