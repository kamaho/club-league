/**
 * DB facade that calls the backend API. All methods return Promises.
 */
import { fetchApi } from './api';
import type {
  User,
  Season,
  Division,
  Match,
  Enrollment,
  MatchProposal,
  MatchStatus,
  MatchLogistics,
  ProposalLogistics,
  Club,
  ClubActivityRankEntry,
} from '../types';

export function createApiDb() {
  return {
    getUsers: (): Promise<User[]> =>
      fetchApi<User[]>('/api/users'),

    getUser: (id: string): Promise<User | undefined> =>
      fetchApi<User>(`/api/users/${id}`).catch(() => undefined),

    getClub: (id: string): Promise<Club | null> =>
      fetchApi<Club>(`/api/clubs/${encodeURIComponent(id)}`).catch(() => null),

    getClubActivityRanking: (clubId: string): Promise<ClubActivityRankEntry[]> =>
      fetchApi<ClubActivityRankEntry[]>(`/api/clubs/${encodeURIComponent(clubId)}/activity-ranking`).catch(() => []),

    getSeasons: (): Promise<Season[]> =>
      fetchApi<Season[]>('/api/seasons'),

    getDivisions: (seasonId: string): Promise<Division[]> =>
      fetchApi<Division[]>(`/api/divisions?seasonId=${encodeURIComponent(seasonId)}`),

    getDivision: (id: string): Promise<Division | undefined> =>
      fetchApi<Division>(`/api/divisions/${id}`).catch(() => undefined),

    getMatchesForDivision: (divisionId: string): Promise<Match[]> =>
      fetchApi<Match[]>(`/api/matches?divisionId=${encodeURIComponent(divisionId)}`),

    getMatchesForUser: (userId: string): Promise<Match[]> =>
      fetchApi<Match[]>(`/api/matches?userId=${encodeURIComponent(userId)}`),

    getMatch: (id: string): Promise<Match | undefined> =>
      fetchApi<Match>(`/api/matches/${id}`).catch(() => undefined),

    getProposals: (matchId: string): Promise<MatchProposal[]> =>
      fetchApi<MatchProposal[]>(`/api/proposals?matchId=${encodeURIComponent(matchId)}`),

    getEnrollments: (divisionId: string): Promise<Enrollment[]> =>
      fetchApi<Enrollment[]>(`/api/enrollments?divisionId=${encodeURIComponent(divisionId)}`),

    getEnrollmentsForUser: (userId: string): Promise<Enrollment[]> =>
      fetchApi<Enrollment[]>(`/api/enrollments?userId=${encodeURIComponent(userId)}`),

    getPlayersInDivision: async (divisionId: string): Promise<User[]> => {
      const enrollments = await fetchApi<Enrollment[]>(`/api/enrollments?divisionId=${encodeURIComponent(divisionId)}`);
      const users: User[] = [];
      for (const e of enrollments) {
        const u = await fetchApi<User>(`/api/users/${e.userId}`).catch(() => null);
        if (u) users.push(u);
      }
      return users;
    },

    getClubSettings: (): Promise<{ logoUrl: string }> =>
      fetchApi<{ logoUrl: string }>('/api/settings'),

    getSeasonStatus: (currentDate: Date): Promise<{ activeRound: number; totalRounds: number; roundsLeft: number; status: string } | null> =>
      fetchApi(`/api/season-status?date=${currentDate.toISOString()}`),

    updateMatchStatus: (matchId: string, status: MatchStatus, scheduledAt?: string, logistics?: MatchLogistics): Promise<Match> =>
      fetchApi<Match>(`/api/matches/${matchId}`, { method: 'PATCH', body: { status, scheduledAt, logistics } }),

    createProposal: (matchId: string, _userId: string, times: string[], message?: string, logistics?: ProposalLogistics): Promise<MatchProposal> =>
      fetchApi<MatchProposal>('/api/proposals', { method: 'POST', body: { matchId, proposedTimes: times, message, logistics } }),

    createFriendlyMatch: (_initiatorId: string, opponentId: string): Promise<Match> =>
      fetchApi<Match>('/api/matches/friendly', { method: 'POST', body: { opponentId } }),

    submitScore: (matchId: string, score: { winnerId: string; sets: Array<{ scoreA: number; scoreB: number }> }): Promise<Match> =>
      fetchApi<Match>('/api/matches/submit-score', { method: 'POST', body: { matchId, score } }),

    confirmScore: (matchId: string): Promise<Match> =>
      fetchApi<Match>('/api/matches/confirm-score', { method: 'POST', body: { matchId } }),

    updateUser: (id: string, data: Partial<User>): Promise<User> =>
      fetchApi<User>(`/api/users/${id}`, { method: 'PATCH', body: data }),

    deleteUser: (id: string): Promise<void> =>
      fetchApi(`/api/users/${id}`, { method: 'DELETE' }),

    createSeason: (seasonData: { name: string; startDate: string; endDate: string; status?: string }): Promise<Season> =>
      fetchApi<Season>('/api/seasons', { method: 'POST', body: seasonData }),

    updateSeason: (id: string, updates: Partial<Season>): Promise<Season> =>
      fetchApi<Season>(`/api/seasons/${id}`, { method: 'PATCH', body: updates }),

    updateClubSettings: (settings: { logoUrl?: string }): Promise<{ logoUrl: string }> =>
      fetchApi<{ logoUrl: string }>('/api/settings', { method: 'PATCH', body: settings }),

    createDivision: (seasonId: string, name: string): Promise<Division> =>
      fetchApi<Division>('/api/divisions', { method: 'POST', body: { seasonId, name } }),

    enrollPlayer: (divisionId: string, userId: string): Promise<Enrollment> =>
      fetchApi<Enrollment>(`/api/divisions/${divisionId}/enroll`, { method: 'POST', body: { userId } }),

    removePlayerFromDivision: (divisionId: string, userId: string): Promise<void> =>
      fetchApi(`/api/divisions/${divisionId}/players/${userId}`, { method: 'DELETE' }),

    generateMatches: (divisionId: string): Promise<Match[]> =>
      fetchApi<Match[]>(`/api/divisions/${divisionId}/generate-matches`, { method: 'POST' }),
  };
}
