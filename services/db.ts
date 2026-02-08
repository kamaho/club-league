import { User, Season, Division, Match, Enrollment, UserRole, MatchStatus, MatchProposal, MatchType, MatchLogistics, ProposalLogistics, Club, ClubActivityRankEntry } from '../types';
import { getApiUrl } from './api';
import { createApiDb } from './dbApi';

// --- SEED DATA ---

const MOCK_CLUB_ID = 'club-1';

const MOCK_CLUBS: Club[] = [
  { id: 'club-1', name: 'Oslo Tennisklubb (OTK)', city: 'Oslo' },
  { id: 'club-2', name: 'Bergens Tennisklubb (BTK)', city: 'Bergen' },
  { id: 'club-3', name: 'Stavanger Tennisklubb', city: 'Stavanger' },
  { id: 'club-4', name: 'Trondheim Tennisklubb', city: 'Trondheim' },
  { id: 'club-5', name: 'Kristiansand Tennisklubb', city: 'Kristiansand' },
];

const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    email: 'admin@club.com', 
    name: 'Admin Alice', 
    role: UserRole.ADMIN, 
    clubId: MOCK_CLUB_ID, 
    utr: 7.5,
    phone: '+1 (555) 000-0000',
    language: 'English',
    preferences: {
      matchFrequency: '1_per_2_weeks',
      opponentGender: 'both',
      availability: {
        'Mon': ['evening'],
        'Wed': ['evening'],
        'Sat': ['morning', 'midday']
      },
      skipNextRound: false
    }
  },
  { 
    id: 'u2', 
    email: 'bob@club.com', 
    name: 'Bob Baselines', 
    role: UserRole.PLAYER, 
    clubId: MOCK_CLUB_ID, 
    utr: 6.2,
    phone: '+1 (555) 123-4567',
    language: 'English',
    preferences: {
      matchFrequency: '2_per_2_weeks',
      opponentGender: 'both',
      availability: {
        'Tue': ['evening'],
        'Thu': ['evening'],
        'Sun': ['morning']
      },
      skipNextRound: false
    }
  },
  { 
    id: 'u3', 
    email: 'charlie@club.com', 
    name: 'Charlie Chip', 
    role: UserRole.PLAYER, 
    clubId: MOCK_CLUB_ID, 
    utr: 6.5,
    phone: '+1 (555) 987-6543',
    language: 'Spanish',
    preferences: {
      matchFrequency: '1_per_4_weeks',
      opponentGender: 'male',
      availability: {
        'Sat': ['midday', 'evening'],
        'Sun': ['midday', 'evening']
      },
      skipNextRound: false
    }
  },
  { 
    id: 'u4', 
    email: 'diana@club.com', 
    name: 'Diana Drive', 
    role: UserRole.PLAYER, 
    clubId: MOCK_CLUB_ID, 
    utr: 8.1,
    phone: '+47 987 65 432',
    preferences: {
        matchFrequency: '3_per_4_weeks',
        opponentGender: 'female',
        availability: { 'Mon': ['morning'], 'Fri': ['morning'] },
        skipNextRound: false
    }
  },
  { 
    id: 'u5', 
    email: 'evan@club.com', 
    name: 'Evan Ace', 
    role: UserRole.PLAYER, 
    clubId: MOCK_CLUB_ID, 
    utr: 7.0,
    phone: '+47 555 12 345',
    preferences: {
        matchFrequency: '1_per_2_weeks',
        opponentGender: 'both',
        availability: {},
        skipNextRound: false
    }
  },
  { id: 'u6', email: 'test@test.no', name: 'Test User', role: UserRole.PLAYER, clubId: MOCK_CLUB_ID, utr: 6.0, preferences: { matchFrequency: '1_per_2_weeks', opponentGender: 'both', availability: {}, skipNextRound: false } },
  { id: 'u7', email: 'h0lst@icloud.com', name: 'Holst', role: UserRole.PLAYER, clubId: MOCK_CLUB_ID, utr: 6.0, preferences: { matchFrequency: '1_per_2_weeks', opponentGender: 'both', availability: {}, skipNextRound: false } },
];

const MOCK_SEASONS: Season[] = [
  { id: 's0', clubId: MOCK_CLUB_ID, name: 'Spring 2024', startDate: '2024-03-01', endDate: '2024-05-31', status: 'COMPLETED' },
  { id: 's1', clubId: MOCK_CLUB_ID, name: 'Summer 2024', startDate: '2024-06-01', endDate: '2024-08-31', status: 'ACTIVE' }
];

const MOCK_DIVISIONS: Division[] = [
  { id: 'd0', seasonId: 's0', name: 'Spring Premier' },
  { id: 'd1', seasonId: 's1', name: 'Division A' },
  { id: 'd2', seasonId: 's1', name: 'Division B' }
];

const MOCK_ENROLLMENTS: Enrollment[] = [
  // Spring Enrollments
  { id: 'e01', divisionId: 'd0', userId: 'u2' },
  { id: 'e02', divisionId: 'd0', userId: 'u3' },
  { id: 'e03', divisionId: 'd0', userId: 'u4' },
  
  // Summer Enrollments
  { id: 'e1', divisionId: 'd1', userId: 'u2' }, // Bob
  { id: 'e2', divisionId: 'd1', userId: 'u3' }, // Charlie
  { id: 'e6', divisionId: 'd1', userId: 'u6' }, // test@test.no
  { id: 'e7', divisionId: 'd1', userId: 'u7' }, // h0lst@icloud.com
  { id: 'e3', divisionId: 'd1', userId: 'u4' }, // Diana
  { id: 'e4', divisionId: 'd1', userId: 'u5' }, // Evan
];

// Runde 45 – spillere test user (u6) skal møte; injiseres alltid ved load
const ROUND_45_DEMO_MATCHES: Match[] = [
  { id: 'm-r45-1', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u2', round: 45, status: MatchStatus.PENDING, createdAt: '2024-06-01T00:00:00Z' },
  { id: 'm-r45-2', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u3', playerBId: 'u6', round: 45, status: MatchStatus.PENDING, createdAt: '2024-06-01T00:00:00Z' },
  { id: 'm-r45-3', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u4', round: 45, status: MatchStatus.PENDING, createdAt: '2024-06-01T00:00:00Z' },
];

// Demokamper 12. feb 2026 (flere statuser i én celle) – injiseres alltid ved load
const DEMO_DAY_MATCHES: Match[] = [
  { id: 'demo-open1', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u2', round: 6, status: MatchStatus.PENDING, scheduledAt: '2026-02-12T10:00:00Z', createdAt: '2026-02-01T00:00:00Z' },
  { id: 'demo-open2', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u3', playerBId: 'u6', round: 6, status: MatchStatus.PROPOSED, scheduledAt: '2026-02-12T12:00:00Z', createdAt: '2026-02-02T00:00:00Z' },
  { id: 'demo-planned', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u4', round: 6, status: MatchStatus.SCHEDULED, scheduledAt: '2026-02-12T14:00:00Z', createdAt: '2026-02-01T00:00:00Z' },
  { id: 'demo-played', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u5', playerBId: 'u6', round: 5, status: MatchStatus.CONFIRMED, scheduledAt: '2026-02-12T16:00:00Z', createdAt: '2026-02-01T00:00:00Z', score: { winnerId: 'u6', sets: [{ scoreA: 6, scoreB: 4 }, { scoreA: 6, scoreB: 3 }] } },
  { id: 'demo-canceled', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u1', round: 6, status: MatchStatus.WALKOVER, scheduledAt: '2026-02-12T18:00:00Z', createdAt: '2026-02-01T00:00:00Z' },
  // Planlagt kamp 25. feb 2026 – for testing av live-scoring
  { id: 'demo-feb25', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u7', round: 6, status: MatchStatus.SCHEDULED, scheduledAt: '2026-02-25T10:00:00Z', createdAt: '2026-02-01T00:00:00Z' },
];

const MOCK_MATCHES: Match[] = [
  // --- PAST SEASON (Spring 2024) ---
  { 
    id: 'm-old-1', divisionId: 'd0', type: MatchType.LEAGUE, playerAId: 'u4', playerBId: 'u2', round: 1, status: MatchStatus.CONFIRMED, 
    scheduledAt: '2024-03-10T10:00:00Z', createdAt: '2024-03-01T00:00:00Z',
    score: { winnerId: 'u4', sets: [{ scoreA: 6, scoreB: 2 }, { scoreA: 6, scoreB: 3 }] } // Diana beats Bob
  },
  { 
    id: 'm-old-2', divisionId: 'd0', type: MatchType.LEAGUE, playerAId: 'u3', playerBId: 'u4', round: 2, status: MatchStatus.CONFIRMED, 
    scheduledAt: '2024-03-20T10:00:00Z', createdAt: '2024-03-01T00:00:00Z',
    score: { winnerId: 'u4', sets: [{ scoreA: 4, scoreB: 6 }, { scoreA: 5, scoreB: 7 }] } // Diana beats Charlie
  },
  { 
    id: 'm-old-3', divisionId: 'd0', type: MatchType.LEAGUE, playerAId: 'u2', playerBId: 'u3', round: 3, status: MatchStatus.CONFIRMED, 
    scheduledAt: '2024-04-05T10:00:00Z', createdAt: '2024-03-01T00:00:00Z',
    score: { winnerId: 'u3', sets: [{ scoreA: 4, scoreB: 6 }, { scoreA: 2, scoreB: 6 }] } // Charlie beats Bob
  },


  // --- CURRENT SEASON (Summer 2024) ---
  
  // 1. Confirmed Match
  { 
    id: 'm1', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u2', playerBId: 'u3', round: 1, status: MatchStatus.CONFIRMED, 
    scheduledAt: '2024-06-05T18:00:00Z', createdAt: '2024-06-01T00:00:00Z',
    score: {
      winnerId: 'u3',
      sets: [{ scoreA: 4, scoreB: 6 }, { scoreA: 6, scoreB: 4 }, { scoreA: 8, scoreB: 10 }] // Tiebreak
    }
  },
  
  // 2. Outgoing Proposal (Bob proposed to Diana)
  { 
    id: 'm3', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u2', playerBId: 'u4', round: 2, status: MatchStatus.PROPOSED,
    createdAt: '2024-06-01T00:00:00Z'
  },
  
  // 3. Incoming Proposal Demo (Charlie proposed to Bob)
  {
    id: 'm-incoming-demo', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u3', playerBId: 'u2', round: 4, status: MatchStatus.PROPOSED,
    createdAt: '2024-06-15T00:00:00Z'
  },

  // 4. Canceled Match
  {
     id: 'm5', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u2', playerBId: 'u5', round: 3, status: MatchStatus.WALKOVER,
     createdAt: '2024-06-01T00:00:00Z'
  },

  // --- Other Players Matches (For Demo) ---
  
  // Scheduled: Diana (u4) vs Evan (u5)
  { 
    id: 'm2', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u4', playerBId: 'u5', round: 1, status: MatchStatus.SCHEDULED,
    scheduledAt: '2024-06-15T10:00:00Z', createdAt: '2024-06-01T00:00:00Z',
    logistics: {
        courtNumber: 3,
        bookedById: 'u4',
        cost: 20,
        splitType: 'SPLIT',
        isSettled: false
    }
  },
  
  // Pending: Charlie (u3) vs Evan (u5)
  {
    id: 'm4', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u3', playerBId: 'u5', round: 2, status: MatchStatus.PENDING,
    createdAt: '2024-06-01T00:00:00Z'
  },

  // Confirmed: Charlie (u3) vs Diana (u4)
  {
    id: 'm6', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u3', playerBId: 'u4', round: 3, status: MatchStatus.CONFIRMED,
    scheduledAt: '2024-06-20T10:00:00Z', createdAt: '2024-06-01T00:00:00Z',
    score: {
      winnerId: 'u4',
      sets: [{ scoreA: 2, scoreB: 6 }, { scoreA: 1, scoreB: 6 }]
    }
  },
  
  // --- FRIENDLY MATCHES ---
  {
    id: 'f1', type: MatchType.FRIENDLY, playerAId: 'u2', playerBId: 'u1', status: MatchStatus.CONFIRMED,
    scheduledAt: '2024-05-15T10:00:00Z', createdAt: '2024-05-10T00:00:00Z',
    score: { winnerId: 'u2', sets: [{scoreA: 6, scoreB: 0}, {scoreA: 6, scoreB: 1}]}
  },

  // (Runde 45-demokamper injiseres via ROUND_45_DEMO_MATCHES i loadFromStorage)

  // --- DEMO: test@test.no (u6) og h0lst@icloud.com (u7) – alle flyt ---
  // Incoming proposal (u6 må svare): Holst (u7) har foreslått kamp
  { id: 'm-d1', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u7', playerBId: 'u6', round: 2, status: MatchStatus.PROPOSED, createdAt: '2024-06-14T08:00:00Z' },
  // Outgoing proposal (u6 venter): test foreslo til Bob
  { id: 'm-d2', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u2', round: 3, status: MatchStatus.PROPOSED, createdAt: '2024-06-12T10:00:00Z' },
  // Pending (ingen forespørsel ennå)
  { id: 'm-d3', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u4', round: 4, status: MatchStatus.PENDING, createdAt: '2024-06-01T00:00:00Z' },
  // Scheduled (avtalt tid)
  { id: 'm-d4', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u3', round: 1, status: MatchStatus.SCHEDULED, scheduledAt: '2024-07-01T18:00:00Z', createdAt: '2024-06-01T00:00:00Z', logistics: { courtNumber: 1, bookedById: 'u6', cost: 15, splitType: 'SPLIT', isSettled: true } },
  // Confirmed – u6 vant
  { id: 'm-d5', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u6', playerBId: 'u5', round: 1, status: MatchStatus.CONFIRMED, scheduledAt: '2024-06-08T10:00:00Z', createdAt: '2024-06-01T00:00:00Z', score: { winnerId: 'u6', sets: [{ scoreA: 6, scoreB: 4 }, { scoreA: 7, scoreB: 5 }] } },
  // Confirmed – u6 tapte
  { id: 'm-d6', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u7', playerBId: 'u6', round: 1, status: MatchStatus.CONFIRMED, scheduledAt: '2024-06-01T14:00:00Z', createdAt: '2024-05-28T00:00:00Z', score: { winnerId: 'u7', sets: [{ scoreA: 6, scoreB: 2 }, { scoreA: 6, scoreB: 3 }] } },
  // Walkover (u7 gav walkover til u2)
  { id: 'm-d7', divisionId: 'd1', type: MatchType.LEAGUE, playerAId: 'u7', playerBId: 'u2', round: 5, status: MatchStatus.WALKOVER, createdAt: '2024-06-01T00:00:00Z' },
  // Friendly – fullført
  { id: 'f-d1', type: MatchType.FRIENDLY, playerAId: 'u6', playerBId: 'u7', status: MatchStatus.CONFIRMED, scheduledAt: '2024-05-20T09:00:00Z', createdAt: '2024-05-18T00:00:00Z', score: { winnerId: 'u6', sets: [{ scoreA: 6, scoreB: 3 }, { scoreA: 6, scoreB: 4 }] } },
  // Friendly – planlagt
  { id: 'f-d2', type: MatchType.FRIENDLY, playerAId: 'u6', playerBId: 'u1', status: MatchStatus.SCHEDULED, scheduledAt: '2024-07-10T17:00:00Z', createdAt: '2024-06-20T00:00:00Z' },

  // --- SAMME DAG, FLERE STATUSER (demo for kalendercelle) – 12. feb 2026, alle med u6 ---
  ...DEMO_DAY_MATCHES,
];

const MOCK_PROPOSALS: MatchProposal[] = [
  // Bob's proposal to Diana
  {
    id: 'p1', matchId: 'm3', proposedById: 'u2', 
    proposedTimes: ['2024-06-20T17:00:00Z', '2024-06-21T18:00:00Z'], 
    message: 'Can we play next Thursday?',
    createdAt: '2024-06-10T09:00:00Z',
    logistics: {
      bookedById: 'u2',
      cost: 20,
      splitType: 'SPLIT',
      courtNumber: 5
    }
  },
  // Charlie's proposal to Bob (INCOMING DEMO)
  {
    id: 'p-incoming-demo', matchId: 'm-incoming-demo', proposedById: 'u3',
    proposedTimes: ['2024-06-25T09:00:00Z', '2024-06-26T14:00:00Z'],
    message: 'Hey Bob, are you free for our round 4 match?',
    createdAt: '2024-06-15T10:00:00Z',
    logistics: {
      bookedById: 'u3',
      cost: 25,
      splitType: 'SPLIT',
      courtNumber: 2
    }
  },
  // Holst (u7) foreslår kamp til test (u6) – INCOMING for test@test.no
  {
    id: 'p-d1', matchId: 'm-d1', proposedById: 'u7',
    proposedTimes: ['2024-06-28T10:00:00Z', '2024-06-29T18:00:00Z'],
    message: 'Hei, passer en av disse tidene for round 2?',
    createdAt: '2024-06-14T08:00:00Z',
    logistics: { bookedById: 'u7', cost: 20, splitType: 'SPLIT', courtNumber: 2 }
  },
  // test (u6) foreslo til Bob – OUTGOING for test@test.no
  {
    id: 'p-d2', matchId: 'm-d2', proposedById: 'u6',
    proposedTimes: ['2024-07-05T14:00:00Z', '2024-07-06T10:00:00Z'],
    message: 'Klar for round 3? Forslag til tid under.',
    createdAt: '2024-06-12T10:00:00Z',
    logistics: { bookedById: 'u6', cost: 18, splitType: 'SPLIT', courtNumber: 4 }
  }
];

// --- DB SERVICE ---
const DB_STORAGE_KEY = 'club_league_db';

interface DBState {
    users: User[];
    seasons: Season[];
    divisions: Division[];
    enrollments: Enrollment[];
    matches: Match[];
    proposals: MatchProposal[];
    settings: any;
}

class DatabaseService {
  private users = MOCK_USERS;
  private seasons = MOCK_SEASONS;
  private divisions = MOCK_DIVISIONS;
  private enrollments = MOCK_ENROLLMENTS;
  private matches = MOCK_MATCHES;
  private proposals = MOCK_PROPOSALS;
  private clubs = MOCK_CLUBS;
  private settings = {
      logoUrl: ''
  };

  constructor() {
      this.loadFromStorage();
  }

  private loadFromStorage() {
      const stored = localStorage.getItem(DB_STORAGE_KEY);
      if (stored) {
          try {
              const data: DBState = JSON.parse(stored);
              this.users = data.users || MOCK_USERS;
              this.seasons = data.seasons || MOCK_SEASONS;
              this.divisions = data.divisions || MOCK_DIVISIONS;
              this.enrollments = data.enrollments || MOCK_ENROLLMENTS;
              this.matches = data.matches || MOCK_MATCHES;
              this.proposals = data.proposals || MOCK_PROPOSALS;
              this.settings = data.settings || { logoUrl: '' };
          } catch (e) {
              console.error("Failed to load DB from storage", e);
          }
      } else {
          // Initialize storage with mock data
          this.saveToStorage();
      }
      // Alltid ha demokampene 12. feb 2026 i listen (flere statuser i én celle)
      const existingIds = new Set(this.matches.map(m => m.id));
      for (const m of DEMO_DAY_MATCHES) {
          if (!existingIds.has(m.id)) {
              this.matches = [...this.matches, m];
              existingIds.add(m.id);
          }
      }
      // Alltid ha runde 45-demokamper (spillere du møter) for test user
      for (const m of ROUND_45_DEMO_MATCHES) {
          if (!existingIds.has(m.id)) {
              this.matches = [...this.matches, m];
              existingIds.add(m.id);
          }
      }
  }

  private saveToStorage() {
      const state: DBState = {
          users: this.users,
          seasons: this.seasons,
          divisions: this.divisions,
          enrollments: this.enrollments,
          matches: this.matches,
          proposals: this.proposals,
          settings: this.settings
      };
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
  }

  // READ
  getUsers() { return this.users; }
  getUser(id: string) { return this.users.find(u => u.id === id); }
  getClub(id: string) { return this.clubs.find(c => c.id === id) ?? null; }
  getSeasons() { return this.seasons; }

  /** Rank spillere i en klubb etter antall fullførte kamper (aktivitet). */
  getClubActivityRanking(clubId: string): ClubActivityRankEntry[] {
    const clubUserIds = new Set(this.users.filter(u => u.clubId === clubId).map(u => u.id));
    const completed = this.matches.filter(
      m =>
        (m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.WALKOVER) &&
        clubUserIds.has(m.playerAId) &&
        clubUserIds.has(m.playerBId)
    );
    const countByUser: Record<string, number> = {};
    clubUserIds.forEach(id => { countByUser[id] = 0; });
    completed.forEach(m => {
      countByUser[m.playerAId]++;
      countByUser[m.playerBId]++;
    });
    const sorted = [...clubUserIds].sort((a, b) => (countByUser[b] ?? 0) - (countByUser[a] ?? 0));
    return sorted.map((userId, i) => ({
      userId,
      completedMatches: countByUser[userId] ?? 0,
      rank: i + 1,
    }));
  }
  getDivisions(seasonId: string) { return this.divisions.filter(d => d.seasonId === seasonId); }
  
  getDivision(id: string) { return this.divisions.find(d => d.id === id); }
  
  getMatchesForDivision(divisionId: string) { return this.matches.filter(m => m.divisionId === divisionId); }
  
  getMatchesForUser(userId: string) { 
    return this.matches.filter(m => m.playerAId === userId || m.playerBId === userId); 
  }

  getMatch(id: string) { return this.matches.find(m => m.id === id); }
  
  getProposals(matchId: string) { return this.proposals.filter(p => p.matchId === matchId); }

  getEnrollments(divisionId: string) { return this.enrollments.filter(e => e.divisionId === divisionId); }
  
  getEnrollmentsForUser(userId: string) { return this.enrollments.filter(e => e.userId === userId); }

  getPlayersInDivision(divisionId: string) {
    const enrollmentUserIds = this.getEnrollments(divisionId).map(e => e.userId);
    return this.users.filter(u => enrollmentUserIds.includes(u.id));
  }

  getClubSettings() { return this.settings; }

  // Calculates round info based on the first active season found
  getSeasonStatus(currentDate: Date) {
    const season = this.seasons.find(s => s.status === 'ACTIVE') || this.seasons[0];
    if (!season) return null;

    // Find max round in matches to determine total rounds (approximate for MVP)
    const allRounds = this.matches.filter(m => m.type === MatchType.LEAGUE).map(m => m.round || 0);
    const maxRound = allRounds.length > 0 ? Math.max(...allRounds) : 5;

    // Demo: when using local mock and we have round 45 matches, show active round 45 so "Spillere du møter" demo works
    const hasRound45 = allRounds.some(r => r === 45);
    if (!getApiUrl() && hasRound45) {
      return {
        activeRound: 45,
        totalRounds: Math.max(maxRound, 50),
        roundsLeft: Math.max(0, Math.max(maxRound, 50) - 45),
        status: 'Active'
      };
    }

    const startDate = new Date(season.startDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / msPerDay);
    const roundDurationDays = 14;
    if (daysDiff < 0) return { activeRound: 0, totalRounds: maxRound, roundsLeft: 0, status: 'Not Started' };

    const activeRound = Math.floor(daysDiff / roundDurationDays) + 1;
    const roundsLeft = Math.max(0, maxRound - activeRound);

    return {
      activeRound,
      totalRounds: maxRound,
      roundsLeft,
      status: activeRound > maxRound ? 'Season Ended' : 'Active'
    };
  }

  // WRITE
  updateMatchStatus(matchId: string, status: MatchStatus, scheduledAt?: string, logistics?: MatchLogistics) {
    const match = this.matches.find(m => m.id === matchId);
    if (match) {
      match.status = status;
      if (scheduledAt) match.scheduledAt = scheduledAt;
      if (logistics) match.logistics = logistics;
      
      // If updating existing logistics (e.g. marking settled)
      if (match.logistics && logistics) {
          Object.assign(match.logistics, logistics);
      }
      
      this.matches = [...this.matches]; 
      this.saveToStorage();
    }
    return match;
  }

  createProposal(matchId: string, userId: string, times: string[], message?: string, logistics?: ProposalLogistics) {
    const proposal: MatchProposal = {
      id: Math.random().toString(36).substr(2, 9),
      matchId,
      proposedById: userId,
      proposedTimes: times,
      message,
      createdAt: new Date().toISOString(),
      logistics
    };
    this.proposals.push(proposal);
    
    // Update match status to PROPOSED
    const match = this.getMatch(matchId);
    if (match && match.status === MatchStatus.PENDING) {
      match.status = MatchStatus.PROPOSED;
    }
    
    this.saveToStorage();
    return proposal;
  }

  createFriendlyMatch(initiatorId: string, opponentId: string, scheduledAt?: string) {
    const newMatch: Match = {
      id: `f-${Math.random().toString(36).substr(2, 9)}`,
      type: MatchType.FRIENDLY,
      playerAId: initiatorId,
      playerBId: opponentId,
      status: MatchStatus.PENDING,
      createdAt: new Date().toISOString(),
      ...(scheduledAt && { scheduledAt }),
    };
    this.matches = [newMatch, ...this.matches];
    this.saveToStorage();
    return newMatch;
  }

  submitScore(matchId: string, score: { sets: { scoreA: number; scoreB: number; tiebreakA?: number; tiebreakB?: number }[]; winnerId: string }) {
    const idx = this.matches.findIndex(m => m.id === matchId);
    if (idx === -1) return undefined;
    const match = this.matches[idx];
    const updated = { ...match, score, status: MatchStatus.REPORTED };
    this.matches = this.matches.slice(0, idx).concat(updated, this.matches.slice(idx + 1));
    this.saveToStorage();
    return updated;
  }

  confirmScore(matchId: string) {
    const match = this.getMatch(matchId);
    if (match) {
      match.status = MatchStatus.CONFIRMED;
      this.saveToStorage();
    }
    return match;
  }

  updateUser(id: string, data: Partial<User>) {
    const user = this.users.find(u => u.id === id);
    if (user) {
      Object.assign(user, data);
      this.users = [...this.users];
      this.saveToStorage();
    }
    return user;
  }

  deleteUser(id: string) {
    this.users = this.users.filter(u => u.id !== id);
    this.enrollments = this.enrollments.filter(e => e.userId !== id);
    this.saveToStorage();
  }

  // --- ADMIN WRITE ---
  createSeason(seasonData: Omit<Season, 'id' | 'clubId'>) {
    const newSeason: Season = {
        id: `s-${Math.random().toString(36).substr(2, 9)}`,
        clubId: MOCK_CLUB_ID,
        ...seasonData
    };
    this.seasons = [...this.seasons, newSeason];
    this.saveToStorage();
    return newSeason;
  }

  updateSeason(id: string, updates: Partial<Season>) {
    const season = this.seasons.find(s => s.id === id);
    if (season) {
        Object.assign(season, updates);
        this.seasons = [...this.seasons];
        this.saveToStorage();
    }
    return season;
  }

  updateClubSettings(settings: any) {
    this.settings = { ...this.settings, ...settings };
    this.saveToStorage();
    return this.settings;
  }

  // --- DIVISION MANAGEMENT ---

  createDivision(seasonId: string, name: string) {
      const newDivision: Division = {
          id: `d-${Math.random().toString(36).substr(2, 9)}`,
          seasonId,
          name
      };
      this.divisions = [...this.divisions, newDivision];
      this.saveToStorage();
      return newDivision;
  }

  enrollPlayer(divisionId: string, userId: string) {
      const exists = this.enrollments.find(e => e.divisionId === divisionId && e.userId === userId);
      if (exists) return exists;

      const enrollment: Enrollment = {
          id: `e-${Math.random().toString(36).substr(2, 9)}`,
          divisionId,
          userId
      };
      this.enrollments = [...this.enrollments, enrollment];
      this.saveToStorage();
      return enrollment;
  }

  removePlayerFromDivision(divisionId: string, userId: string) {
      this.enrollments = this.enrollments.filter(e => !(e.divisionId === divisionId && e.userId === userId));
      this.saveToStorage();
  }

  generateMatches(divisionId: string) {
    // 1. Clear existing PENDING matches for this division to avoid duplicates (Simplification for MVP)
    this.matches = this.matches.filter(m => !(m.divisionId === divisionId && m.status === MatchStatus.PENDING));

    // 2. Get Players
    const players = this.getPlayersInDivision(divisionId);
    if (players.length < 2) return [];

    // 3. Round Robin Logic (Circle Method)
    const schedule: Match[] = [];
    const playerIds = players.map(p => p.id);
    
    // Add dummy if odd
    if (playerIds.length % 2 !== 0) {
        playerIds.push('BYE');
    }

    const n = playerIds.length;
    const rounds = n - 1;
    const half = n / 2;

    for (let round = 0; round < rounds; round++) {
        for (let i = 0; i < half; i++) {
            const p1 = playerIds[i];
            const p2 = playerIds[n - 1 - i];

            if (p1 !== 'BYE' && p2 !== 'BYE') {
                const match: Match = {
                    id: `gen-${divisionId}-r${round+1}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                    divisionId,
                    type: MatchType.LEAGUE,
                    playerAId: p1,
                    playerBId: p2,
                    round: round + 1,
                    status: MatchStatus.PENDING,
                    createdAt: new Date().toISOString()
                };
                schedule.push(match);
            }
        }
        // Rotate Array
        playerIds.splice(1, 0, playerIds.pop()!);
    }

    this.matches = [...this.matches, ...schedule];
    this.saveToStorage();
    return schedule;
  }
}

const mockDb = new DatabaseService();

/** Wrap sync mock DB so it has the same async interface as API db. */
function wrapMock(m: DatabaseService) {
  return {
    getUsers: () => Promise.resolve(m.getUsers()),
    getUser: (id: string) => Promise.resolve(m.getUser(id)),
    getClub: (id: string) => Promise.resolve(m.getClub(id)),
    getClubActivityRanking: (clubId: string) => Promise.resolve(m.getClubActivityRanking(clubId)),
    getSeasons: () => Promise.resolve(m.getSeasons()),
    getDivisions: (seasonId: string) => Promise.resolve(m.getDivisions(seasonId)),
    getDivision: (id: string) => Promise.resolve(m.getDivision(id)),
    getMatchesForDivision: (divisionId: string) => Promise.resolve(m.getMatchesForDivision(divisionId)),
    getMatchesForUser: (userId: string) => Promise.resolve(m.getMatchesForUser(userId)),
    getMatch: (id: string) => Promise.resolve(m.getMatch(id)),
    getProposals: (matchId: string) => Promise.resolve(m.getProposals(matchId)),
    getEnrollments: (divisionId: string) => Promise.resolve(m.getEnrollments(divisionId)),
    getEnrollmentsForUser: (userId: string) => Promise.resolve(m.getEnrollmentsForUser(userId)),
    getPlayersInDivision: (divisionId: string) => Promise.resolve(m.getPlayersInDivision(divisionId)),
    getClubSettings: () => Promise.resolve(m.getClubSettings()),
    getSeasonStatus: (currentDate: Date) => Promise.resolve(m.getSeasonStatus(currentDate)),
    updateMatchStatus: (matchId: string, status: MatchStatus, scheduledAt?: string, logistics?: MatchLogistics) =>
      Promise.resolve(m.updateMatchStatus(matchId, status, scheduledAt, logistics)),
    createProposal: (matchId: string, userId: string, times: string[], message?: string, logistics?: ProposalLogistics) =>
      Promise.resolve(m.createProposal(matchId, userId, times, message, logistics)),
    createFriendlyMatch: (initiatorId: string, opponentId: string, scheduledAt?: string) => Promise.resolve(m.createFriendlyMatch(initiatorId, opponentId, scheduledAt)),
    submitScore: (matchId: string, score: any) => Promise.resolve(m.submitScore(matchId, score)),
    confirmScore: (matchId: string) => Promise.resolve(m.confirmScore(matchId)),
    updateUser: (id: string, data: Partial<User>) => Promise.resolve(m.updateUser(id, data)),
    deleteUser: (id: string) => { m.deleteUser(id); return Promise.resolve(); },
    createSeason: (seasonData: Omit<Season, 'id' | 'clubId'>) => Promise.resolve(m.createSeason(seasonData)),
    updateSeason: (id: string, updates: Partial<Season>) => Promise.resolve(m.updateSeason(id, updates)),
    updateClubSettings: (settings: any) => Promise.resolve(m.updateClubSettings(settings)),
    createDivision: (seasonId: string, name: string) => Promise.resolve(m.createDivision(seasonId, name)),
    enrollPlayer: (divisionId: string, userId: string) => Promise.resolve(m.enrollPlayer(divisionId, userId)),
    removePlayerFromDivision: (divisionId: string, userId: string) => { m.removePlayerFromDivision(divisionId, userId); return Promise.resolve(); },
    generateMatches: (divisionId: string) => Promise.resolve(m.generateMatches(divisionId)),
  };
}

// When VITE_API_URL is set use API db (async). Otherwise wrapped mock (async interface).
export const db = getApiUrl() ? createApiDb() : wrapMock(mockDb);
/** Sync mock DB – use in auth when VITE_API_URL is not set. */
export { mockDb };