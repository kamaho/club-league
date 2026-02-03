import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { db } from '../services/db';
import { authService } from '../services/auth';
import { MatchStatus, MatchSet, MatchLogistics, ProposalLogistics } from '../types';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Calendar, Clock, MessageSquare, Check, Trophy, Trash2, Plus, X, MapPin, Phone, Mail } from 'lucide-react';
import { DateTimeSelector } from '../components/DateTimeSelector';
import { useAppContext } from '../context/AppContext';

export const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const match = db.getMatch(id || '');
  const { currentDate, t, language } = useAppContext();
  
  // State for new proposal
  const [proposalTimes, setProposalTimes] = useState<string[]>([]);
  const [proposalMsg, setProposalMsg] = useState('');
  const [showCounterPropose, setShowCounterPropose] = useState(false);
  
  // Proposal Logistics Form
  const [proposalLogistics, setProposalLogistics] = useState<ProposalLogistics>({
      courtNumber: 0, // 0 means unassigned or choose later
      bookedById: user?.id || '',
      cost: 0,
      splitType: 'SPLIT'
  });
  
  // State for Score
  const [sets, setSets] = useState<MatchSet[]>([{ scoreA: 0, scoreB: 0 }]);
  
  if (!match || !user) return <div>Match not found</div>;

  const playerA = db.getUser(match.playerAId);
  const playerB = db.getUser(match.playerBId);
  const proposals = db.getProposals(match.id);
  
  if (!playerA || !playerB) return null;

  const isParticipant = user.id === playerA.id || user.id === playerB.id;
  const opponent = user.id === playerA.id ? playerB : playerA;

  // Determine if there are incoming proposals I need to answer
  const incomingProposals = proposals.filter(p => p.proposedById !== user.id);
  const hasIncomingProposals = incomingProposals.length > 0;

  // If there are incoming proposals, default to hiding the form unless explicitly requested
  const showProposalForm = !hasIncomingProposals || showCounterPropose;

  // Formatting helpers
  const formatDateTime = (dateString: string) => {
     const date = new Date(dateString);
     if (language === 'no') return format(date, 'd. MMM, HH:mm', { locale: nb });
     return format(date, 'MMM d, h:mm a');
  };

  const formatDay = (dateString: string) => {
     const date = new Date(dateString);
     if (language === 'no') return format(date, 'EEE, d. MMM', { locale: nb });
     return format(date, 'EEE, MMM d');
  };

  const formatTime = (dateString: string) => {
     const date = new Date(dateString);
     if (language === 'no') return format(date, 'HH:mm');
     return format(date, 'h:mm a');
  };

  const handleAddTimeOption = (isoString: string) => {
    if (!proposalTimes.includes(isoString)) {
        setProposalTimes([...proposalTimes, isoString]);
    }
  };

  const handleRemoveTimeOption = (isoString: string) => {
    setProposalTimes(proposalTimes.filter(t => t !== isoString));
  };

  const handleSubmitProposal = () => {
    if (proposalTimes.length > 0) {
      // Ensure bookedById is set correctly even if default
      const finalLogistics = { ...proposalLogistics, bookedById: proposalLogistics.bookedById || user.id };
      
      db.createProposal(match.id, user.id, proposalTimes, proposalMsg, finalLogistics);
      // Reset
      setProposalTimes([]);
      setProposalMsg('');
      setShowCounterPropose(false);
      navigate(0); // Refresh
    }
  };

  const handleAcceptProposal = (proposalId: string, time: string) => {
      const proposal = proposals.find(p => p.id === proposalId);
      if (!proposal) return;
      
      const confirmMsg = proposal.logistics 
        ? `Confirm match for ${formatDateTime(time)}?\n\nLogistics:\nCourt: ${proposal.logistics.courtNumber || 'Any'}\nCost: ${proposal.logistics.cost} ${t('common.currency')}\nBooking: ${proposal.logistics.bookedById === user.id ? 'You' : opponent.name}` 
        : `Confirm match for ${formatDateTime(time)}?`;

      if (window.confirm(confirmMsg)) {
        // Create match logistics from proposal logistics
        let logistics: MatchLogistics | undefined;
        
        if (proposal.logistics) {
            logistics = {
                courtNumber: proposal.logistics.courtNumber || 1, // Default to 1 if not specified
                bookedById: proposal.logistics.bookedById,
                cost: proposal.logistics.cost,
                splitType: proposal.logistics.splitType,
                isSettled: false
            };
        }

        db.updateMatchStatus(match.id, MatchStatus.SCHEDULED, time, logistics);
        navigate(0);
      }
  };

  const handleSettlePayment = () => {
      db.updateMatchStatus(match.id, match.status, match.scheduledAt, { ...match.logistics!, isSettled: true });
      navigate(0);
  };

  const handleSubmitScore = () => {
    // Calculate winner
    let winsA = 0;
    let winsB = 0;
    sets.forEach(s => {
      if (s.scoreA > s.scoreB) winsA++;
      else if (s.scoreB > s.scoreA) winsB++;
    });
    
    const winnerId = winsA > winsB ? playerA.id : playerB.id;
    
    db.submitScore(match.id, {
      sets,
      winnerId
    });
    navigate(0);
  };

  const handleConfirmScore = () => {
    db.confirmScore(match.id);
    navigate(0);
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
           {match.divisionId ? `${db.getDivision(match.divisionId)?.name ?? ''} • ${t('common.round')} ${match.round}` : t('common.friendly')}
        </div>
        <div className="flex justify-between items-center max-w-sm mx-auto px-4">
          <div className="flex flex-col items-center w-1/3">
            <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 shadow-sm flex items-center justify-center text-slate-400 font-bold text-2xl mb-2">
              {playerA.avatarUrl ? <img src={playerA.avatarUrl} className="w-full h-full rounded-full" /> : playerA.name.charAt(0)}
            </div>
            <div className="font-bold text-slate-900 text-sm leading-tight">{playerA.name.split(' ')[0]}</div>
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
             <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 shadow-sm flex items-center justify-center text-slate-400 font-bold text-2xl mb-2">
              {playerB.avatarUrl ? <img src={playerB.avatarUrl} className="w-full h-full rounded-full" /> : playerB.name.charAt(0)}
            </div>
            <div className="font-bold text-slate-900 text-sm leading-tight">{playerB.name.split(' ')[0]}</div>
          </div>
        </div>
      </div>
      
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
        
        {/* SCORE DISPLAY */}
        {(match.status === MatchStatus.REPORTED || match.status === MatchStatus.CONFIRMED) && match.score && (
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
            <p className="text-slate-400 text-sm mb-6">{t('common.winner')}: {match.score.winnerId === playerA.id ? playerA.name : playerB.name}</p>
            
            {match.status === MatchStatus.REPORTED && isParticipant && match.score.winnerId !== user.id && (
               <button 
                onClick={handleConfirmScore}
                className="w-full bg-lime-400 text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-lime-300 transition-colors shadow-lg shadow-lime-900/20"
               >
                 {t('match.report.confirm')}
               </button>
            )}
            
            {match.status === MatchStatus.REPORTED && (!isParticipant || match.score.winnerId === user.id) && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 bg-slate-800/50 py-2 rounded-lg">
                    <Clock size={16} />
                    {t('match.report.waiting')}
                </div>
            )}
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
                   
                   {proposals.map(p => {
                       const isMine = p.proposedById === user.id;
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
                                        disabled={isMine}
                                        onClick={() => handleAcceptProposal(p.id, time)}
                                        className={`w-full text-left p-3 rounded-lg border flex justify-between items-center transition-all
                                            ${isMine 
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
                                        {!isMine && <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-1 rounded">{t('match.proposal.confirmBtn')}</span>}
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
                   })}
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
                            disabled={proposalTimes.length === 0}
                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                proposalTimes.length > 0 
                                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' 
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {t('match.logistics.send', {count: proposalTimes.length})}
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