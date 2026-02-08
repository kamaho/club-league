import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { db } from '../services/db';
import { authService } from '../services/auth';
import { useQuery } from '../hooks/useQuery';
import { MatchStatus, MatchSet, MatchLogistics, ProposalLogistics, User } from '../types';
import { calculateStandings } from '../utils/standings';
import { format, setMinutes, setSeconds } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Calendar, MessageSquare, Check, Trophy, Trash2, Plus, X, MapPin, Phone, Mail } from 'lucide-react';
import { DateTimeSelector } from '../components/DateTimeSelector';
import { TennisAvatar } from '../components/TennisAvatar';
import { useAppContext } from '../context/AppContext';

export const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const user = authService.getCurrentUser();
  const matchId = id || '';

  const [detail, detailLoading, refetchDetail] = useQuery(async () => {
    const m = await db.getMatch(matchId);
    if (!m) return { match: undefined, playerA: undefined, playerB: undefined, proposals: [], division: undefined };
    const [pA, pB, props, div] = await Promise.all([
      db.getUser(m.playerAId),
      db.getUser(m.playerBId),
      db.getProposals(m.id),
      m.divisionId ? db.getDivision(m.divisionId) : Promise.resolve(undefined),
    ]);
    return { match: m, playerA: pA, playerB: pB, proposals: props ?? [], division: div };
  }, [matchId]);

  const opponentId = detail?.match && user ? (user.id === detail.match.playerAId ? detail.match.playerBId : detail.match.playerAId) : undefined;
  const divisionId = detail?.division?.id;
  const [opponentStats] = useQuery(async () => {
    if (!opponentId) return { winRate: 0, totalMatches: 0, rank: undefined as number | undefined };
    const [matches, divMatches, divPlayers] = await Promise.all([
      db.getMatchesForUser(opponentId),
      divisionId ? db.getMatchesForDivision(divisionId) : Promise.resolve([]),
      divisionId ? db.getPlayersInDivision(divisionId) : Promise.resolve([]),
    ]);
    const completed = matches.filter(m => m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.REPORTED);
    const withScore = completed.filter(m => m.score);
    const wins = withScore.filter(m => m.score!.winnerId === opponentId).length;
    const winRate = withScore.length > 0 ? Math.round((wins / withScore.length) * 100) : 0;
    let rank: number | undefined;
    if (divMatches.length > 0 && divPlayers.length > 0) {
      const standings = calculateStandings(divMatches, divPlayers);
      const idx = standings.findIndex(s => s.playerId === opponentId);
      rank = idx >= 0 ? idx + 1 : undefined;
    }
    return { winRate, totalMatches: withScore.length, rank };
  }, [opponentId, divisionId]);

  const { currentDate, t, language } = useAppContext();
  const [proposalTimes, setProposalTimes] = useState<string[]>([]);
  const [proposalMsg, setProposalMsg] = useState('');
  const [showCounterPropose, setShowCounterPropose] = useState(false);
  const [proposalLogistics, setProposalLogistics] = useState<ProposalLogistics>({
    courtNumber: 0,
    bookedById: user?.id || '',
    cost: 0,
    splitType: 'SPLIT',
  });
  const [sets, setSets] = useState<MatchSet[]>([{ scoreA: 0, scoreB: 0 }]);
  const [proposalSentSuccess, setProposalSentSuccess] = useState(false);
  const [showOpponentProfile, setShowOpponentProfile] = useState<User | null>(null);

  const skipNextScoreSaveRef = useRef(true);
  // When match is REPORTED, allow editing score from current reported score
  React.useEffect(() => {
    const m = detail?.match;
    if (m?.status === MatchStatus.REPORTED && m.score?.sets?.length) {
      skipNextScoreSaveRef.current = true;
      setSets(m.score.sets);
    }
  }, [detail?.match?.id, detail?.match?.status, detail?.match?.score?.sets?.length]);

  const match = detail?.match;
  const playerA = detail?.playerA;
  const playerB = detail?.playerB;
  const isParticipant = user && playerA && playerB && (user.id === playerA.id || user.id === playerB.id);

  const handleSubmitScore = useCallback(async () => {
    if (!match || !playerA || !playerB) return;
    let winsA = 0, winsB = 0;
    sets.forEach(s => {
      if (s.scoreA > s.scoreB) winsA++;
      else if (s.scoreB > s.scoreA) winsB++;
    });
    const winnerId = winsA > winsB ? playerA.id : playerB.id;
    await db.submitScore(match.id, { sets, winnerId });
    refetchDetail();
  }, [match?.id, sets, playerA?.id, playerB?.id]);

  // Auto-save score when user edits (REPORTED match); debounced to avoid saving on every keystroke
  useEffect(() => {
    if (skipNextScoreSaveRef.current) {
      skipNextScoreSaveRef.current = false;
      return;
    }
    if (match?.status !== MatchStatus.REPORTED || !isParticipant) return;
    const timer = setTimeout(() => {
      let winsA = 0, winsB = 0;
      sets.forEach(s => {
        if (s.scoreA > s.scoreB) winsA++;
        else if (s.scoreB > s.scoreA) winsB++;
      });
      const winnerId = winsA > winsB ? playerA?.id : playerB?.id;
      if (winnerId) db.submitScore(match.id, { sets, winnerId }).then(refetchDetail);
    }, 1500);
    return () => clearTimeout(timer);
  }, [sets, match?.id, match?.status, isParticipant, playerA?.id, playerB?.id]);

  if (detailLoading && !detail) {
    return <Layout><div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" /></div></Layout>;
  }
  const proposals = detail?.proposals ?? [];
  const division = detail?.division;

  if (!match || !user) return <Layout><div>Match not found</div></Layout>;
  if (!playerA || !playerB) return null;

  const opponent = user.id === playerA.id ? playerB : playerA;

  // Determine if there are incoming proposals I need to answer
  const incomingProposals = proposals.filter(p => p.proposedById !== user.id);
  const hasIncomingProposals = incomingProposals.length > 0;

  // If there are incoming proposals, default to hiding the form unless explicitly requested
  const showProposalForm = !hasIncomingProposals || showCounterPropose;

  // Formatting helpers – times shown as whole hours only (12:00, 13:00)
  const toWholeHour = (date: Date) => setSeconds(setMinutes(date, 0), 0);
  const formatDateTime = (dateString: string) => {
     const date = toWholeHour(new Date(dateString));
     if (language === 'no') return format(date, 'd. MMM, HH:00', { locale: nb });
     return format(date, 'MMM d, h:00 a');
  };

  const formatDay = (dateString: string) => {
     const date = new Date(dateString);
     if (language === 'no') return format(date, 'EEE, d. MMM', { locale: nb });
     return format(date, 'EEE, MMM d');
  };

  const formatTime = (dateString: string) => {
     const date = toWholeHour(new Date(dateString));
     if (language === 'no') return format(date, 'HH:00');
     return format(date, 'h:00 a');
  };

  const handleAddTimeOption = (isoString: string) => {
    if (!proposalTimes.includes(isoString)) {
        setProposalTimes([...proposalTimes, isoString]);
    }
  };

  const handleRemoveTimeOption = (isoString: string) => {
    setProposalTimes(proposalTimes.filter(t => t !== isoString));
  };

  const handleSubmitProposal = async () => {
    if (proposalTimes.length > 0) {
      const finalLogistics = { ...proposalLogistics, bookedById: proposalLogistics.bookedById || user.id };
      await db.createProposal(match.id, user.id, proposalTimes, proposalMsg, finalLogistics);
      setProposalTimes([]);
      setProposalMsg('');
      setShowCounterPropose(false);
      setProposalSentSuccess(true);
      refetchDetail();
      setTimeout(() => setProposalSentSuccess(false), 2500);
    }
  };

  const handleAcceptProposal = async (proposalId: string, time: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;
    const confirmMsg = proposal.logistics
      ? `Confirm match for ${formatDateTime(time)}?\n\nLogistics:\nCourt: ${proposal.logistics.courtNumber || 'Any'}\nCost: ${proposal.logistics.cost} ${t('common.currency')}\nBooking: ${proposal.logistics.bookedById === user.id ? 'You' : opponent.name}`
      : `Confirm match for ${formatDateTime(time)}?`;
    if (window.confirm(confirmMsg)) {
      let logistics: MatchLogistics | undefined;
      if (proposal.logistics) {
        logistics = {
          courtNumber: proposal.logistics.courtNumber || 1,
          bookedById: proposal.logistics.bookedById,
          cost: proposal.logistics.cost,
          splitType: proposal.logistics.splitType,
          isSettled: false,
        };
      }
      await db.updateMatchStatus(match.id, MatchStatus.SCHEDULED, time, logistics);
      refetchDetail();
    }
  };

  const handleSettlePayment = async () => {
    await db.updateMatchStatus(match.id, match.status, match.scheduledAt, { ...match.logistics!, isSettled: true });
    refetchDetail();
  };

  const handleConfirmScore = async () => {
    await db.confirmScore(match.id);
    refetchDetail();
  };

  // Payment Calculation Helper
  const getPaymentStatus = () => {
      if (!match.logistics || match.logistics.splitType !== 'SPLIT' || match.logistics.isSettled) return null;
      
      const iBooked = match.logistics.bookedById === user.id;
      const share = match.logistics.cost / 2;

      if (iBooked) {
          return {
              text: t('match.payment.owesYou', { name: opponent.name.split(' ')[0] }),
              amount: share,
              action: t('match.payment.settled'),
              type: 'RECEIVE'
          };
      } else {
          return {
              text: t('match.payment.youOwe', { name: opponent.name.split(' ')[0] }),
              amount: share,
              action: t('match.payment.paid'),
              type: 'PAY'
          };
      }
  };

  const paymentStatus = getPaymentStatus();

  return (
    <Layout>
      {/* Match Header */}
      <div className="text-center mb-6">
        <div className="inline-block px-3 py-1 bg-slate-200 rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-4">
           {match.divisionId ? `${division?.name ?? ''} • ${t('common.round')} ${match.round}` : t('common.friendly')}
        </div>
        <div className="flex justify-between items-center max-w-sm mx-auto px-4">
          <div className="flex flex-col items-center w-1/3">
            {opponent.id === playerA.id ? (
              <button type="button" onClick={() => setShowOpponentProfile(playerA)} className="flex flex-col items-center w-full rounded-xl hover:ring-2 hover:ring-lime-400 transition-all focus:outline-none focus:ring-2 focus:ring-lime-400">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 shadow-sm flex items-center justify-center overflow-hidden mb-2">
                  <TennisAvatar user={playerA} size={64} />
                </div>
                <div className="font-bold text-slate-900 text-sm leading-tight">{playerA.name.split(' ')[0]}</div>
              </button>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 shadow-sm flex items-center justify-center overflow-hidden mb-2">
                  <TennisAvatar user={playerA} size={64} />
                </div>
                <div className="font-bold text-slate-900 text-sm leading-tight">{playerA.name.split(' ')[0]}</div>
              </>
            )}
          </div>
          <div className="w-1/3 flex flex-col items-center">
            {match.status === MatchStatus.SCHEDULED && match.scheduledAt ? (
                 <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t('status.scheduled')}</div>
                    <div className="text-sm font-bold text-lime-600 bg-lime-50 px-3 py-1 rounded-lg border border-lime-100 whitespace-nowrap">
                        {formatDateTime(match.scheduledAt)}
                    </div>
                    {match.logistics && (
                        <div className="mt-2 text-[10px] text-slate-500 font-medium flex items-center justify-center gap-1">
                            <MapPin size={10} /> {t('common.court')} {match.logistics.courtNumber}
                        </div>
                    )}
                 </div>
            ) : (
                <div className="text-2xl font-black text-slate-200">VS</div>
            )}
          </div>
          <div className="flex flex-col items-center w-1/3">
            {opponent.id === playerB.id ? (
              <button type="button" onClick={() => setShowOpponentProfile(playerB)} className="flex flex-col items-center w-full rounded-xl hover:ring-2 hover:ring-lime-400 transition-all focus:outline-none focus:ring-2 focus:ring-lime-400">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 shadow-sm flex items-center justify-center overflow-hidden mb-2">
                  <TennisAvatar user={playerB} size={64} />
                </div>
                <div className="font-bold text-slate-900 text-sm leading-tight">{playerB.name.split(' ')[0]}</div>
              </button>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 shadow-sm flex items-center justify-center overflow-hidden mb-2">
                  <TennisAvatar user={playerB} size={64} />
                </div>
                <div className="font-bold text-slate-900 text-sm leading-tight">{playerB.name.split(' ')[0]}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Opponent profile popover */}
      {showOpponentProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowOpponentProfile(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button type="button" onClick={() => setShowOpponentProfile(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="text-center mb-4">
              <div className="w-20 h-20 rounded-full mx-auto mb-2 flex items-center justify-center overflow-hidden">
                <TennisAvatar user={showOpponentProfile} size={80} />
              </div>
              <h3 className="font-bold text-slate-900">{showOpponentProfile.name}</h3>
              <p className="text-xs text-slate-500">UTR {showOpponentProfile.utr ?? '—'}</p>
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{language === 'no' ? 'Rank' : 'Rank'}</span>
                <span className="font-bold text-slate-900">{opponentStats?.rank ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{language === 'no' ? 'Seiersrate' : 'Win rate'}</span>
                <span className="font-bold text-slate-900">{opponentStats?.winRate ?? 0}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{language === 'no' ? 'Alder' : 'Age'}</span>
                <span className="font-bold text-slate-900">—</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Contact Info Section - Displayed if participant */}
      {isParticipant && (
          <div className="max-w-xs mx-auto mb-6 bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex items-center justify-between">
              <div className="text-xs text-slate-500 font-bold">{t('common.contact').toUpperCase()} {opponent.name.split(' ')[0].toUpperCase()}</div>
              <div className="flex gap-3">
                  {opponent.phone && (
                    <a href={`tel:${opponent.phone}`} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded transition-colors text-xs font-medium">
                        <Phone size={12} /> {t('common.call')}
                    </a>
                  )}
                  <a href={`mailto:${opponent.email}`} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded transition-colors text-xs font-medium">
                        <Mail size={12} /> {t('common.email')}
                  </a>
              </div>
          </div>
      )}

      {/* PAYMENT & LOGISTICS OVERVIEW (If Scheduled) */}
      {match.status === MatchStatus.SCHEDULED && match.logistics && isParticipant && (
        <Card className="mb-6 bg-slate-50 border-slate-200">
           <div className="flex items-center justify-between mb-3">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('match.logistics')}</h3>
               {paymentStatus && (
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${paymentStatus.type === 'RECEIVE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                       {t('match.payment.pending')}
                   </span>
               )}
           </div>
           
           <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                   <div className="text-xs text-slate-500">{t('common.court')}</div>
                   <div className="font-bold text-slate-900">{t('common.court')} {match.logistics.courtNumber}</div>
               </div>
               <div>
                   <div className="text-xs text-slate-500">{t('match.bookedBy')}</div>
                   <div className="font-bold text-slate-900">
                       {match.logistics.bookedById === user.id ? 'You' : opponent.name.split(' ')[0]}
                   </div>
               </div>
           </div>

           {/* Payment Action */}
           {paymentStatus && (
               <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                       {/* Custom currency symbol support if needed, otherwise just text */}
                       <span className={`font-bold text-slate-800 ${paymentStatus.type === 'RECEIVE' ? 'text-amber-600' : 'text-slate-800'}`}>
                           {paymentStatus.text} {paymentStatus.amount} {t('common.currency')}
                       </span>
                   </div>
                   <button 
                       onClick={handleSettlePayment}
                       className="text-xs font-bold bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 shadow-sm"
                   >
                       {paymentStatus.action}
                   </button>
               </div>
           )}
           
           {!paymentStatus && match.logistics.isSettled && match.logistics.cost > 0 && (
               <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2 text-green-600 text-xs font-bold">
                   <Check size={14} /> All payments settled.
               </div>
           )}
        </Card>
      )}

      {/* Match Actions Section */}
      <div className="space-y-6">
        
        {/* SCORE DISPLAY – CONFIRMED: read-only. REPORTED: editable for reporter, confirm for opponent */}
        {match.status === MatchStatus.CONFIRMED && match.score && (
          <Card className="text-center bg-slate-900 text-white border-none shadow-xl">
            <Trophy className="mx-auto text-yellow-400 mb-2" />
            <h3 className="text-lg font-bold mb-4">Final Score</h3>
            <div className="flex justify-center gap-2 mb-4">
              {match.score.sets.map((s, i) => (
                <div key={i} className="bg-slate-800 px-4 py-3 rounded-lg text-2xl font-mono font-bold border border-slate-700">
                  {s.scoreA}-{s.scoreB}
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-sm">{t('common.winner')}: {match.score.winnerId === playerA.id ? playerA.name : playerB.name}</p>
          </Card>
        )}

        {/* REPORTED: editable score until opponent confirms */}
        {match.status === MatchStatus.REPORTED && match.score && isParticipant && (
          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <h3 className="text-lg font-bold mb-2 text-center">{t('match.report.title')}</h3>
            <p className="text-slate-400 text-xs text-center mb-4">{language === 'no' ? 'Du kan redigere scoren før motspilleren bekrefter.' : 'You can edit the score before your opponent confirms.'}</p>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
              <span>Set</span>
              <span className="w-16 text-center">{playerA.name.split(' ')[0]}</span>
              <span className="w-16 text-center">{playerB.name.split(' ')[0]}</span>
            </div>
            {sets.map((set, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700 mb-2">
                <div className="text-sm font-bold text-slate-300 w-8 h-10 flex items-center justify-center bg-slate-700 rounded">{idx + 1}</div>
                <div className="flex items-center gap-4">
                  <input
                    type="tel"
                    className="w-16 h-10 text-center border-2 border-slate-600 rounded-lg font-mono text-lg font-bold bg-slate-800 text-white focus:border-lime-400 focus:outline-none"
                    value={set.scoreA}
                    onChange={(e) => {
                      const newSets = [...sets];
                      newSets[idx].scoreA = parseInt(e.target.value) || 0;
                      setSets(newSets);
                    }}
                  />
                  <span className="text-slate-500 font-black">-</span>
                  <input
                    type="tel"
                    className="w-16 h-10 text-center border-2 border-slate-600 rounded-lg font-mono text-lg font-bold bg-slate-800 text-white focus:border-lime-400 focus:outline-none"
                    value={set.scoreB}
                    onChange={(e) => {
                      const newSets = [...sets];
                      newSets[idx].scoreB = parseInt(e.target.value) || 0;
                      setSets(newSets);
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              {sets.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSets(sets.slice(0, -1))}
                  className="px-4 py-2 border border-slate-600 text-slate-400 rounded-lg font-bold hover:bg-slate-700"
                >
                  <Trash2 size={16} className="inline" /> {language === 'no' ? 'Fjern sett' : 'Remove set'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSets([...sets, { scoreA: 0, scoreB: 0 }])}
                className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-1"
              >
                <Plus size={16} /> {language === 'no' ? 'Legg til sett' : 'Add set'}
              </button>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-slate-500 text-xs text-center">
                {language === 'no' ? 'Scoren lagres automatisk når du endrer.' : 'Score is saved automatically when you edit.'}
              </p>
              <button
                type="button"
                onClick={handleConfirmScore}
                className="w-full bg-lime-400 text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-lime-300 transition-colors shadow-lg shadow-lime-900/20"
              >
                {t('match.report.confirm')}
              </button>
            </div>
          </Card>
        )}

        {match.status === MatchStatus.REPORTED && !isParticipant && match.score && (
          <Card className="text-center bg-slate-900 text-white border-none shadow-xl">
            <h3 className="text-lg font-bold mb-4">Reported Score</h3>
            <div className="flex justify-center gap-2 mb-4">
              {match.score.sets.map((s, i) => (
                <div key={i} className="bg-slate-800 px-4 py-3 rounded-lg text-2xl font-mono font-bold border border-slate-700">
                  {s.scoreA}-{s.scoreB}
                </div>
              ))}
            </div>
            <p className="text-slate-400 text-sm">{t('common.winner')}: {match.score.winnerId === playerA.id ? playerA.name : playerB.name}</p>
          </Card>
        )}


        {/* SCHEDULING */}
        {isParticipant && (match.status === MatchStatus.PENDING || match.status === MatchStatus.PROPOSED) && (
          <div className="space-y-6">
            {/* INCOMING PROPOSALS */}
            {proposals.length > 0 && (
                <div className="space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('match.proposal.history')}</span>
                      <div className="h-px bg-slate-200 flex-1"></div>
                   </div>
                   
                   {(() => {
                     const lastProposalIsMine = proposals[proposals.length - 1].proposedById === user.id;
                     return proposals.map(p => {
                       const isMine = p.proposedById === user.id;
                       const confirmDisabled = !isMine && lastProposalIsMine;
                       return (
                          <Card key={p.id} className={`${isMine ? 'bg-slate-50 border-slate-100' : 'bg-white border-amber-200 shadow-sm ring-1 ring-amber-50'}`}>
                             <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100/50">
                                <MessageSquare size={14} className={isMine ? "text-slate-400" : "text-amber-500"} />
                                <span className={`text-xs font-bold ${isMine ? 'text-slate-500' : 'text-amber-700'}`}>
                                    {isMine ? t('match.proposal.youSent') : t('match.proposal.received', { name: opponent.name.split(' ')[0] })}
                                </span>
                                <span className="ml-auto text-[10px] text-slate-400">{format(new Date(p.createdAt), 'MMM d')}</span>
                             </div>

                             {!isMine && (
                                <p className="text-xs font-medium text-slate-600 mb-3 bg-amber-50 p-2 rounded border border-amber-100">
                                    {t('match.proposal.tapToConfirm')}
                                </p>
                             )}

                             <div className="space-y-2">
                                {p.proposedTimes.map((time, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={isMine || confirmDisabled}
                                        onClick={() => handleAcceptProposal(p.id, time)}
                                        className={`w-full text-left p-3 rounded-lg border flex justify-between items-center transition-all
                                            ${isMine || confirmDisabled
                                                ? 'bg-white border-slate-200 text-slate-400 cursor-default' 
                                                : 'bg-white border-amber-200 text-slate-800 hover:bg-lime-400 hover:border-lime-500 hover:text-slate-900 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Calendar size={16} className="opacity-50" />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold uppercase">{formatDay(time)}</span>
                                                <span className="text-sm font-bold">{formatTime(time)}</span>
                                            </div>
                                        </div>
                                        {!isMine && !confirmDisabled && <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-1 rounded">{t('match.proposal.confirmBtn')}</span>}
                                    </button>
                                ))}
                             </div>

                             {p.logistics && (
                                 <div className="mt-3 text-xs bg-slate-100/70 p-2 rounded border border-slate-200 text-slate-600">
                                     <div className="font-bold text-slate-700 mb-1">{t('match.logistics')}:</div>
                                     <div className="flex justify-between">
                                         <span>{t('common.court')}: {p.logistics.courtNumber || 'Any'}</span>
                                         <span>{t('match.logistics.cost')}: {p.logistics.cost} {t('common.currency')}</span>
                                     </div>
                                     <div className="mt-1">
                                         {t('match.bookedBy')}: {p.logistics.bookedById === user.id ? 'You' : opponent.name}
                                     </div>
                                 </div>
                             )}

                             {p.message && (
                                <div className="mt-2 text-xs text-slate-500 italic">
                                    "{p.message}"
                                </div>
                             )}
                          </Card>
                       );
                     });
                   })()}
                </div>
            )}

            {/* COUNTER PROPOSAL TOGGLE */}
            {hasIncomingProposals && !showCounterPropose && (
                <div className="text-center">
                    <p className="text-xs text-slate-500 mb-3">None of these times work for you?</p>
                    <button 
                        onClick={() => setShowCounterPropose(true)}
                        className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        {t('match.proposal.decline')}
                    </button>
                </div>
            )}

            {/* NEW PROPOSAL FORM */}
            {showProposalForm && (
                <Card 
                    title={hasIncomingProposals ? "Counter Proposal" : "Propose Times"} 
                    action={
                        hasIncomingProposals ? (
                            <button onClick={() => setShowCounterPropose(false)} className="text-slate-400 hover:text-slate-800">
                                <X size={20} />
                            </button>
                        ) : undefined
                    }
                >
                    <div className="space-y-4">
                        <p className="text-xs text-slate-500">
                            Select available dates and outline logistics.
                        </p>
                        
                        <DateTimeSelector onSelect={handleAddTimeOption} startDate={currentDate} />

                        {/* Selected Times List */}
                        {proposalTimes.length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Selected Options</label>
                                <div className="space-y-2">
                                    {proposalTimes.map(t => (
                                        <div key={t} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <Check size={14} className="text-lime-500" />
                                                {formatDateTime(t)}
                                            </div>
                                            <button onClick={() => handleRemoveTimeOption(t)} className="text-slate-400 hover:text-red-500 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* LOGISTICS FORM IN PROPOSAL */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                             <div className="flex items-center gap-2 mb-1">
                                <MapPin size={16} className="text-slate-400" />
                                <h3 className="text-sm font-bold text-slate-700">{t('match.logistics')}</h3>
                             </div>

                             {/* Who Books */}
                             <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('match.logistics.whoBooks')}</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setProposalLogistics({ ...proposalLogistics, bookedById: user.id })}
                                        className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                                            proposalLogistics.bookedById === user.id
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        <Check size={14} className={proposalLogistics.bookedById === user.id ? 'opacity-100' : 'opacity-0'} />
                                        Me
                                    </button>
                                    <button
                                        onClick={() => setProposalLogistics({ ...proposalLogistics, bookedById: opponent.id })}
                                        className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                                            proposalLogistics.bookedById === opponent.id
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                    >
                                        <Check size={14} className={proposalLogistics.bookedById === opponent.id ? 'opacity-100' : 'opacity-0'} />
                                        {opponent.name.split(' ')[0]}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('match.logistics.cost')} ({t('common.currency')})</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-sm focus:ring-2 focus:ring-lime-400 outline-none"
                                        value={proposalLogistics.cost === 0 ? '' : proposalLogistics.cost}
                                        onChange={(e) => setProposalLogistics({ ...proposalLogistics, cost: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('common.court')} #</label>
                                    <select 
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-sm bg-white focus:ring-2 focus:ring-lime-400 outline-none"
                                        value={proposalLogistics.courtNumber || 0}
                                        onChange={(e) => setProposalLogistics({ ...proposalLogistics, courtNumber: parseInt(e.target.value) })}
                                    >
                                        <option value={0}>Any / TBD</option>
                                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                                            <option key={num} value={num}>{t('common.court')} {num}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('match.logistics.sharing')}</label>
                                <div className="flex gap-2">
                                     <button
                                        onClick={() => setProposalLogistics({ ...proposalLogistics, splitType: 'SPLIT' })}
                                        className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all ${
                                            proposalLogistics.splitType === 'SPLIT'
                                            ? 'bg-white text-slate-900 border-slate-300 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-400 border-transparent hover:bg-slate-100'
                                        }`}
                                    >
                                        {t('match.logistics.split')}
                                    </button>
                                    <button
                                        onClick={() => setProposalLogistics({ ...proposalLogistics, splitType: 'BOOKER_PAYS' })}
                                        className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all ${
                                            proposalLogistics.splitType === 'BOOKER_PAYS'
                                            ? 'bg-white text-slate-900 border-slate-300 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-400 border-transparent hover:bg-slate-100'
                                        }`}
                                    >
                                        {t('match.logistics.bookerPays')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <textarea 
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-400 outline-none"
                            placeholder="Add a message (optional)..."
                            rows={2}
                            value={proposalMsg}
                            onChange={(e) => setProposalMsg(e.target.value)}
                        />

                        <button 
                            onClick={handleSubmitProposal}
                            disabled={proposalTimes.length === 0 || proposalSentSuccess}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                proposalSentSuccess
                                ? 'bg-green-600 text-white cursor-default'
                                : proposalTimes.length > 0 
                                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {proposalSentSuccess ? (language === 'no' ? 'Forslag sendt!' : 'Proposal sent!') : t('match.logistics.send', {count: proposalTimes.length})}
                        </button>
                    </div>
                </Card>
            )}
          </div>
        )}

        {/* SCORE REPORTING */}
        {isParticipant && match.status === MatchStatus.SCHEDULED && (
            <Card title={t('match.report.title')}>
                <div className="space-y-6">
                    <Link
                        to={`/match/${match.id}/live`}
                        className="block w-full py-3 rounded-xl bg-lime-500 text-slate-900 font-bold text-center hover:bg-lime-400"
                    >
                        {t('live.startMatch')}
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400 font-bold">{language === 'no' ? 'Eller skriv inn manuelt' : 'Or enter manually'}</span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                         <span>Set</span>
                         <span className="w-16 text-center">{playerA.name.split(' ')[0]}</span>
                         <span className="w-16 text-center">{playerB.name.split(' ')[0]}</span>
                    </div>

                    {sets.map((set, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                             <div className="text-sm font-bold text-slate-900 w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm border border-slate-200">
                                {idx + 1}
                             </div>
                             <div className="flex items-center gap-4">
                                <input 
                                    type="tel" 
                                    className="w-16 h-12 text-center border-2 border-slate-200 rounded-lg font-mono text-xl font-bold focus:border-lime-400 focus:outline-none bg-white" 
                                    placeholder="0"
                                    value={set.scoreA}
                                    onChange={(e) => {
                                        const newSets = [...sets];
                                        newSets[idx].scoreA = parseInt(e.target.value) || 0;
                                        setSets(newSets);
                                    }}
                                />
                                <span className="text-slate-300 font-black">-</span>
                                <input 
                                    type="tel" 
                                    className="w-16 h-12 text-center border-2 border-slate-200 rounded-lg font-mono text-xl font-bold focus:border-lime-400 focus:outline-none bg-white" 
                                    placeholder="0"
                                    value={set.scoreB}
                                    onChange={(e) => {
                                        const newSets = [...sets];
                                        newSets[idx].scoreB = parseInt(e.target.value) || 0;
                                        setSets(newSets);
                                    }}
                                />
                             </div>
                        </div>
                    ))}
                    
                    <div className="flex gap-3 text-sm">
                        <button 
                            className="flex-1 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                            onClick={() => setSets([...sets, { scoreA: 0, scoreB: 0 }])}
                        >
                            <Plus size={16} /> Add Set
                        </button>
                         {sets.length > 1 && (
                            <button 
                                className="px-4 py-2 border border-red-100 text-red-500 rounded-lg font-bold hover:bg-red-50"
                                onClick={() => setSets(sets.slice(0, -1))}
                            >
                                <Trash2 size={16} />
                            </button>
                         )}
                    </div>

                    <button 
                        onClick={handleSubmitScore}
                        className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg"
                    >
                        {t('match.report.submit')}
                    </button>
                </div>
            </Card>
        )}

      </div>
    </Layout>
  );
};