import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();

function toUser(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  clubId: string;
  avatarUrl: string | null;
  utr: number | null;
  phone: string | null;
  language: string | null;
  preferences: string | null;
}) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    clubId: row.clubId,
    avatarUrl: row.avatarUrl ?? undefined,
    utr: row.utr ?? undefined,
    phone: row.phone ?? undefined,
    language: row.language ?? undefined,
    preferences: row.preferences ? JSON.parse(row.preferences) : undefined,
  };
}

// GET /users (admin or same club)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return res.status(404).json({ error: 'User not found' });
  const users = await prisma.user.findMany({
    where: { clubId: me.clubId },
    orderBy: { name: 'asc' },
  });
  res.json(users.map(toUser));
});

// GET /users/:id
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(toUser(user));
});

// PATCH /users/:id (self or admin)
router.patch('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return res.status(404).json({ error: 'User not found' });
  const targetId = req.params.id;
  if (me.id !== targetId && me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const body = req.body as Record<string, unknown>;
  const allowed = ['name', 'avatarUrl', 'utr', 'phone', 'language', 'preferences'];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  if (data.preferences && typeof data.preferences === 'object') {
    data.preferences = JSON.stringify(data.preferences);
  }
  const user = await prisma.user.update({
    where: { id: targetId },
    data: data as never,
  });
  res.json(toUser(user));
});

// DELETE /users/:id (admin or self)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) return res.status(404).json({ error: 'User not found' });
  const targetId = req.params.id;
  if (me.id !== targetId && me.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await prisma.user.delete({ where: { id: targetId } });
  res.status(204).send();
});

export default router;
