import React, { useMemo, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { MatchStatus, MatchType } from '../types';
import { calculateStandings } from '../utils/standings';
import type { StandingsRow } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, Mail, HelpCircle, Trophy, Smile, X, Play } from 'lucide-react';
import { TennisAvatar } from '../components/TennisAvatar';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { parseISO, format } from 'date-fns';
import { nb } from 'date-fns/locale';

function getMatchDate(m: { scheduledAt?: string; createdAt?: string }): Date {
  const s = m.scheduledAt || m.createdAt || '';
  return s ? parseISO(s) : new Date(0);
}

export const Home: React.FC = () => {
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const { t, language } = useAppContext();

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
  const [seasonStatus] = useQuery(() => db.getSeasonStatus(new Date()), []);
  const seasonIds = useMemo(() => seasons?.map(s => s.id).join(',') ?? '', [seasons]);
  const [allDivisions] = useQuery(
    () => (seasons?.length ? Promise.all(seasons.map(s => db.getDivisions(s.id))).then(arr => arr.flat()) : Promise.resolve([])),
    [seasonIds]
  );
  const [enrollingSeasonId, setEnrollingSeasonId] = React.useState<string | null>(null);
  const [enrollError, setEnrollError] = React.useState('');
  const [statsListModal, setStatsListModal] = React.useState<'friendlies' | 'league' | null>(null);

  useEffect(() => {
    if (statsListModal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [statsListModal]);

  const matchList = matches ?? [];
  const proposedMatchIds = useMemo(
    () => matchList.filter(m => m.status === MatchStatus.PROPOSED).map(m => m.id),
    [matchList]
  );
  const proposedIdsKey = proposedMatchIds.join(',');
  const [proposalsPerMatch] = useQuery(
    () =>
      proposedMatchIds.length > 0
        ? Promise.all(proposedMatchIds.map(id => db.getProposals(id)))
        : Promise.resolve([]),
    [proposedIdsKey]
  );

  const primaryDivisionId = (enrollments ?? [])[0]?.divisionId;
  const [divisionMatches] = useQuery(
    () => (primaryDivisionId ? db.getMatchesForDivision(primaryDivisionId) : Promise.resolve([])),
    [primaryDivisionId]
  );
  const [divisionPlayers] = useQuery(
    () => (primaryDivisionId ? db.getPlayersInDivision(primaryDivisionId) : Promise.resolve([])),
    [primaryDivisionId]
  );
  const [club] = useQuery(
    () => (user?.clubId ? db.getClub(user.clubId) : Promise.resolve(null)),
    [user?.clubId]
  );
  const [clubActivityRanking] = useQuery(
    () => (user?.clubId ? db.getClubActivityRanking(user.clubId) : Promise.resolve([])),
    [user?.clubId]
  );

  const invitationMatches = useMemo(() => {
    const list = matchList.filter(
      (m) => m.status === MatchStatus.PROPOSED && !m.score
    );
    const perMatch = proposalsPerMatch ?? [];
    return list.filter((m) => {
      const proposals = perMatch[proposedMatchIds.indexOf(m.id)] ?? [];
      const last = proposals[proposals.length - 1];
      return last && last.proposedById !== user?.id;
    });
  }, [matchList, proposalsPerMatch, proposedMatchIds, user?.id]);

  const standings: StandingsRow[] = useMemo(() => {
    if (!primaryDivisionId || !divisionMatches?.length) return [];
    return calculateStandings(divisionMatches ?? [], divisionPlayers ?? []);
  }, [primaryDivisionId, divisionMatches, divisionPlayers]);

  const leagueMatches = useMemo(() => matchList.filter(m => m.type !== MatchType.FRIENDLY), [matchList]);
  const friendlyMatches = useMemo(() => matchList.filter(m => m.type === MatchType.FRIENDLY), [matchList]);
  const calculateStats = (list: typeof matchList) => {
    if (!user) return { won: 0, lost: 0, winRate: 0 };
    const completed = list.filter(m => m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.WALKOVER);
    const won = completed.filter(m => m.score?.winnerId === user.id).length;
    const lost = completed.length - won;
    const winRate = completed.length > 0 ? Math.round((won / completed.length) * 100) : 0;
    return { won, lost, winRate };
  };
  const leagueStats = useMemo(() => calculateStats(leagueMatches), [leagueMatches, user?.id]);
  const friendlyStats = useMemo(() => calculateStats(friendlyMatches), [friendlyMatches, user?.id]);

  const completedFriendlies = useMemo(
    () =>
      [...friendlyMatches]
        .filter(m => m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.WALKOVER)
        .sort((a, b) => getMatchDate(b).getTime() - getMatchDate(a).getTime()),
    [friendlyMatches]
  );
  const completedLeague = useMemo(
    () =>
      [...leagueMatches]
        .filter(m => m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.WALKOVER)
        .sort((a, b) => getMatchDate(b).getTime() - getMatchDate(a).getTime()),
    [leagueMatches]
  );

  const activeRound = seasonStatus?.activeRound ?? 0;
  const totalRounds = Math.max(seasonStatus?.totalRounds ?? 1, 1);
  const [selectedRound, setSelectedRound] = React.useState<number>(activeRound);
  useEffect(() => {
    setSelectedRound((prev) => (activeRound > 0 ? activeRound : prev));
  }, [activeRound]);

  const matchesThisRound = useMemo(
    () =>
      matchList.filter(
        m =>
          m.type === MatchType.LEAGUE &&
          (m.round ?? 0) === selectedRound &&
          (m.status === MatchStatus.PENDING || m.status === MatchStatus.PROPOSED)
      ),
    [matchList, selectedRound]
  );

  const scheduledWhereParticipant = useMemo(() => {
    return matchList
      .filter(
        m =>
          m.status === MatchStatus.SCHEDULED &&
          user &&
          (m.playerAId === user.id || m.playerBId === user.id)
      )
      .sort((a, b) => getMatchDate(a).getTime() - getMatchDate(b).getTime());
  }, [matchList, user?.id]);
  const firstScheduledToStart = scheduledWhereParticipant[0] ?? null;

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

  const divisions = allDivisions ?? [];
  const primaryDivision = primaryDivisionId ? divisions.find(d => d.id === primaryDivisionId) : null;
  const myIndex = standings.findIndex(r => r.playerId === user.id);

  const allSeasons = seasons ?? [];
  const upcomingSeasons = allSeasons.filter(s => s.status === 'UPCOMING');
  const userEnrollments = enrollments ?? [];
  const availableSeasons = upcomingSeasons.filter(season => {
    const seasonDivisions = divisions.filter(d => d.seasonId === season.id);
    const enrolledInSeason = userEnrollments.some(e =>
      seasonDivisions.some(div => div.id === e.divisionId)
    );
    return !enrolledInSeason;
  });

  const handleRegister = async (seasonId: string) => {
    const seasonDivs = divisions.filter(d => d.seasonId === seasonId);
    if (seasonDivs.length === 0) {
      setEnrollError(
        t('home.noDivisions') || 'No divisions available for this season yet. Please check back later.'
      );
      return;
    }
    setEnrollError('');
    setEnrollingSeasonId(seasonId);
    const targetDiv =
      seasonDivs.length === 1
        ? seasonDivs[0]
        : seasonDivs.find(
            d =>
              d.name ===
              (window.prompt(
                `Choose a division:\n${seasonDivs.map(d => d.name).join(', ')}`,
                seasonDivs[0].name
              ) ?? '')
          );
    if (!targetDiv) {
      setEnrollingSeasonId(null);
      return;
    }
    try {
      await db.enrollPlayer(targetDiv.id, user.id);
      await refetchEnrollments();
      setEnrollingSeasonId(null);
    } catch {
      setEnrollError(t('home.enrollFailed') || 'Could not join. Please try again.');
      setEnrollingSeasonId(null);
    }
  };

  const getUser = (id: string) => users?.find(u => u.id === id);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Statistics – øverst */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-3">{t('dashboard.statsTitle')}</h2>
          <div className="bg-slate-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-lime-500/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-full border-2 border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                <TennisAvatar user={user} size={48} className="w-full h-full" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold truncate">{user.name}</h3>
                <p className="text-slate-400 text-xs">
                  {club?.name && (
                    <>
                      {club.name}
                      {(primaryDivision?.name ?? myIndex >= 0) && ' • '}
                    </>
                  )}
                  {primaryDivision?.name ?? (language === 'no' ? 'Ingen divisjon' : 'No division')}
                  {myIndex >= 0 && ` • ${language === 'no' ? 'Plass' : 'Rank'} #${myIndex + 1}`}
                </p>
                {club && (() => {
                  const myEntry = (clubActivityRanking ?? []).find(e => e.userId === user?.id);
                  if (!myEntry) return null;
                  return (
                    <p className="text-slate-500 text-[10px] mt-0.5">
                      {language === 'no' ? 'Aktivitet' : 'Activity'} #{myEntry.rank}
                      {myEntry.completedMatches > 0 && ` · ${myEntry.completedMatches} ${language === 'no' ? 'kamper' : 'matches'}`}
                    </p>
                  );
                })()}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-4 relative z-10">
              <div className="text-center">
                <Link to="/rating-info" className="flex items-center justify-center gap-0.5 hover:text-lime-400 transition-colors">
                  <span className="text-xl font-black text-lime-400">{user.utr ?? '-'}</span>
                  <HelpCircle size={10} className="text-slate-500" />
                </Link>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{t('profile.stats.rating')}</div>
              </div>
              <div className="text-center border-l border-slate-800">
                <div className="text-xl font-black">{leagueStats.winRate}%</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{t('profile.stats.winRate')}</div>
              </div>
              <div className="text-center border-l border-slate-800">
                <div className="text-xl font-black">{leagueStats.won}-{leagueStats.lost}</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{t('profile.stats.record')}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              onClick={() => setStatsListModal('friendlies')}
              className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center gap-3 text-left w-full hover:bg-indigo-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-500 shrink-0">
                <Smile size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">{language === 'no' ? 'Treningskamper' : 'Friendlies'}</div>
                <div className="text-xs text-slate-600">{friendlyStats.won}W - {friendlyStats.lost}L ({friendlyStats.winRate}%)</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setStatsListModal('league')}
              className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center gap-3 text-left w-full hover:bg-amber-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-amber-500 shrink-0">
                <Trophy size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900">{language === 'no' ? 'Serie' : 'League'}</div>
                <div className="text-xs text-slate-600">{leagueStats.won}W - {leagueStats.lost}L ({leagueStats.winRate}%)</div>
              </div>
            </button>
          </div>
        </section>

        {enrollError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex justify-between items-center">
            <span>{enrollError}</span>
            <button
              type="button"
              onClick={() => setEnrollError('')}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {invitationMatches.length > 0 && (() => {
          const inviterNames = invitationMatches
            .map((m) => {
              const idx = proposedMatchIds.indexOf(m.id);
              const proposals = (proposalsPerMatch ?? [])[idx] ?? [];
              const last = proposals[proposals.length - 1];
              return getUser(last?.proposedById)?.name;
            })
            .filter(Boolean) as string[];
          const uniqueNames = [...new Set(inviterNames)];
          const namesText =
            uniqueNames.length === 1
              ? uniqueNames[0]
              : uniqueNames.length === 2
                ? `${uniqueNames[0]} og ${uniqueNames[1]}`
                : uniqueNames.slice(0, -1).join(', ') + ' og ' + uniqueNames[uniqueNames.length - 1];
          return (
            <Link
              to="/matches"
              className="block bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-center hover:bg-blue-100 transition-colors"
            >
              <Mail className="text-blue-600 shrink-0" size={22} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-blue-900 text-sm">{t('dashboard.invitations')}</h3>
                <p className="text-blue-700 text-xs mt-0.5">
                  {t('dashboard.invitationCount', { count: invitationMatches.length })}
                  {namesText ? ' ' + t('dashboard.invitationFrom', { names: namesText }) : ''}
                </p>
              </div>
              <span className="text-blue-600 font-bold text-sm shrink-0">
                {t('dashboard.goToMatches')} →
              </span>
            </Link>
          );
        })()}

        {/* Start kamp – viser motstander */}
        {firstScheduledToStart ? (() => {
          const opponentId = firstScheduledToStart.playerAId === user.id ? firstScheduledToStart.playerBId : firstScheduledToStart.playerAId;
          const opponent = getUser(opponentId);
          const opponentName = opponent?.name ?? (language === 'no' ? 'Motstander' : 'Opponent');
          const matchTypeLabel = firstScheduledToStart.type === MatchType.FRIENDLY ? t('dashboard.matchTypeFriendly') : t('dashboard.matchTypeLeague');
          const scheduledDate = getMatchDate(firstScheduledToStart);
          const dateTimeText = format(scheduledDate, language === 'no' ? 'd. MMM, HH:mm' : 'MMM d, h:mm a', { locale: language === 'no' ? nb : undefined });
          return (
            <Link
              to={`/match/${firstScheduledToStart.id}/live`}
              className="block bg-lime-50 border border-lime-200 rounded-xl p-4 flex gap-3 items-center hover:bg-lime-100 transition-colors"
            >
              <Play className="text-lime-600 shrink-0" size={22} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lime-900 text-sm">{t('live.startMatch')}</h3>
                <p className="text-lime-800 font-medium mt-0.5 truncate">
                  {language === 'no' ? 'Mot' : 'Vs'} {opponentName}
                </p>
                <p className="text-lime-600 text-xs mt-0.5">
                  {matchTypeLabel} · {dateTimeText}
                </p>
              </div>
              <span className="text-lime-600 font-bold text-sm shrink-0">→</span>
            </Link>
          );
        })() : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 items-center">
            <Play className="text-slate-400 shrink-0" size={22} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-700 text-sm">{t('live.startMatch')}</h3>
              <p className="text-slate-600 text-xs mt-0.5">
                {language === 'no'
                  ? 'Ingen planlagte kamper. Gå til kalenderen for å planlegge en kamp.'
                  : 'No scheduled matches. Go to the calendar to schedule a match.'}
              </p>
            </div>
            <Link
              to="/matches"
              className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300 transition-colors"
            >
              {t('dashboard.goToMatches')} →
            </Link>
          </div>
        )}

        {/* Spillere du møter denne runden – send forespørsel direkte */}
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-0.5">{t('dashboard.thisRoundTitle')}</h2>
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setSelectedRound((r) => Math.max(1, r - 1))}
              disabled={selectedRound <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
              aria-label={t('dashboard.prevRound')}
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-xs font-semibold text-slate-600 min-w-[4rem] text-center">
              {t('dashboard.roundNumber', { n: selectedRound })}
            </p>
            <button
              type="button"
              onClick={() => setSelectedRound((r) => Math.min(totalRounds, r + 1))}
              disabled={selectedRound >= totalRounds}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
              aria-label={t('dashboard.nextRound')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">{t('dashboard.thisRoundDesc')}</p>
          {matchesThisRound.length > 0 ? (
            <div className="space-y-2">
              {matchesThisRound.map(m => {
                const opponent = getUser(m.playerAId === user.id ? m.playerBId : m.playerAId);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{opponent?.name ?? '–'}</p>
                      {opponent?.utr != null && (
                        <p className="text-xs text-slate-500">UTR {opponent.utr}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/matches', { state: { proposeForMatchId: m.id } })}
                      className="shrink-0 px-4 py-2 rounded-lg bg-lime-500 text-slate-900 text-sm font-bold hover:bg-lime-400 transition-colors"
                    >
                      {t('dashboard.sendRequest')}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-3">{t('dashboard.noOpponentsThisRound')}</p>
          )}
        </section>

        {/* Season registration */}
        {availableSeasons.map(season => (
          <div
            key={season.id}
            className="bg-slate-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <div className="flex justify-center gap-2 text-lime-400 font-bold text-xs uppercase tracking-wider mb-1">
                  <CalendarDays size={14} /> {t('home.registrationOpen')}
                </div>
                <h3 className="text-lg font-bold">{season.name}</h3>
                <p className="text-slate-400 text-xs mt-1">
                  {new Date(season.startDate).toLocaleDateString()} –{' '}
                  {new Date(season.endDate).toLocaleDateString()}
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
                  <>
                    {t('home.join')} <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: kamp-liste for treningskamper eller serie */}
      {statsListModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[80vh] flex flex-col min-h-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {statsListModal === 'friendlies'
                  ? (language === 'no' ? 'Treningskamper' : 'Friendlies')
                  : (language === 'no' ? 'Serie' : 'League')}
              </h2>
              <button
                type="button"
                onClick={() => setStatsListModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
                aria-label="Lukk"
              >
                <X size={22} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 p-4">
              {(() => {
                const list = statsListModal === 'friendlies' ? completedFriendlies : completedLeague;
                if (list.length === 0) {
                  return (
                    <p className="text-sm text-slate-500 py-6 text-center">
                      {language === 'no' ? 'Ingen fullførte kamper ennå.' : 'No completed matches yet.'}
                    </p>
                  );
                }
                return (
                  <ul className="space-y-2">
                    {list.map(m => {
                      const opponent = getUser(m.playerAId === user.id ? m.playerBId : m.playerAId);
                      const isWin = m.score?.winnerId === user.id;
                      const scoreStr = m.score?.sets
                        ? m.score.sets
                            .map(s => {
                              const my = m.playerAId === user.id ? s.scoreA : s.scoreB;
                              const opp = m.playerAId === user.id ? s.scoreB : s.scoreA;
                              return `${my}-${opp}`;
                            })
                            .join(', ')
                        : '–';
                      const dateStr = m.scheduledAt || m.createdAt
                        ? format(getMatchDate(m), language === 'no' ? 'd. MMM yyyy' : 'MMM d, yyyy')
                        : '';
                      return (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 truncate">{opponent?.name ?? '–'}</p>
                            {dateStr && <p className="text-xs text-slate-500 mt-0.5">{dateStr}</p>}
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isWin ? 'bg-lime-100 text-lime-700' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {isWin ? (language === 'no' ? 'Seier' : 'W') : (language === 'no' ? 'Tap' : 'L')}
                            </span>
                            <span className="font-mono text-sm font-bold text-slate-700">{scoreStr}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
