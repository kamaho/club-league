import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();

// GET /settings
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return res.status(404).json({ error: 'User not found' });
  const settings = await prisma.clubSettings.findUnique({
    where: { id: me.clubId },
  });
  res.json({ logoUrl: settings?.logoUrl ?? '' });
});

// PATCH /settings (admin)
router.patch('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me || me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  const body = req.body as { logoUrl?: string };
  const settings = await prisma.clubSettings.upsert({
    where: { id: me.clubId },
    update: { logoUrl: body.logoUrl },
    create: { id: me.clubId, logoUrl: body.logoUrl ?? '' },
  });
  res.json({ logoUrl: settings.logoUrl ?? '' });
});

export default router;
