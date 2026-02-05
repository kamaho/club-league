import React from 'react';
import { Match, User, MatchStatus, MatchType } from '../types';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Calendar, CheckCircle, Clock, AlertCircle, ArrowRight, Smile } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { useAppContext } from '../context/AppContext';

interface MatchCardProps {
  match: Match;
  playerA?: User;
  playerB?: User;
  currentUserId?: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, playerA, playerB, currentUserId }) => {
  const { t, language } = useAppContext();
  const [proposals] = useQuery(() => db.getProposals(match.id), [match.id]);
  const proposalList = proposals ?? [];

  if (!playerA || !playerB) return null;

  const isParticipant = currentUserId === playerA.id || currentUserId === playerB.id;
  const isFriendly = match.type === MatchType.FRIENDLY;

  let isActionRequired = false;
  let isWaiting = false;

  if (match.status === MatchStatus.PROPOSED && isParticipant) {
    const lastProposal = proposalList[proposalList.length - 1];
    if (lastProposal) {
      if (lastProposal.proposedById !== currentUserId) {
        isActionRequired = true;
      } else {
        isWaiting = true;
      }
    }
  }

  // Friendly pending: I invited, waiting for opponent to accept
  const isFriendlyPendingMine = isFriendly && match.status === MatchStatus.PENDING && match.playerAId === currentUserId;

  const getStatusConfig = (status: MatchStatus) => {
    if (isActionRequired) {
        return { color: 'text-white bg-amber-500 border-amber-600', icon: <AlertCircle size={14} />, label: t('status.actionRequired') };
    }
    if (isWaiting) {
        return { color: 'text-slate-600 bg-slate-100 border-slate-200', icon: <Clock size={14} />, label: t('status.proposalSent') };
    }
    if (isFriendlyPendingMine) {
        return { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Clock size={14} />, label: t('status.waitingForResponse') };
    }

    switch (status) {
      case MatchStatus.CONFIRMED: return { color: 'text-green-600 bg-green-50 border-green-100', icon: <CheckCircle size={14} />, label: t('status.confirmed') };
      case MatchStatus.SCHEDULED: return { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Calendar size={14} />, label: t('status.scheduled') };
      case MatchStatus.PROPOSED: return { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Clock size={14} />, label: t('status.proposed') };
      case MatchStatus.DISPUTED: return { color: 'text-red-600 bg-red-50 border-red-100', icon: <AlertCircle size={14} />, label: t('status.disputed') };
      case MatchStatus.PENDING: return { color: 'text-slate-500 bg-slate-50 border-slate-100', icon: <Clock size={14} />, label: t('status.pending') };
      case MatchStatus.WALKOVER: return { color: 'text-slate-400 bg-slate-50 border-slate-200', icon: <AlertCircle size={14} />, label: t('status.walkover') };
      default: return { color: 'text-slate-500 bg-slate-50 border-slate-100', icon: <Clock size={14} />, label: status };
    }
  };

  const config = getStatusConfig(match.status);

  // Date formatting based on locale
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (language === 'no') {
      return format(date, 'd. MMM, HH:mm', { locale: nb });
    }
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <Link to={`/match/${match.id}`} className="block">
      <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-4 mb-3 relative overflow-hidden ${isActionRequired ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'}`}>
        
        {/* Highlight strip for action required */}
        {isActionRequired && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>}

        <div className="flex justify-between items-center mb-4">
          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center gap-1 border ${config.color}`}>
            {config.icon}
            {config.label}
          </span>
          {isFriendly ? (
             <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                <Smile size={12} /> Friendly
             </span>
          ) : (
             <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{t('common.round')} {match.round}</span>
          )}
        </div>

        <div className="flex justify-between items-center px-1">
          <div className="flex flex-col items-start w-24">
            <div className={`font-bold text-sm truncate w-full ${match.score?.winnerId === playerA.id ? 'text-slate-900' : 'text-slate-600'}`}>
              {playerA.name.split(' ')[0]}
            </div>
            <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded mt-1">UTR {playerA.utr || '-'}</div>
          </div>
          
          <div className="flex-1 px-2 text-center">
            {match.score ? (
              <div className="flex flex-col items-center">
                  <div className="flex gap-1 text-sm font-mono font-black text-slate-800">
                    {match.score.sets.map((set, idx) => (
                      <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {set.scoreA}-{set.scoreB}
                      </span>
                    ))}
                  </div>
              </div>
            ) : (
               <div className="text-xs font-black text-slate-300 bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center mx-auto">VS</div>
            )}
          </div>

          <div className="flex flex-col items-end w-24">
            <div className={`font-bold text-sm truncate w-full text-right ${match.score?.winnerId === playerB.id ? 'text-slate-900' : 'text-slate-600'}`}>
              {playerB.name.split(' ')[0]}
            </div>
            <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded mt-1">UTR {playerB.utr || '-'}</div>
          </div>
        </div>
        
        {match.scheduledAt && !match.score && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
             <div className="flex items-center gap-2 text-lime-700 font-medium">
                <Calendar size={14} />
                {formatDate(match.scheduledAt)}
             </div>
          </div>
        )}

        {isActionRequired && (
            <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between">
               <span className="text-xs font-bold text-amber-700">Review Proposal</span>
               <ArrowRight size={14} className="text-amber-600" />
            </div>
        )}
      </div>
    </Link>
  );
};