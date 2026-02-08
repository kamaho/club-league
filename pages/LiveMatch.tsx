import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { db } from '../services/db';
import {
  addGame,
  addTiebreakWinner,
  addGameStigen,
  initialLiveState,
  liveStateToMatchSets,
  partialTennisStateToMatchSets,
  stigenStateToMatchSets,
  getMatchWinner,
  getStigenWinner,
  type LiveState,
  type ServerFirst,
  type ScoringMode,
} from '../utils/tennisScore';
import { RotateCcw, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ServerSelector } from '../components/ServerSelector';
import { authService } from '../services/auth';
import { fireConfetti } from '../utils/confetti';

const STORAGE_KEY = (matchId: string) => `liveMatch:${matchId}`;

type Phase = 'format' | 'pick-server' | 'playing' | 'confirm';

function loadStored(matchId: string): { serverFirst: ServerFirst; state: LiveState; phase: Phase; scoringMode: ScoringMode } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(matchId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    const scoringMode: ScoringMode = data.scoringMode === 'stigen' ? 'stigen' : 'tennis';
    if (data.phase === 'playing' && data.state) return { serverFirst: data.serverFirst, state: data.state, phase: 'playing', scoringMode };
    if (data.phase === 'confirm' && data.state) return { serverFirst: data.serverFirst, state: data.state, phase: 'confirm', scoringMode };
    return null;
  } catch {
    return null;
  }
}

function saveStored(matchId: string, serverFirst: ServerFirst, state: LiveState, phase: Phase, scoringMode: ScoringMode) {
  try {
    localStorage.setItem(STORAGE_KEY(matchId), JSON.stringify({ serverFirst, state, phase, scoringMode }));
  } catch {}
}

function clearStored(matchId: string) {
  try {
    localStorage.removeItem(STORAGE_KEY(matchId));
  } catch {}
}

export const LiveMatch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useAppContext();
  const [match, setMatch] = useState<Awaited<ReturnType<typeof db.getMatch>> | null>(null);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof db.getUsers>> | null>(null);

  useEffect(() => {
    if (!id) return;
    db.getMatch(id).then(setMatch);
    db.getUsers().then(setUsers);
  }, [id]);

  const [phase, setPhase] = useState<Phase>('format');
  const [serverFirst, setServerFirst] = useState<ServerFirst | null>(null);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [scoringMode, setScoringMode] = useState<ScoringMode>('tennis');
  const [history, setHistory] = useState<LiveState[]>([]);
  const [, setMatchOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** When tennis match is ended early (no 2-set winner), user must choose who won / retired */
  const [abandonedWinner, setAbandonedWinner] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    if (!id || !match) return;
    const stored = loadStored(id);
    if (stored) {
      setServerFirst(stored.serverFirst);
      setLiveState(stored.state);
      setScoringMode(stored.scoringMode);
      setPhase(stored.phase);
      if (stored.phase === 'confirm') setMatchOver(true);
    }
  }, [id, match]);

  const playerA = users?.find(u => u.id === match?.playerAId);
  const playerB = users?.find(u => u.id === match?.playerBId);
  const nameA = playerA?.name ?? 'Player A';
  const nameB = playerB?.name ?? 'Player B';

  const handleServerChosen = useCallback(
    (choice: ServerFirst, mode: ScoringMode) => {
      if (!id) return;
      const first: ServerFirst = choice === 'A' ? 'A' : 'B';
      setServerFirst(first);
      setLiveState(initialLiveState(first));
      setScoringMode(mode);
      setHistory([]);
      setPhase('playing');
      setMatchOver(false);
      saveStored(id, first, initialLiveState(first), 'playing', mode);
    },
    [id]
  );

  const handleGame = useCallback(
    (winner: 'A' | 'B') => {
      if (!liveState || !id) return;
      setHistory(h => [...h, liveState]);
      if (scoringMode === 'stigen') {
        const next = addGameStigen(liveState, winner);
        setLiveState(next);
        setMatchOver(false);
        saveStored(id, serverFirst!, next, 'playing', scoringMode);
      } else {
        const result = liveState.inTiebreak
          ? addTiebreakWinner(liveState, winner)
          : addGame(liveState, winner);
        const next = result.state;
        const over = result.matchOver;
        setLiveState(next);
        setMatchOver(over);
        saveStored(id, serverFirst!, next, over ? 'confirm' : 'playing', scoringMode);
        if (over) setPhase('confirm');
      }
    },
    [liveState, id, serverFirst, scoringMode]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0 || !id) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setLiveState(prev);
    setMatchOver(false);
    setPhase('playing');
    saveStored(id, serverFirst!, prev, 'playing', scoringMode);
  }, [history, id, serverFirst, scoringMode]);

  const handleEndMatch = useCallback(() => {
    if (!liveState) return;
    setPhase('confirm');
    setMatchOver(true);
    if (id) saveStored(id, serverFirst!, liveState, 'confirm', scoringMode);
  }, [liveState, id, serverFirst, scoringMode]);

  const handleSubmit = useCallback(async () => {
    if (!id || !match || !liveState) return;
    const tennisWinner = getMatchWinner(liveState);
    const stigenWinner = getStigenWinner(liveState);
    const winner =
      scoringMode === 'stigen'
        ? stigenWinner
        : (tennisWinner ?? abandonedWinner);
    if (!winner) return;
    const winnerId = winner === 'A' ? match.playerAId : match.playerBId;
    const sets =
      scoringMode === 'stigen'
        ? stigenStateToMatchSets(liveState)
        : tennisWinner
          ? liveStateToMatchSets(liveState)
          : partialTennisStateToMatchSets(liveState);
    setSubmitError(null);
    setSubmitting(true);
    try {
      await db.submitScore(id, { sets, winnerId });
      const user = authService.getCurrentUser();
      if (user && winnerId === user.id) fireConfetti();
      clearStored(id);
      navigate(`/match/${id}`, { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : language === 'no' ? 'Kunne ikke sende inn.' : 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  }, [id, match, liveState, navigate, language, scoringMode, abandonedWinner]);

  const handleCancel = useCallback(() => {
    if (id) clearStored(id);
    navigate(-1);
  }, [id, navigate]);

  if (!match || !users) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!match.id) {
    return (
      <Layout>
        <p className="text-slate-500 p-4">{language === 'no' ? 'Kamp ikke funnet.' : 'Match not found.'}</p>
      </Layout>
    );
  }

  if (phase === 'format') {
    return (
      <Layout>
        <div className="max-w-md mx-auto p-4">
          <h1 className="text-xl font-bold text-slate-900 mb-4">{t('live.scoringFormat')}</h1>
          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={() => setScoringMode('tennis')}
              className={`w-full min-h-[20vh] py-6 px-4 rounded-2xl border-2 text-lg font-bold transition-all ${
                scoringMode === 'tennis'
                  ? 'border-lime-500 bg-lime-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {t('live.formatTennis')}
            </button>
            <button
              type="button"
              onClick={() => setScoringMode('stigen')}
              className={`w-full min-h-[20vh] py-6 px-4 rounded-2xl border-2 text-lg font-bold transition-all ${
                scoringMode === 'stigen'
                  ? 'border-lime-500 bg-lime-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {t('live.formatStigen')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPhase('pick-server')}
            className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold"
          >
            {t('live.next')}
          </button>
          <button type="button" onClick={handleCancel} className="mt-4 w-full py-3 text-slate-500 font-medium">
            {language === 'no' ? 'Avbryt' : 'Cancel'}
          </button>
        </div>
      </Layout>
    );
  }

  if (phase === 'pick-server') {
    return (
      <Layout>
        <div className="flex flex-col min-h-[80vh]">
          <button
            type="button"
            onClick={() => setPhase('format')}
            className="mb-4 w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            ← {language === 'no' ? 'Tilbake til format' : 'Back to format'}
          </button>
          <ServerSelector
            nameA={nameA}
            nameB={nameB}
            onConfirm={(serverFirst) => handleServerChosen(serverFirst, scoringMode)}
            drawButtonLabel={t('live.draw')}
            startButtonLabel={t('live.startMatch')}
            servesFirstLabel={t('live.servesFirst')}
            chooseSelfLabel={t('live.chooseSelf')}
          />
        </div>
      </Layout>
    );
  }

  if (phase === 'playing' && liveState) {
    const fullScore =
      scoringMode === 'stigen'
        ? `${liveState.currentSetGamesA}-${liveState.currentSetGamesB}`
        : (() => {
            const completedStr =
              liveState.completedSets.length > 0
                ? liveState.completedSets
                    .map(s =>
                      s.tiebreakA != null ? `${s.gamesA}-${s.gamesB} (${s.tiebreakA}-${s.tiebreakB})` : `${s.gamesA}-${s.gamesB}`
                    )
                    .join(', ') + (liveState.inTiebreak ? '' : ', ')
                : '';
            const currentStr = liveState.inTiebreak
              ? '6-6 Tiebreak'
              : `${liveState.currentSetGamesA}-${liveState.currentSetGamesB}`;
            return completedStr + currentStr;
          })();

    return (
      <Layout>
        <div className="flex flex-col min-h-[80vh] max-w-lg mx-auto">
          <div className="text-center py-4 px-2">
            <p className="text-2xl font-black text-slate-900 tabular-nums">{fullScore}</p>
            {scoringMode === 'tennis' && liveState.inTiebreak && (
              <p className="text-sm text-slate-500 mt-1">{t('live.tiebreakHint')}</p>
            )}
            {scoringMode === 'stigen' && (
              <p className="text-sm text-slate-500 mt-1">{t('live.games')}</p>
            )}
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3 p-3 min-h-0">
            <button
              type="button"
              onClick={() => handleGame('A')}
              className="min-h-[38vh] rounded-2xl bg-lime-100 border-2 border-lime-300 flex flex-col items-center justify-center p-4 active:scale-[0.98] transition-transform"
            >
              <span className="text-xl font-bold text-slate-900 truncate w-full text-center">{nameA}</span>
              {scoringMode === 'tennis' && liveState.inTiebreak && (
                <span className="text-sm font-medium text-lime-700 mt-2">{t('live.aWinsTiebreak')}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleGame('B')}
              className="min-h-[38vh] rounded-2xl bg-amber-100 border-2 border-amber-300 flex flex-col items-center justify-center p-4 active:scale-[0.98] transition-transform"
            >
              <span className="text-xl font-bold text-slate-900 truncate w-full text-center">{nameB}</span>
              {scoringMode === 'tennis' && liveState.inTiebreak && (
                <span className="text-sm font-medium text-amber-700 mt-2">{t('live.bWinsTiebreak')}</span>
              )}
            </button>
          </div>

          <div className="p-4 flex gap-3">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 flex items-center justify-center gap-2 font-bold text-slate-600 disabled:opacity-40"
            >
              <RotateCcw size={20} /> {t('live.undo')}
            </button>
            <button
              type="button"
              onClick={handleEndMatch}
              className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold"
            >
              {t('live.endMatch')}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (phase === 'confirm' && liveState) {
    const tennisWinner = getMatchWinner(liveState);
    const stigenWinner = getStigenWinner(liveState);
    const effectiveWinner = scoringMode === 'stigen' ? stigenWinner : (tennisWinner ?? abandonedWinner);
    const sets: { scoreA: number; scoreB: number; tiebreakA?: number; tiebreakB?: number }[] =
      scoringMode === 'stigen'
        ? stigenStateToMatchSets(liveState)
        : tennisWinner
          ? liveStateToMatchSets(liveState)
          : partialTennisStateToMatchSets(liveState);
    const winnerName = effectiveWinner === 'A' ? nameA : effectiveWinner === 'B' ? nameB : null;
    const scoreLine = sets
      .map(s =>
        (s as { tiebreakA?: number; tiebreakB?: number }).tiebreakA != null
          ? `${s.scoreA}-${s.scoreB} (${(s as { tiebreakA: number; tiebreakB: number }).tiebreakA}-${(s as { tiebreakA: number; tiebreakB: number }).tiebreakB})`
          : `${s.scoreA}-${s.scoreB}`
      )
      .join(', ');
    const isAbandonedTennis = scoringMode === 'tennis' && !tennisWinner && (liveState.completedSets.length > 0 || liveState.currentSetGamesA > 0 || liveState.currentSetGamesB > 0);

    return (
      <Layout>
        <div className="max-w-md mx-auto p-4">
          <h1 className="text-xl font-bold text-slate-900 mb-2">{t('live.confirmResult')}</h1>
          <p className="text-slate-600 text-sm mb-4">{t('live.verifyScore')}</p>
          <div className="rounded-xl bg-slate-100 p-5 space-y-4 mb-4">
            <div className="text-center">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                {language === 'no' ? 'Resultat' : 'Score'}
              </p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{scoreLine}</p>
              {isAbandonedTennis && (
                <p className="text-slate-500 text-xs mt-1">{t('live.matchAbandoned')}</p>
              )}
            </div>
            {sets.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200">
                {sets.map((set, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {scoringMode === 'stigen'
                        ? (language === 'no' ? 'Spill' : 'Games')
                        : (language === 'no' ? `Sett ${i + 1}` : `Set ${i + 1}`)}
                    </span>
                    <span className="font-mono font-bold tabular-nums">
                      {set.scoreA}-{set.scoreB}
                      {(set as { tiebreakA?: number; tiebreakB?: number }).tiebreakA != null &&
                        ` (${(set as { tiebreakA: number; tiebreakB: number }).tiebreakA}-${(set as { tiebreakA: number; tiebreakB: number }).tiebreakB})`}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {isAbandonedTennis ? (
              <div className="pt-2">
                <p className="text-slate-600 text-sm mb-2">{t('live.chooseWinnerAbandoned')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAbandonedWinner('A')}
                    className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                      abandonedWinner === 'A' ? 'border-lime-500 bg-lime-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {nameA}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbandonedWinner('B')}
                    className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                      abandonedWinner === 'B' ? 'border-amber-500 bg-amber-100 text-slate-900' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {nameB}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-600 pt-2">
                {language === 'no' ? 'Vinner' : 'Winner'}: <strong className="text-slate-900">{winnerName ?? '–'}</strong>
              </p>
            )}
            {!effectiveWinner && scoringMode === 'stigen' && (
              <p className="text-amber-600 text-xs pt-1">
                {language === 'no' ? 'Uavgjort. Gå tilbake og registrer flere spill, eller avslutt med ulik stilling.' : 'Tie. Go back and add more games, or end with a different score.'}
              </p>
            )}
          </div>
          {submitError && (
            <p className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{submitError}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setAbandonedWinner(null); setPhase('playing'); }}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 disabled:opacity-50"
            >
              {t('live.back')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !effectiveWinner}
              className="flex-1 py-3 rounded-xl bg-lime-500 text-slate-900 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (language === 'no' ? 'Sender...' : 'Submitting...') : t('live.submitResult')}
              <Check size={20} />
            </button>
          </div>
          <button type="button" onClick={handleCancel} className="mt-4 w-full py-2 text-slate-400 text-sm">
            {language === 'no' ? 'Avbryt og forkast' : 'Cancel and discard'}
          </button>
        </div>
      </Layout>
    );
  }

  return null;
};
