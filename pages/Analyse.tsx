import React, { useMemo } from 'react';
import { Layout } from '../components/Layout';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { MatchStatus, Match } from '../types';
import { useAppContext } from '../context/AppContext';
import { parseISO, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Activity } from 'lucide-react';

function getMatchDate(m: { scheduledAt?: string; createdAt?: string }): Date {
  const s = m.scheduledAt || m.createdAt || '';
  return s ? parseISO(s) : new Date(0);
}

type TimeBucket = 'morning' | 'midday' | 'afternoon' | 'evening';
function getTimeBucket(date: Date): TimeBucket {
  const h = date.getHours();
  if (h < 11) return 'morning';
  if (h < 15) return 'midday';
  if (h < 19) return 'afternoon';
  return 'evening';
}

interface MatchAnalysis {
  totalWins: number;
  totalLosses: number;
  winPct: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  byTimeOfDay: Record<TimeBucket, { wins: number; total: number; winPct: number }>;
  byDayOfWeek: Record<number, { wins: number; total: number; winPct: number }>;
  asPlayerA: { wins: number; total: number; winPct: number };
  asPlayerB: { wins: number; total: number; winPct: number };
  avgOpponentUtrWhenWon: number | null;
  avgOpponentUtrWhenLost: number | null;
  last5Form: { wins: number; total: number };
  currentStreak: number;
}

export const Analyse: React.FC = () => {
  const user = authService.getCurrentUser();
  const { t, language } = useAppContext();
  const [matches] = useQuery(
    () => (user ? db.getMatchesForUser(user.id) : Promise.resolve([])),
    [user?.id]
  );
  const [users] = useQuery(() => db.getUsers(), []);

  const matchList = matches ?? [];
  const completedWithScore = useMemo(
    () =>
      matchList.filter(
        (m) =>
          (m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.WALKOVER) &&
          m.score?.sets?.length
      ) as (Match & { score: NonNullable<Match['score']> })[],
    [matchList]
  );

  const matchAnalysis = useMemo((): MatchAnalysis => {
    const buckets: TimeBucket[] = ['morning', 'midday', 'afternoon', 'evening'];
    const byTime: Record<TimeBucket, { wins: number; total: number }> = {
      morning: { wins: 0, total: 0 },
      midday: { wins: 0, total: 0 },
      afternoon: { wins: 0, total: 0 },
      evening: { wins: 0, total: 0 },
    };
    const byDay: Record<number, { wins: number; total: number }> = {};
    for (let i = 0; i < 7; i++) byDay[i] = { wins: 0, total: 0 };
    let asA = { wins: 0, total: 0 };
    let asB = { wins: 0, total: 0 };
    let gamesWon = 0,
      gamesLost = 0,
      setsWon = 0,
      setsLost = 0;
    const utrWhenWon: number[] = [];
    const utrWhenLost: number[] = [];
    const sorted = [...completedWithScore].sort(
      (a, b) => getMatchDate(b).getTime() - getMatchDate(a).getTime()
    );

    sorted.forEach((m) => {
      if (!user || !m.score) return;
      const isWin = m.score.winnerId === user.id;
      const date = getMatchDate(m);
      const bucket = getTimeBucket(date);
      byTime[bucket].total++;
      if (isWin) byTime[bucket].wins++;
      const dow = date.getDay();
      byDay[dow].total++;
      if (isWin) byDay[dow].wins++;
      if (m.playerAId === user.id) {
        asA.total++;
        if (isWin) asA.wins++;
        m.score.sets.forEach((s) => {
          gamesWon += s.scoreA;
          gamesLost += s.scoreB;
          setsWon += s.scoreA > s.scoreB ? 1 : 0;
          setsLost += s.scoreA < s.scoreB ? 1 : 0;
        });
      } else {
        asB.total++;
        if (isWin) asB.wins++;
        m.score.sets.forEach((s) => {
          gamesWon += s.scoreB;
          gamesLost += s.scoreA;
          setsWon += s.scoreB > s.scoreA ? 1 : 0;
          setsLost += s.scoreB < s.scoreA ? 1 : 0;
        });
      }
      const oppId = m.playerAId === user.id ? m.playerBId : m.playerAId;
      const opp = users?.find((u) => u.id === oppId);
      if (opp?.utr != null) {
        if (isWin) utrWhenWon.push(opp.utr);
        else utrWhenLost.push(opp.utr);
      }
    });

    let currentStreak = 0;
    for (const m of sorted) {
      const isWin = m.score!.winnerId === user?.id;
      if (currentStreak === 0) currentStreak = isWin ? 1 : -1;
      else if (currentStreak > 0 && isWin) currentStreak++;
      else if (currentStreak > 0 && !isWin) break;
      else if (currentStreak < 0 && !isWin) currentStreak--;
      else break;
    }

    const total = sorted.length;
    const totalWins = sorted.filter((m) => m.score!.winnerId === user?.id).length;
    const totalLosses = total - totalWins;
    const winPct = total > 0 ? Math.round((totalWins / total) * 100) : 0;
    const last5 = sorted.slice(0, 5);
    const last5Wins = last5.filter((m) => m.score!.winnerId === user?.id).length;

    return {
      totalWins,
      totalLosses,
      winPct,
      gamesWon,
      gamesLost,
      setsWon,
      setsLost,
      byTimeOfDay: buckets.reduce(
        (acc, b) => ({
          ...acc,
          [b]: {
            ...byTime[b],
            winPct: byTime[b].total > 0 ? Math.round((byTime[b].wins / byTime[b].total) * 100) : 0,
          },
        }),
        {} as Record<TimeBucket, { wins: number; total: number; winPct: number }>
      ),
      byDayOfWeek: [0, 1, 2, 3, 4, 5, 6].reduce(
        (acc, d) => ({
          ...acc,
          [d]: {
            ...byDay[d],
            winPct: byDay[d].total > 0 ? Math.round((byDay[d].wins / byDay[d].total) * 100) : 0,
          },
        }),
        {} as Record<number, { wins: number; total: number; winPct: number }>
      ),
      asPlayerA: {
        ...asA,
        winPct: asA.total > 0 ? Math.round((asA.wins / asA.total) * 100) : 0,
      },
      asPlayerB: {
        ...asB,
        winPct: asB.total > 0 ? Math.round((asB.wins / asB.total) * 100) : 0,
      },
      avgOpponentUtrWhenWon:
        utrWhenWon.length > 0
          ? Math.round((utrWhenWon.reduce((a, b) => a + b, 0) / utrWhenWon.length) * 10) / 10
          : null,
      avgOpponentUtrWhenLost:
        utrWhenLost.length > 0
          ? Math.round((utrWhenLost.reduce((a, b) => a + b, 0) / utrWhenLost.length) * 10) / 10
          : null,
      last5Form: { wins: last5Wins, total: last5.length },
      currentStreak,
    };
  }, [completedWithScore, user?.id, users]);

  if (!user) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-bold text-slate-800 mb-2">{t('dashboard.analyze')}</h2>
          <p className="text-xs text-slate-500 mb-3">{t('dashboard.analyzeDesc')}</p>
          {completedWithScore.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">{t('dashboard.analyzeNoData')}</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-slate-100 p-3 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.analyzeRecord')}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {matchAnalysis.totalWins}-{matchAnalysis.totalLosses}
                  </p>
                  <p className="text-xs text-slate-600">{matchAnalysis.winPct}%</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.analyzeGames')}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {matchAnalysis.gamesWon}-{matchAnalysis.gamesLost}
                  </p>
                  <p className="text-xs text-slate-600">
                    {matchAnalysis.gamesLost > 0
                      ? (matchAnalysis.gamesWon / matchAnalysis.gamesLost).toFixed(2)
                      : '–'}{' '}
                    ratio
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.analyzeSets')}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {matchAnalysis.setsWon}-{matchAnalysis.setsLost}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.analyzeLast5')}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {matchAnalysis.last5Form.wins}W-{matchAnalysis.last5Form.total - matchAnalysis.last5Form.wins}L
                  </p>
                  {matchAnalysis.currentStreak !== 0 && (
                    <p className="text-xs font-bold mt-0.5">
                      {matchAnalysis.currentStreak > 0 ? (
                        <span className="text-lime-600">{matchAnalysis.currentStreak} {language === 'no' ? 'seire' : 'W'} streak</span>
                      ) : (
                        <span className="text-red-600">{Math.abs(matchAnalysis.currentStreak)} {language === 'no' ? 'tap' : 'L'} streak</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">{t('dashboard.analyzeAsFirst')}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{matchAnalysis.asPlayerA.winPct}%</p>
                  <p className="text-xs text-slate-600">{matchAnalysis.asPlayerA.wins}-{matchAnalysis.asPlayerA.total - matchAnalysis.asPlayerA.wins} ({matchAnalysis.asPlayerA.total} {language === 'no' ? 'kamper' : 'matches'})</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">{t('dashboard.analyzeAsSecond')}</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{matchAnalysis.asPlayerB.winPct}%</p>
                  <p className="text-xs text-slate-600">{matchAnalysis.asPlayerB.wins}-{matchAnalysis.asPlayerB.total - matchAnalysis.asPlayerB.wins} ({matchAnalysis.asPlayerB.total} {language === 'no' ? 'kamper' : 'matches'})</p>
                </div>
                {(matchAnalysis.avgOpponentUtrWhenWon != null || matchAnalysis.avgOpponentUtrWhenLost != null) && (
                  <div className="rounded-xl bg-slate-100 p-3 border border-slate-200 col-span-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('dashboard.analyzeOpponentUtr')}</p>
                    <div className="flex gap-4 mt-1">
                      <div>
                        <p className="text-xs text-slate-500">{language === 'no' ? 'Vunnet mot snitt' : 'Avg when won'}</p>
                        <p className="text-sm font-bold text-lime-600">{matchAnalysis.avgOpponentUtrWhenWon ?? '–'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{language === 'no' ? 'Tapt mot snitt' : 'Avg when lost'}</p>
                        <p className="text-sm font-bold text-red-600">{matchAnalysis.avgOpponentUtrWhenLost ?? '–'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('dashboard.analyzeByDay')}</p>
                <div className="grid grid-cols-7 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                    const d = matchAnalysis.byDayOfWeek[dow];
                    const dayName = format(new Date(2024, 0, 7 + dow), 'EEE', { locale: language === 'no' ? nb : undefined });
                    return (
                      <div key={dow} className="rounded-lg bg-white border border-slate-200 p-1.5 text-center min-w-0">
                        <p className="text-[9px] text-slate-500 truncate">{dayName}</p>
                        <p className="text-xs font-bold text-slate-900">{d.wins}-{d.total - d.wins}</p>
                        <p className="text-[10px] text-slate-600">{d.total > 0 ? d.winPct + '%' : '–'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('dashboard.analyzeByTime')}</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['morning', 'midday', 'afternoon', 'evening'] as const).map((bucket) => {
                    const d = matchAnalysis.byTimeOfDay[bucket];
                    const label =
                      bucket === 'morning'
                        ? t('dashboard.analyzeMorning')
                        : bucket === 'midday'
                          ? t('dashboard.analyzeMidday')
                          : bucket === 'afternoon'
                            ? t('dashboard.analyzeAfternoon')
                            : t('dashboard.analyzeEvening');
                    return (
                      <div key={bucket} className="rounded-lg bg-white border border-slate-200 p-2 text-center">
                        <p className="text-[10px] text-slate-500 truncate">{label}</p>
                        <p className="text-sm font-bold text-slate-900">{d.wins}-{d.total - d.wins}</p>
                        <p className="text-xs text-slate-600">{d.total > 0 ? d.winPct + '%' : '–'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Kommer: Helse / Garmin */}
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <Activity className="text-slate-600" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {language === 'no' ? 'Kommer senere' : 'Coming soon'}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {language === 'no'
                  ? 'På sikt kobles denne siden opp med Helse-appen (iPhone) eller Garmin for å vise data fra økter.'
                  : 'This page will connect to Apple Health or Garmin to show data from your sessions.'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};
