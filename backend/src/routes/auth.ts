import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const JWT_EXPIRES = '7d';

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

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  if (user.passwordHash) {
    if (!password) {
      res.status(400).json({ error: 'Password required' });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
  }
  const token = jwt.sign(
    { userId: user.id, email: user.email } as AuthPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
  res.json({ user: toUser(user), token });
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const body = req.body as {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
    clubId?: string;
    utr?: number;
    preferences?: object;
  };
  if (!body.email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }
  const existing = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
  });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }
  const passwordHash = body.password
    ? await bcrypt.hash(body.password, 10)
    : null;
  const preferences = body.preferences ?? {
    matchFrequency: '1_per_2_weeks',
    opponentGender: 'both',
    availability: {},
    skipNextRound: false,
  };
  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name ?? 'New Player',
      phone: body.phone ?? null,
      role: 'PLAYER',
      clubId: body.clubId ?? 'club-1',
      utr: body.utr ?? 1.0,
      preferences: JSON.stringify(preferences),
    },
  });
  const token = jwt.sign(
    { userId: user.id, email: user.email } as AuthPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
  res.status(201).json({ user: toUser(user), token });
});

// POST /auth/forgot-password – request password reset (no email sent in MVP; always returns success)
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email required' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (user) {
    // In production: generate reset token, store it, send email. For MVP we just acknowledge.
  }
  res.json({ message: 'If an account exists for this email, you will receive reset instructions.' });
});

// GET /auth/me (requires token)
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(toUser(user));
});

export default router;
