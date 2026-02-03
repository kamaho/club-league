import { Match, MatchStatus, MatchType, StandingsRow, User } from '../types';

export const calculateStandings = (matches: Match[], players: User[]): StandingsRow[] => {
  const standingsMap = new Map<string, StandingsRow>();

  // Initialize standings for all players
  players.forEach(p => {
    standingsMap.set(p.id, {
      playerId: p.id,
      playerName: p.name,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      points: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
    });
  });

  const completedMatches = matches.filter(m => 
    m.type === MatchType.LEAGUE && // Only count League matches
    m.status === MatchStatus.CONFIRMED && 
    m.score
  );

  completedMatches.forEach(match => {
    if (!match.score) return;

    const playerA = standingsMap.get(match.playerAId);
    const playerB = standingsMap.get(match.playerBId);

    if (!playerA || !playerB) return;

    // Matches Played
    playerA.matchesPlayed += 1;
    playerB.matchesPlayed += 1;

    // Winner/Loser stats
    if (match.score.winnerId === match.playerAId) {
      playerA.wins += 1;
      playerA.points += 2;
      playerB.losses += 1;
    } else {
      playerB.wins += 1;
      playerB.points += 2;
      playerA.losses += 1;
    }

    // Sets & Games
    match.score.sets.forEach(set => {
      playerA.setsWon += (set.scoreA > set.scoreB) ? 1 : 0;
      playerA.setsLost += (set.scoreA < set.scoreB) ? 1 : 0;
      playerA.gamesWon += set.scoreA;
      playerA.gamesLost += set.scoreB;

      playerB.setsWon += (set.scoreB > set.scoreA) ? 1 : 0;
      playerB.setsLost += (set.scoreB < set.scoreA) ? 1 : 0;
      playerB.gamesWon += set.scoreB;
      playerB.gamesLost += set.scoreA;
    });
  });

  return Array.from(standingsMap.values()).sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;
    
    // 2. Set Difference
    const setDiffA = a.setsWon - a.setsLost;
    const setDiffB = b.setsWon - b.setsLost;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;

    // 3. Game Difference
    const gameDiffA = a.gamesWon - a.gamesLost;
    const gameDiffB = b.gamesWon - b.gamesLost;
    if (gameDiffB !== gameDiffA) return gameDiffB - gameDiffA;

    // 4. Matches Played (Fewer is better if all else equal? Usually Head-to-head is next but complex for this MVP function)
    return b.wins - a.wins; 
  });
};