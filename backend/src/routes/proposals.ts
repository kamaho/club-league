import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();

function toProposal(row: {
  id: string;
  matchId: string;
  proposedById: string;
  proposedTimes: string;
  message: string | null;
  logistics: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    matchId: row.matchId,
    proposedById: row.proposedById,
    proposedTimes: JSON.parse(row.proposedTimes) as string[],
    message: row.message ?? undefined,
    logistics: row.logistics ? JSON.parse(row.logistics) : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /proposals?matchId=xxx
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const matchId = req.query.matchId as string;
  if (!matchId) return res.status(400).json({ error: 'matchId query required' });
  const proposals = await prisma.matchProposal.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
  });
  res.json(proposals.map(toProposal));
});

// POST /proposals
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const body = req.body as {
    matchId: string;
    proposedTimes: string[];
    message?: string;
    logistics?: object;
  };
  if (!body.matchId || !body.proposedTimes?.length) {
    return res.status(400).json({ error: 'matchId and proposedTimes required' });
  }
  const proposal = await prisma.matchProposal.create({
    data: {
      matchId: body.matchId,
      proposedById: userId,
      proposedTimes: JSON.stringify(body.proposedTimes),
      message: body.message,
      logistics: body.logistics ? JSON.stringify(body.logistics) : null,
    },
  });
  const match = await prisma.match.findUnique({ where: { id: body.matchId } });
  if (match && match.status === 'PENDING') {
    await prisma.match.update({
      where: { id: body.matchId },
      data: { status: 'PROPOSED' },
    });
  }
  res.status(201).json(toProposal(proposal));
});

export default router;
