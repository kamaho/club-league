import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import seasonsRoutes from './routes/seasons.js';
import divisionsRoutes from './routes/divisions.js';
import matchesRoutes from './routes/matches.js';
import proposalsRoutes from './routes/proposals.js';
import enrollmentsRoutes from './routes/enrollments.js';
import settingsRoutes from './routes/settings.js';
import seasonStatusRoutes from './routes/season-status.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/divisions', divisionsRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/season-status', seasonStatusRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Club League API running at http://localhost:${PORT}`);
});
