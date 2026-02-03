import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { MatchCard } from '../components/MatchCard';
import { db } from '../services/db';
import { authService } from '../services/auth';
import { MatchStatus, MatchType } from '../types';
import { Smile, Plus, X, History, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';

export const Friendlies: React.FC = () => {
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const [showFriendlyModal, setShowFriendlyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  if (!user) return null;

  const matches = db.getMatchesForUser(user.id).filter(m => m.type === MatchType.FRIENDLY);
  const potentialOpponents = db.getUsers().filter(u => u.id !== user.id);

  // Stats
  const completed = matches.filter(m => m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.REPORTED);
  const won = completed.filter(m => m.score?.winnerId === user.id).length;
  const lost = completed.length - won;
  const winRate = completed.length > 0 ? Math.round((won / completed.length) * 100) : 0;

  // Lists
  const upcoming = matches.filter(m => m.status !== MatchStatus.CONFIRMED && m.status !== MatchStatus.REPORTED && m.status !== MatchStatus.WALKOVER);
  const history = matches.filter(m => m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.REPORTED || m.status === MatchStatus.WALKOVER);

  const handleCreateFriendly = (opponentId: string) => {
    const newMatch = db.createFriendlyMatch(user.id, opponentId);
    setShowFriendlyModal(false);
    navigate(`/match/${newMatch.id}`);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
             Friendly Matches
           </h1>
           <p className="text-slate-500 text-sm">Casual play & practice</p>
        </div>
        <button 
           onClick={() => setShowFriendlyModal(true)}
           className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        >
            <Plus size={24} />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3 mb-8">
         <Card className="flex flex-col items-center justify-center py-4 bg-indigo-50 border-indigo-100">
             <div className="text-2xl font-black text-indigo-600">{matches.length}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
         </Card>
         <Card className="flex flex-col items-center justify-center py-4 bg-white">
             <div className="text-2xl font-black text-slate-800">{won}-{lost}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase">W-L</div>
         </Card>
         <Card className="flex flex-col items-center justify-center py-4 bg-white">
             <div className="text-2xl font-black text-slate-800">{winRate}%</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase">Win Rate</div>
         </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-lg p-1 mb-4">
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'upcoming' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          <Calendar size={14} /> Upcoming ({upcoming.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
        >
          <History size={14} /> History ({history.length})
        </button>
      </div>

      <div className="space-y-4">
        {(activeTab === 'upcoming' ? upcoming : history).length > 0 ? (
           (activeTab === 'upcoming' ? upcoming : history).map(match => (
              <MatchCard 
                key={match.id} 
                match={match} 
                playerA={db.getUser(match.playerAId)} 
                playerB={db.getUser(match.playerBId)}
                currentUserId={user.id}
              />
           ))
        ) : (
           <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                 <Smile size={24} />
              </div>
              <p className="text-slate-400 text-sm">No {activeTab} friendlies found.</p>
              {activeTab === 'upcoming' && (
                 <button onClick={() => setShowFriendlyModal(true)} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">
                    Start a friendly match
                 </button>
              )}
           </div>
        )}
      </div>

      {/* New Friendly Modal */}
      {showFriendlyModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-scale-up">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-slate-900">Start a Friendly</h2>
                      <button onClick={() => setShowFriendlyModal(false)} className="text-slate-400 hover:text-slate-800">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <p className="text-sm text-slate-500">Select a player to invite. These matches don't affect your league standing.</p>
                      
                      <div className="max-h-80 overflow-y-auto space-y-2">
                          {potentialOpponents.map(opp => (
                              <button 
                                key={opp.id}
                                onClick={() => handleCreateFriendly(opp.id)}
                                className="w-full flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left group"
                              >
                                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                      {opp.avatarUrl ? <img src={opp.avatarUrl} className="w-full h-full rounded-full" /> : opp.name.charAt(0)}
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-900 group-hover:text-indigo-700">{opp.name}</div>
                                      <div className="text-xs text-slate-400">UTR {opp.utr || '-'}</div>
                                  </div>
                                  <div className="ml-auto text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Plus size={20} />
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </Layout>
  );
};