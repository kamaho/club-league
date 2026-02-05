import React, { useMemo } from 'react';
import { Layout } from '../components/Layout';
import { MatchCard } from '../components/MatchCard';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { MatchStatus } from '../types';
import { AlertCircle, Calendar, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

function getStatusPriority(status: MatchStatus) {
  switch (status) {
    case MatchStatus.PROPOSED: return 1;
    case MatchStatus.SCHEDULED: return 2;
    case MatchStatus.PENDING: return 3;
    case MatchStatus.CONFIRMED: return 4;
    default: return 5;
  }
}

export const Home: React.FC = () => {
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const { t } = useAppContext();

  const [matches, matchesLoading] = useQuery(
    () => (user ? db.getMatchesForUser(user.id) : Promise.resolve([])),
    [user?.id]
  );
  const [seasons, seasonsLoading] = useQuery(() => db.getSeasons(), []);
  const [enrollments, , refetchEnrollments] = useQuery(
    () => (user ? db.getEnrollmentsForUser(user.id) : Promise.resolve([])),
    [user?.id]
  );
  const [users] = useQuery(() => db.getUsers(), []);
  const seasonIds = useMemo(() => seasons?.map(s => s.id).join(',') ?? '', [seasons]);
  const [allDivisions] = useQuery(
    () => (seasons?.length ? Promise.all(seasons.map(s => db.getDivisions(s.id))).then(arr => arr.flat()) : Promise.resolve([])),
    [seasonIds]
  );
  const [enrollingSeasonId, setEnrollingSeasonId] = React.useState<string | null>(null);
  const [enrollError, setEnrollError] = React.useState('');

  if (!user) return null;

  const loading = matchesLoading || seasonsLoading;
  if (loading && matches === null) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const matchList = matches ?? [];
  const sortedMatches = [...matchList].sort((a, b) => getStatusPriority(a.status) - getStatusPriority(b.status));
  const upcomingMatches = sortedMatches.filter(m => m.status !== MatchStatus.CONFIRMED && m.status !== MatchStatus.WALKOVER);
  const recentResults = sortedMatches.filter(m => m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.WALKOVER);

  const allSeasons = seasons ?? [];
  const upcomingSeasons = allSeasons.filter(s => s.status === 'UPCOMING');
  const userEnrollments = enrollments ?? [];
  const divisions = allDivisions ?? [];

  const availableSeasons = upcomingSeasons.filter(season => {
    const seasonDivisions = divisions.filter(d => d.seasonId === season.id);
    const enrolledInSeason = userEnrollments.some(e => seasonDivisions.some(div => div.id === e.divisionId));
    return !enrolledInSeason;
  });

  const handleRegister = async (seasonId: string) => {
    const seasonDivs = divisions.filter(d => d.seasonId === seasonId);
    if (seasonDivs.length === 0) {
      setEnrollError(t('home.noDivisions') || 'No divisions available for this season yet. Please check back later.');
      return;
    }
    setEnrollError('');
    setEnrollingSeasonId(seasonId);
    const targetDiv = seasonDivs.length === 1
      ? seasonDivs[0]
      : seasonDivs.find(d => d.name === (window.prompt(`Choose a division:\n${seasonDivs.map(d => d.name).join(', ')}`, seasonDivs[0].name) ?? ''));
    if (!targetDiv) {
      setEnrollingSeasonId(null);
      return;
    }
    try {
      await db.enrollPlayer(targetDiv.id, user.id);
      await refetchEnrollments();
      setEnrollingSeasonId(null);
      // Optional: show success toast; for now the card will disappear from "available" list
    } catch {
      setEnrollError(t('home.enrollFailed') || 'Could not join. Please try again.');
      setEnrollingSeasonId(null);
    }
  };

  const getUser = (id: string) => users?.find(u => u.id === id);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('home.greeting')}, {(user.name || '').split(' ')[0] || 'Player'} 👋</h1>
        <p className="text-slate-500">{t('home.activeMatches', { count: upcomingMatches.length })}</p>
      </div>

      <div className="space-y-6">
        {enrollError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex justify-between items-center">
            <span>{enrollError}</span>
            <button type="button" onClick={() => setEnrollError('')} className="text-red-500 hover:text-red-700 font-bold">×</button>
          </div>
        )}
        {availableSeasons.map(season => (
          <div key={season.id} className="bg-slate-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <div className="flex justify-center gap-2 text-lime-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <Calendar size={14} /> {t('home.registrationOpen')}
                </div>
                <h3 className="text-lg font-bold">{season.name}</h3>
                <p className="text-slate-400 text-xs mt-1">
                  {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleRegister(season.id)}
                type="button"
                disabled={enrollingSeasonId === season.id}
                className="bg-lime-400 text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-lime-300 transition-colors shadow-lg shadow-slate-900/20 flex items-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {enrollingSeasonId === season.id ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    {t('home.joining')}
                  </>
                ) : (
                  <>{t('home.join')} <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        ))}

        {upcomingMatches.some(m => m.status === MatchStatus.PROPOSED) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">{t('home.actionRequired')}</h3>
              <p className="text-amber-700 text-xs mt-1">{t('home.actionRequiredDesc')}</p>
            </div>
          </div>
        )}

        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-slate-800">{t('home.yourMatches')}</h2>
            <Link to="/standings" className="text-sm text-lime-600 font-medium hover:underline">{t('home.viewStandings')}</Link>
          </div>
          {upcomingMatches.length > 0 ? (
            upcomingMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                playerA={getUser(match.playerAId)}
                playerB={getUser(match.playerBId)}
                currentUserId={user.id}
              />
            ))
          ) : (
            <div className="text-center py-8 bg-white rounded-lg border border-dashed border-slate-300">
              <p className="text-slate-400 text-sm">{t('home.noMatches')}</p>
            </div>
          )}
        </section>

        {recentResults.length > 0 && (
          <section>
            <h2 className="font-bold text-slate-800 mb-3">{t('home.recentResults')}</h2>
            {recentResults.slice(0, 3).map(match => (
              <MatchCard
                key={match.id}
                match={match}
                playerA={getUser(match.playerAId)}
                playerB={getUser(match.playerBId)}
                currentUserId={user.id}
              />
            ))}
          </section>
        )}
      </div>
    </Layout>
  );
};
