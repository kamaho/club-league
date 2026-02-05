import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { calculateStandings } from '../utils/standings';
import { ChevronDown, Trophy, Medal } from 'lucide-react';

export const Standings: React.FC = () => {
  const [seasonsData] = useQuery(() => db.getSeasons(), []);
  const seasons = (seasonsData ?? []).sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  const activeSeason = seasons.find(s => s.status === 'ACTIVE') || seasons[0];

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | undefined>(undefined);
  const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

  useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(activeSeason?.id ?? seasons[0].id);
    }
  }, [seasons.length, selectedSeasonId, activeSeason?.id]);

  const [divisionsData] = useQuery(() => selectedSeasonId ? db.getDivisions(selectedSeasonId) : Promise.resolve([]), [selectedSeasonId]);
  const divisions = divisionsData ?? [];
  const [activeDivisionId, setActiveDivisionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (divisions.length > 0) {
      setActiveDivisionId(prev => (prev && divisions.some(d => d.id === prev)) ? prev : divisions[0].id);
    }
  }, [divisions]);

  const [matchesData] = useQuery(() => activeDivisionId ? db.getMatchesForDivision(activeDivisionId) : Promise.resolve([]), [activeDivisionId]);
  const [playersData] = useQuery(() => activeDivisionId ? db.getPlayersInDivision(activeDivisionId) : Promise.resolve([]), [activeDivisionId]);
  const matches = matchesData ?? [];
  const players = playersData ?? [];

  const standings = calculateStandings(matches, players);
  const isCompletedSeason = selectedSeason?.status === 'COMPLETED';

  // --- Components ---
  
  const Podium = ({ winners }: { winners: typeof standings }) => {
    if (winners.length < 3) return null;
    return (
      <div className="flex items-end justify-center gap-4 mb-8 pt-4">
        {/* Silver */}
        <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 bg-white flex items-center justify-center text-xl font-bold text-slate-400 mb-2 relative shadow-lg">
                {winners[1].playerName.charAt(0)}
                <div className="absolute -bottom-3 bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">2ND</div>
            </div>
            <div className="text-center">
                <div className="font-bold text-sm text-slate-800">{winners[1].playerName.split(' ')[0]}</div>
                <div className="text-xs text-slate-400">{winners[1].points} pts</div>
            </div>
            <div className="h-16 w-16 bg-slate-100 rounded-t-lg mt-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-200 to-transparent opacity-50"></div>
            </div>
        </div>

        {/* Gold */}
        <div className="flex flex-col items-center">
            <Trophy className="text-yellow-400 mb-1 animate-bounce" size={24} />
            <div className="w-20 h-20 rounded-full border-4 border-yellow-300 bg-white flex items-center justify-center text-2xl font-bold text-yellow-500 mb-2 relative shadow-xl ring-4 ring-yellow-50">
                {winners[0].playerName.charAt(0)}
                <div className="absolute -bottom-3 bg-yellow-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">1ST</div>
            </div>
            <div className="text-center">
                <div className="font-bold text-base text-slate-900">{winners[0].playerName.split(' ')[0]}</div>
                <div className="text-xs text-yellow-600 font-bold">{winners[0].points} pts</div>
            </div>
            <div className="h-24 w-20 bg-yellow-100 rounded-t-lg mt-2 relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-yellow-200 to-transparent opacity-50"></div>
            </div>
        </div>

        {/* Bronze */}
        <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-4 border-orange-200 bg-white flex items-center justify-center text-xl font-bold text-orange-400 mb-2 relative shadow-lg">
                {winners[2].playerName.charAt(0)}
                <div className="absolute -bottom-3 bg-orange-200 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white">3RD</div>
            </div>
            <div className="text-center">
                <div className="font-bold text-sm text-slate-800">{winners[2].playerName.split(' ')[0]}</div>
                <div className="text-xs text-slate-400">{winners[2].points} pts</div>
            </div>
            <div className="h-12 w-16 bg-orange-50 rounded-t-lg mt-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-orange-100 to-transparent opacity-50"></div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Standings</h1>
          <p className="text-slate-500 text-sm">League Leaderboards & History</p>
        </div>
        
        <div className="flex gap-2">
            {/* Season Selector */}
            <div className="relative flex-1">
                <select 
                    value={selectedSeasonId ?? ''}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime-400 shadow-sm"
                >
                    {seasons.map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.status === 'COMPLETED' ? '(Final)' : ''}</option>
                    ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Division Selector (if multiple) */}
            {divisions.length > 1 && (
                <div className="relative flex-1">
                    <select 
                    value={activeDivisionId ?? ''}
                    onChange={(e) => setActiveDivisionId(e.target.value)}
                        className="w-full appearance-none bg-slate-100 border-transparent text-slate-700 py-2.5 pl-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-lime-400"
                    >
                        {divisions.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
                </div>
            )}
        </div>
      </div>

      {isCompletedSeason && standings.length >= 3 && (
          <Podium winners={standings} />
      )}

      <Card className="overflow-x-auto p-0 mb-8">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3 text-center">MP</th>
              <th className="px-4 py-3 text-center">W-L</th>
              <th className="px-4 py-3 text-center">Pts</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">Set Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map((row, idx) => {
               const isTop3 = isCompletedSeason && idx < 3;
               return (
                <tr key={row.playerId} className={`hover:bg-slate-50 transition-colors ${isTop3 ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {isTop3 ? <Medal size={14} className={idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : 'text-orange-400'} /> : idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                        {row.playerName}
                        {idx === 0 && selectedSeason?.status === 'ACTIVE' && <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.matchesPlayed}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.wins}-{row.losses}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">{row.points}</td>
                    <td className="px-4 py-3 text-center text-slate-500 hidden sm:table-cell">
                    {row.setsWon - row.setsLost > 0 ? '+' : ''}{row.setsWon - row.setsLost}
                    </td>
                </tr>
               );
            })}
          </tbody>
        </table>
        {standings.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            No standings available yet.
          </div>
        )}
      </Card>
      
      {!isCompletedSeason && (
          <div className="bg-slate-900 text-white rounded-xl p-5 mb-8">
              <div className="flex items-center gap-2 mb-4">
                  <Trophy size={18} className="text-yellow-400" />
                  <h3 className="font-bold">Hall of Fame</h3>
              </div>
              <div className="space-y-3">
                 {seasons.filter(s => s.status === 'COMPLETED').slice(0, 3).map(s => (
                         <div key={s.id} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg border border-slate-700">
                             <div>
                                 <div className="text-xs text-slate-400 font-bold uppercase">{s.name}</div>
                                 <div className="font-bold text-sm text-yellow-400">—</div>
                             </div>
                             <button 
                                type="button"
                                onClick={() => setSelectedSeasonId(s.id)}
                                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors"
                             >
                                 View Results
                             </button>
                         </div>
                 ))}
                 {seasons.filter(s => s.status === 'COMPLETED').length === 0 && (
                     <p className="text-slate-500 text-sm">No past seasons completed yet.</p>
                 )}
              </div>
          </div>
      )}
    </Layout>
  );
};