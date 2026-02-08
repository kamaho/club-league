/**
 * Tennis scoring logic for live scorekeeper.
 * Game: 0, 15, 30, 40; deuce then need 2 clear.
 * Set: first to 6 games (lead by 2) or 7-6; at 6-6 tiebreak to 7 (lead by 2).
 * Match: best of 3 sets (2 sets to win).
 */

export type ServerFirst = 'A' | 'B';

export interface CompletedSet {
  gamesA: number;
  gamesB: number;
  tiebreakA?: number;
  tiebreakB?: number;
}

export interface LiveState {
  serverFirst: ServerFirst;
  completedSets: CompletedSet[];
  /** Games in current set (before any tiebreak) */
  currentSetGamesA: number;
  currentSetGamesB: number;
  /** Points in current game (or tiebreak points when inTiebreak) */
  pointsA: number;
  pointsB: number;
  inTiebreak: boolean;
}

export function initialLiveState(serverFirst: ServerFirst): LiveState {
  return {
    serverFirst,
    completedSets: [],
    currentSetGamesA: 0,
    currentSetGamesB: 0,
    pointsA: 0,
    pointsB: 0,
    inTiebreak: false,
  };
}

/** Format current game points for display (0, 15, 30, 40, Deuce, Adv) */
export function formatGamePoints(pointsA: number, pointsB: number): { displayA: string; displayB: string } {
  if (pointsA >= 3 && pointsB >= 3) {
    if (pointsA === pointsB) return { displayA: '40', displayB: '40' }; // Deuce could show "40" or "D"
    if (pointsA > pointsB) return { displayA: 'Ad', displayB: '40' };
    return { displayA: '40', displayB: 'Ad' };
  }
  const toScore = (p: number) => (p === 0 ? '0' : p === 1 ? '15' : p === 2 ? '30' : '40');
  return { displayA: toScore(pointsA), displayB: toScore(pointsB) };
}

/** Check if current game is over (or tiebreak) and return winner 'A' | 'B' | null */
function gameWinner(pointsA: number, pointsB: number, inTiebreak: boolean): 'A' | 'B' | null {
  if (inTiebreak) {
    const max = Math.max(pointsA, pointsB);
    if (max >= 7 && Math.abs(pointsA - pointsB) >= 2) return pointsA > pointsB ? 'A' : 'B';
    return null;
  }
  if ((pointsA >= 4 || pointsB >= 4) && Math.abs(pointsA - pointsB) >= 2) {
    return pointsA > pointsB ? 'A' : 'B';
  }
  return null;
}

/**
 * Add one game to the winner (game-only scoring, no point-by-point).
 * At 6-6, transitions to tiebreak; use addTiebreakWinner for the next input.
 */
export function addGame(state: LiveState, gameWinner: 'A' | 'B'): { state: LiveState; matchOver: boolean; setOver: boolean; nowInTiebreak: boolean } {
  if (state.inTiebreak) {
    return { state, matchOver: false, setOver: false, nowInTiebreak: false };
  }
  const newGamesA = state.currentSetGamesA + (gameWinner === 'A' ? 1 : 0);
  const newGamesB = state.currentSetGamesB + (gameWinner === 'B' ? 1 : 0);

  if (newGamesA >= 6 || newGamesB >= 6) {
    const lead = Math.abs(newGamesA - newGamesB);
    if (lead >= 2) {
      const newCompletedSets: CompletedSet[] = [...state.completedSets, { gamesA: newGamesA, gamesB: newGamesB }];
      const setsWonA = newCompletedSets.filter(s => s.gamesA > s.gamesB).length;
      const setsWonB = newCompletedSets.length - setsWonA;
      const matchOver = setsWonA === 2 || setsWonB === 2;
      return {
        state: {
          ...state,
          completedSets: newCompletedSets,
          currentSetGamesA: 0,
          currentSetGamesB: 0,
          pointsA: 0,
          pointsB: 0,
          inTiebreak: false,
        },
        matchOver,
        setOver: true,
        nowInTiebreak: false,
      };
    }
  }

  if (newGamesA === 6 && newGamesB === 6) {
    return {
      state: {
        ...state,
        currentSetGamesA: 6,
        currentSetGamesB: 6,
        pointsA: 0,
        pointsB: 0,
        inTiebreak: true,
      },
      matchOver: false,
      setOver: false,
      nowInTiebreak: true,
    };
  }

  return {
    state: {
      ...state,
      currentSetGamesA: newGamesA,
      currentSetGamesB: newGamesB,
      pointsA: 0,
      pointsB: 0,
      inTiebreak: false,
    },
    matchOver: false,
    setOver: false,
    nowInTiebreak: false,
  };
}

/**
 * Record tiebreak winner (one tap = winner of tiebreak). Set becomes 7-6 or 6-7.
 */
export function addTiebreakWinner(state: LiveState, winner: 'A' | 'B'): { state: LiveState; matchOver: boolean; setOver: boolean } {
  if (!state.inTiebreak) {
    return { state, matchOver: false, setOver: false };
  }
  const tiebreakA = winner === 'A' ? 7 : 0;
  const tiebreakB = winner === 'B' ? 7 : 0;
  const gamesA = winner === 'A' ? 7 : 6;
  const gamesB = winner === 'B' ? 7 : 6;
  const newCompletedSets: CompletedSet[] = [
    ...state.completedSets,
    { gamesA, gamesB, tiebreakA, tiebreakB },
  ];
  const setsWonA = newCompletedSets.filter(s => (s.gamesA > s.gamesB) || (s.gamesA === 6 && s.gamesB === 6 && (s.tiebreakA ?? 0) > (s.tiebreakB ?? 0))).length;
  const setsWonB = newCompletedSets.length - setsWonA;
  const matchOver = setsWonA === 2 || setsWonB === 2;
  return {
    state: {
      ...state,
      completedSets: newCompletedSets,
      currentSetGamesA: 0,
      currentSetGamesB: 0,
      pointsA: 0,
      pointsB: 0,
      inTiebreak: false,
    },
    matchOver,
    setOver: true,
  };
}

/** Apply one point for winner; returns new state and whether match is over */
export function addPoint(state: LiveState, pointWinner: 'A' | 'B'): { state: LiveState; matchOver: boolean; setOver: boolean } {
  const next = { ...state, pointsA: state.pointsA + (pointWinner === 'A' ? 1 : 0), pointsB: state.pointsB + (pointWinner === 'B' ? 1 : 0) };
  const winner = gameWinner(next.pointsA, next.pointsB, state.inTiebreak);

  if (winner) {
    if (state.inTiebreak) {
      const tiebreakA = next.pointsA;
      const tiebreakB = next.pointsB;
      const newCompletedSets: CompletedSet[] = [
        ...state.completedSets,
        {
          gamesA: state.currentSetGamesA,
          gamesB: state.currentSetGamesB,
          tiebreakA,
          tiebreakB,
        },
      ];
      const setsWonA = newCompletedSets.filter(s => (s.gamesA > s.gamesB) || (s.gamesA === 6 && s.gamesB === 6 && (s.tiebreakA ?? 0) > (s.tiebreakB ?? 0))).length;
      const setsWonB = newCompletedSets.length - setsWonA;
      const matchOver = setsWonA === 2 || setsWonB === 2;
      return {
        state: {
          ...state,
          completedSets: newCompletedSets,
          currentSetGamesA: 0,
          currentSetGamesB: 0,
          pointsA: 0,
          pointsB: 0,
          inTiebreak: false,
        },
        matchOver,
        setOver: true,
      };
    }

    const newGamesA = state.currentSetGamesA + (winner === 'A' ? 1 : 0);
    const newGamesB = state.currentSetGamesB + (winner === 'B' ? 1 : 0);

    if (newGamesA >= 6 || newGamesB >= 6) {
      const lead = Math.abs(newGamesA - newGamesB);
      if (lead >= 2) {
        const newCompletedSets: CompletedSet[] = [...state.completedSets, { gamesA: newGamesA, gamesB: newGamesB }];
        const setsWonA = newCompletedSets.filter(s => s.gamesA > s.gamesB).length;
        const setsWonB = newCompletedSets.length - setsWonA;
        const matchOver = setsWonA === 2 || setsWonB === 2;
        return {
          state: {
            ...state,
            completedSets: newCompletedSets,
            currentSetGamesA: 0,
            currentSetGamesB: 0,
            pointsA: 0,
            pointsB: 0,
            inTiebreak: false,
          },
          matchOver,
          setOver: true,
        };
      }
    }

    if (newGamesA === 6 && newGamesB === 6) {
      return {
        state: {
          ...state,
          currentSetGamesA: 6,
          currentSetGamesB: 6,
          pointsA: 0,
          pointsB: 0,
          inTiebreak: true,
        },
        matchOver: false,
        setOver: false,
      };
    }

    return {
      state: {
        ...state,
        currentSetGamesA: newGamesA,
        currentSetGamesB: newGamesB,
        pointsA: 0,
        pointsB: 0,
        inTiebreak: false,
      },
      matchOver: false,
      setOver: false,
    };
  }

  return { state: next, matchOver: false, setOver: false };
}

/** Convert completed sets to MatchSet[] for API (scoreA, scoreB per set; tiebreak in same set) */
export function liveStateToMatchSets(state: LiveState): { scoreA: number; scoreB: number; tiebreakA?: number; tiebreakB?: number }[] {
  return state.completedSets.map(s => ({
    scoreA: s.gamesA,
    scoreB: s.gamesB,
    ...(s.tiebreakA != null && { tiebreakA: s.tiebreakA }),
    ...(s.tiebreakB != null && { tiebreakB: s.tiebreakB }),
  }));
}

/** Tennis abandoned early: completed sets + current set (incomplete) for API. */
export function partialTennisStateToMatchSets(state: LiveState): { scoreA: number; scoreB: number; tiebreakA?: number; tiebreakB?: number }[] {
  const completed = liveStateToMatchSets(state);
  const current = { scoreA: state.currentSetGamesA, scoreB: state.currentSetGamesB };
  return [...completed, current];
}

/** Determine match winner from live state (who has 2 sets) */
export function getMatchWinner(state: LiveState): 'A' | 'B' | null {
  const setsWonA = state.completedSets.filter(
    s => s.gamesA > s.gamesB || (s.gamesA === 6 && s.gamesB === 6 && (s.tiebreakA ?? 0) > (s.tiebreakB ?? 0))
  ).length;
  const setsWonB = state.completedSets.length - setsWonA;
  if (setsWonA >= 2) return 'A';
  if (setsWonB >= 2) return 'B';
  return null;
}

// --- Stigen (ladder): only games, no sets; play for time, then submit game count ---

export type ScoringMode = 'tennis' | 'stigen';

/** Stigen: add one game; no set/tiebreak logic. */
export function addGameStigen(state: LiveState, gameWinner: 'A' | 'B'): LiveState {
  return {
    ...state,
    currentSetGamesA: state.currentSetGamesA + (gameWinner === 'A' ? 1 : 0),
    currentSetGamesB: state.currentSetGamesB + (gameWinner === 'B' ? 1 : 0),
    pointsA: 0,
    pointsB: 0,
  };
}

/** Stigen: winner = who has more games; null if tie or both 0. */
export function getStigenWinner(state: LiveState): 'A' | 'B' | null {
  const a = state.currentSetGamesA;
  const b = state.currentSetGamesB;
  if (a > b) return 'A';
  if (b > a) return 'B';
  return null;
}

/** Stigen: one "set" with game counts for API. */
export function stigenStateToMatchSets(state: LiveState): { scoreA: number; scoreB: number }[] {
  return [{ scoreA: state.currentSetGamesA, scoreB: state.currentSetGamesB }];
}
