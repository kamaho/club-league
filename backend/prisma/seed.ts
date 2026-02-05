import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const MOCK_CLUB_ID = 'club-1';

async function main() {
  // Default password for demo users: "demo123"
  const passwordHash = bcrypt.hashSync('demo123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'admin@club.com' },
    update: {},
    create: {
      id: 'u1',
      email: 'admin@club.com',
      passwordHash,
      name: 'Admin Alice',
      role: 'ADMIN',
      clubId: MOCK_CLUB_ID,
      utr: 7.5,
      phone: '+1 (555) 000-0000',
      language: 'English',
      preferences: JSON.stringify({
        matchFrequency: '1_per_2_weeks',
        opponentGender: 'both',
        availability: { Mon: ['evening'], Wed: ['evening'], Sat: ['morning', 'midday'] },
        skipNextRound: false,
      }),
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@club.com' },
    update: {},
    create: {
      id: 'u2',
      email: 'bob@club.com',
      passwordHash,
      name: 'Bob Baselines',
      role: 'PLAYER',
      clubId: MOCK_CLUB_ID,
      utr: 6.2,
      phone: '+1 (555) 123-4567',
      language: 'English',
      preferences: JSON.stringify({
        matchFrequency: '2_per_2_weeks',
        opponentGender: 'both',
        availability: { Tue: ['evening'], Thu: ['evening'], Sun: ['morning'] },
        skipNextRound: false,
      }),
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'charlie@club.com' },
    update: {},
    create: {
      id: 'u3',
      email: 'charlie@club.com',
      passwordHash,
      name: 'Charlie Chip',
      role: 'PLAYER',
      clubId: MOCK_CLUB_ID,
      utr: 6.5,
      phone: '+1 (555) 987-6543',
      language: 'Spanish',
      preferences: JSON.stringify({
        matchFrequency: '1_per_4_weeks',
        opponentGender: 'male',
        availability: { Sat: ['midday', 'evening'], Sun: ['midday', 'evening'] },
        skipNextRound: false,
      }),
    },
  });

  const diana = await prisma.user.upsert({
    where: { email: 'diana@club.com' },
    update: {},
    create: {
      id: 'u4',
      email: 'diana@club.com',
      passwordHash,
      name: 'Diana Drive',
      role: 'PLAYER',
      clubId: MOCK_CLUB_ID,
      utr: 8.1,
      phone: '+47 987 65 432',
      preferences: JSON.stringify({
        matchFrequency: '3_per_4_weeks',
        opponentGender: 'female',
        availability: { Mon: ['morning'], Fri: ['morning'] },
        skipNextRound: false,
      }),
    },
  });

  const evan = await prisma.user.upsert({
    where: { email: 'evan@club.com' },
    update: {},
    create: {
      id: 'u5',
      email: 'evan@club.com',
      passwordHash,
      name: 'Evan Ace',
      role: 'PLAYER',
      clubId: MOCK_CLUB_ID,
      utr: 7.0,
      phone: '+47 555 12 345',
      preferences: JSON.stringify({
        matchFrequency: '1_per_2_weeks',
        opponentGender: 'both',
        availability: {},
        skipNextRound: false,
      }),
    },
  });

  const spring = await prisma.season.upsert({
    where: { id: 's0' },
    update: {},
    create: {
      id: 's0',
      clubId: MOCK_CLUB_ID,
      name: 'Spring 2024',
      startDate: '2024-03-01',
      endDate: '2024-05-31',
      status: 'COMPLETED',
    },
  });

  const summer = await prisma.season.upsert({
    where: { id: 's1' },
    update: {},
    create: {
      id: 's1',
      clubId: MOCK_CLUB_ID,
      name: 'Summer 2024',
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      status: 'ACTIVE',
    },
  });

  const div0 = await prisma.division.upsert({
    where: { id: 'd0' },
    update: {},
    create: { id: 'd0', seasonId: 's0', name: 'Spring Premier' },
  });
  const div1 = await prisma.division.upsert({
    where: { id: 'd1' },
    update: {},
    create: { id: 'd1', seasonId: 's1', name: 'Division A' },
  });
  const div2 = await prisma.division.upsert({
    where: { id: 'd2' },
    update: {},
    create: { id: 'd2', seasonId: 's1', name: 'Division B' },
  });

  // Enrollments for Division A (d1): Bob, Charlie, Diana, Evan
  for (const userId of ['u2', 'u3', 'u4', 'u5']) {
    await prisma.enrollment.upsert({
      where: { divisionId_userId: { divisionId: 'd1', userId } },
      update: {},
      create: { divisionId: 'd1', userId },
    });
  }

  // Club settings
  await prisma.clubSettings.upsert({
    where: { id: MOCK_CLUB_ID },
    update: {},
    create: { id: MOCK_CLUB_ID, logoUrl: '' },
  });

  console.log('Seed done:', { alice: alice.email, bob: bob.email, charlie: charlie.email, diana: diana.email, evan: evan.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
