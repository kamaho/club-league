import { User, Season, Division, Match, Enrollment, UserRole, MatchStatus, MatchProposal, MatchType, MatchLogistics, ProposalLogistics } from '../types';

// --- SEED DATA ---

const MOCK_CLUB_ID = 'club-1';

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
    preferences: {
        matchFrequency: '1_per_2_weeks',
        opponentGender: 'both',
        availability: {},
        skipNextRound: false
    }
  },
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
  { id: 'e3', divisionId: 'd1', userId: 'u4' }, // Diana
  { id: 'e4', divisionId: 'd1', userId: 'u5' }, // Evan
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
  }
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
  getSeasons() { return this.seasons; }
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

    const startDate = new Date(season.startDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / msPerDay);
    
    // 2 weeks per round
    const roundDurationDays = 14;
    
    // If before start
    if (daysDiff < 0) return { activeRound: 0, totalRounds: 0, roundsLeft: 0, status: 'Not Started' };

    const activeRound = Math.floor(daysDiff / roundDurationDays) + 1;
    
    // Find max round in matches to determine total rounds (approximate for MVP)
    const allRounds = this.matches.filter(m => m.type === MatchType.LEAGUE).map(m => m.round || 0);
    const maxRound = allRounds.length > 0 ? Math.max(...allRounds) : 5; // Default to 5 if no matches
    
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

  createFriendlyMatch(initiatorId: string, opponentId: string) {
    const newMatch: Match = {
      id: `f-${Math.random().toString(36).substr(2, 9)}`,
      type: MatchType.FRIENDLY,
      playerAId: initiatorId,
      playerBId: opponentId,
      status: MatchStatus.PENDING,
      createdAt: new Date().toISOString()
    };
    this.matches = [newMatch, ...this.matches];
    this.saveToStorage();
    return newMatch;
  }

  submitScore(matchId: string, score: any) {
    const match = this.getMatch(matchId);
    if (match) {
      match.score = score;
      match.status = MatchStatus.REPORTED;
      this.saveToStorage();
    }
    return match;
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

export const db = new DatabaseService();