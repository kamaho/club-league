import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();

// GET /enrollments?divisionId=xxx | ?userId=xxx
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const divisionId = req.query.divisionId as string | undefined;
  const userId = req.query.userId as string | undefined;
  if (divisionId) {
    const list = await prisma.enrollment.findMany({
      where: { divisionId },
    });
    return res.json(list.map((e) => ({ id: e.id, divisionId: e.divisionId, userId: e.userId })));
  }
  if (userId) {
    const list = await prisma.enrollment.findMany({
      where: { userId },
    });
    return res.json(list.map((e) => ({ id: e.id, divisionId: e.divisionId, userId: e.userId })));
  }
  return res.status(400).json({ error: 'divisionId or userId query required' });
});

export default router;
