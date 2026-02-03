

export enum UserRole {
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN'
}

export enum MatchStatus {
  PENDING = 'PENDING',
  PROPOSED = 'PROPOSED',
  SCHEDULED = 'SCHEDULED',
  REPORTED = 'REPORTED',
  CONFIRMED = 'CONFIRMED',
  DISPUTED = 'DISPUTED',
  WALKOVER = 'WALKOVER'
}

export enum MatchType {
  LEAGUE = 'LEAGUE',
  FRIENDLY = 'FRIENDLY'
}

export type TimeSlot = 'morning' | 'midday' | 'evening';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface UserPreferences {
  matchFrequency: '1_per_2_weeks' | '2_per_2_weeks' | '1_per_4_weeks' | '3_per_4_weeks';
  opponentGender: 'female' | 'male' | 'both';
  availability: Partial<Record<DayOfWeek, TimeSlot[]>>;
  skipNextRound: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  clubId: string;
  avatarUrl?: string;
  utr?: number;
  phone?: string;
  language?: string;
  preferences?: UserPreferences;
}

export interface Season {
  id: string;
  clubId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

export interface Division {
  id: string;
  seasonId: string;
  name: string;
}

export interface Enrollment {
  id: string;
  divisionId: string;
  userId: string;
}

export interface MatchSet {
  scoreA: number;
  scoreB: number;
  tiebreakA?: number;
  tiebreakB?: number;
}

export interface MatchScore {
  sets: MatchSet[];
  winnerId: string;
}

export interface ProposalLogistics {
  courtNumber?: number;
  bookedById: string; // The specific User ID
  cost: number;
  splitType: 'BOOKER_PAYS' | 'SPLIT';
}

export interface MatchProposal {
  id: string;
  matchId: string;
  proposedById: string;
  proposedTimes: string[]; // ISO strings
  message?: string;
  createdAt: string;
  logistics?: ProposalLogistics;
}

export interface MatchLogistics {
  courtNumber: number;
  bookedById: string;
  cost: number;
  splitType: 'BOOKER_PAYS' | 'SPLIT';
  isSettled: boolean;
}

export interface Match {
  id: string;
  divisionId?: string; // Optional for friendlies
  type: MatchType;
  playerAId: string;
  playerBId: string;
  round?: number; // Optional for friendlies
  status: MatchStatus;
  scheduledAt?: string;
  score?: MatchScore;
  createdAt: string;
  logistics?: MatchLogistics;
}

export interface StandingsRow {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  points: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ClubSettings {
    logoUrl?: string;
}