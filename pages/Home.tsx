import React from 'react';
import { Layout } from '../components/Layout';
import { MatchCard } from '../components/MatchCard';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { MatchStatus } from '../types';
import { AlertCircle, Calendar, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const Home: React.FC = () => {
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const { t } = useAppContext();
  
  if (!user) return null;

  const matches = db.getMatchesForUser(user.id);
  
  // Sort: Action required first, then scheduled, then completed
  const sortedMatches = [...matches].sort((a, b) => {
    const scoreA = getStatusPriority(a.status);
    const scoreB = getStatusPriority(b.status);
    return scoreA - scoreB;
  });

  function getStatusPriority(status: MatchStatus) {
    switch (status) {
      case MatchStatus.PROPOSED: return 1;
      case MatchStatus.SCHEDULED: return 2;
      case MatchStatus.PENDING: return 3;
      case MatchStatus.CONFIRMED: return 4;
      default: return 5;
    }
  }

  const upcomingMatches = sortedMatches.filter(m => m.status !== MatchStatus.CONFIRMED && m.status !== MatchStatus.WALKOVER);
  const recentResults = sortedMatches.filter(m => m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.WALKOVER);

  // --- SEASON REGISTRATION LOGIC ---
  const allSeasons = db.getSeasons();
  const upcomingSeasons = allSeasons.filter(s => s.status === 'UPCOMING');
  
  // Check if user is already enrolled in these seasons
  // A naive check: find if any enrollment for user belongs to a division in this season
  const userEnrollments = db.getEnrollmentsForUser(user.id);
  
  const availableSeasons = upcomingSeasons.filter(season => {
      const seasonDivisions = db.getDivisions(season.id);
      const enrolledInSeason = userEnrollments.some(e => 
        seasonDivisions.some(div => div.id === e.divisionId)
      );
      return !enrolledInSeason;
  });

  const handleRegister = (seasonId: string) => {
      const divisions = db.getDivisions(seasonId);
      if (divisions.length === 0) {
          alert("No divisions available for this season yet. Please check back later.");
          return;
      }
      
      // Simple division picker logic (for MVP, pick the first one or ask user)
      const divisionName = divisions.length > 1 
          ? window.prompt(`Choose a division:\n${divisions.map(d => d.name).join(', ')}`, divisions[0].name)
          : divisions[0].name;
          
      if (!divisionName) return;
      
      const targetDiv = divisions.find(d => d.name === divisionName);
      if (targetDiv) {
          db.enrollPlayer(targetDiv.id, user.id);
          alert(`Successfully registered for ${seasonName(seasonId)} - ${targetDiv.name}!`);
          navigate(0); // Refresh to hide the card
      }
  };

  const seasonName = (id: string) => allSeasons.find(s => s.id === id)?.name;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t('home.greeting')}, {user.name.split(' ')[0]} 👋</h1>
        <p className="text-slate-500">{t('home.activeMatches', { count: upcomingMatches.length })}</p>
      </div>

      <div className="space-y-6">
        
        {/* SEASON REGISTRATION ALERT */}
        {availableSeasons.map(season => (
            <div key={season.id} className="bg-slate-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                 <div className="relative z-10 flex justify-between items-center">
                     <div>
                         <div className="flex items-center gap-2 text-lime-400 font-bold text-xs uppercase tracking-wider mb-1">
                             <Calendar size={14} /> {t('home.registrationOpen')}
                         </div>
                         <h3 className="text-lg font-bold">{season.name}</h3>
                         <p className="text-slate-400 text-xs mt-1">
                             {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                         </p>
                     </div>
                     <button 
                        onClick={() => handleRegister(season.id)}
                        className="bg-lime-400 text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-lime-300 transition-colors shadow-lg shadow-lime-900/20 flex items-center gap-1"
                     >
                         {t('home.join')} <ChevronRight size={16} />
                     </button>
                 </div>
            </div>
        ))}

        {/* Action Items */}
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
                playerA={db.getUser(match.playerAId)} 
                playerB={db.getUser(match.playerBId)}
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
                playerA={db.getUser(match.playerAId)} 
                playerB={db.getUser(match.playerBId)}
                currentUserId={user.id}
              />
            ))}
          </section>
        )}
      </div>
    </Layout>
  );
};