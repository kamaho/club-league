import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { MatchCard } from '../components/MatchCard';
import { db } from '../services/db';
import { authService } from '../services/auth';
import { MatchStatus, Match, MatchType } from '../types';
import { Globe, User as UserIcon, Smile } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

type MatchFilter = 'open' | 'planned' | 'played' | 'canceled';
type ViewMode = 'mine' | 'all';

export const Matches: React.FC = () => {
  const user = authService.getCurrentUser();
  const [activeTab, setActiveTab] = useState<MatchFilter>('open');
  const [viewMode, setViewMode] = useState<ViewMode>('mine');
  const { t } = useAppContext();

  if (!user) return null;

  // 1. Determine which set of matches to fetch
  let rawMatches: Match[] = [];
  if (viewMode === 'mine') {
    rawMatches = db.getMatchesForUser(user.id);
  } else {
    const enrollments = db.getEnrollmentsForUser(user.id);
    const divisionId = enrollments[0]?.divisionId || 'd1'; 
    rawMatches = db.getMatchesForDivision(divisionId);
  }

  // 2. Filter by Type (Strictly LEAGUE for this page now)
  rawMatches = rawMatches.filter(m => m.type === MatchType.LEAGUE);

  // 3. Filter Logic (Open/Planned/etc)
  const filteredMatches = rawMatches.filter(match => {
    switch (activeTab) {
      case 'open':
        return match.status === MatchStatus.PENDING || match.status === MatchStatus.PROPOSED;
      case 'planned':
        return match.status === MatchStatus.SCHEDULED;
      case 'played':
        return match.status === MatchStatus.REPORTED || match.status === MatchStatus.CONFIRMED || match.status === MatchStatus.DISPUTED;
      case 'canceled':
        return match.status === MatchStatus.WALKOVER;
      default:
        return false;
    }
  });

  const tabs: { id: MatchFilter; label: string; count: number }[] = [
    { 
      id: 'open', 
      label: t('matches.tab.open'), 
      count: rawMatches.filter(m => m.status === MatchStatus.PENDING || m.status === MatchStatus.PROPOSED).length 
    },
    { 
      id: 'planned', 
      label: t('matches.tab.planned'), 
      count: rawMatches.filter(m => m.status === MatchStatus.SCHEDULED).length 
    },
    { 
      id: 'played', 
      label: t('matches.tab.played'), 
      count: rawMatches.filter(m => m.status === MatchStatus.REPORTED || m.status === MatchStatus.CONFIRMED || m.status === MatchStatus.DISPUTED).length 
    },
    { 
      id: 'canceled', 
      label: t('matches.tab.canceled'), 
      count: rawMatches.filter(m => m.status === MatchStatus.WALKOVER).length 
    },
  ];

  return (
    <Layout>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900 mb-1">{t('matches.title')}</h1>
           <p className="text-slate-500 text-sm">{t('matches.subtitle')}</p>
        </div>

        {/* View Toggle */}
        <div className="bg-slate-100 p-1 rounded-lg flex self-start sm:self-auto w-full sm:w-auto">
            <button
                onClick={() => setViewMode('mine')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'mine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <UserIcon size={14} />
                {t('matches.filter.mine')}
            </button>
            <button
                onClick={() => setViewMode('all')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <Globe size={14} />
                {t('matches.filter.all')}
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 mb-6 bg-slate-100 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-2 rounded-md transition-all
              ${activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
          >
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-tight">{tab.label}</span>
            <span className={`text-[10px] font-bold mt-0.5 px-1.5 rounded-full ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
                {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {filteredMatches.length > 0 ? (
          filteredMatches.map(match => (
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
             <div className="text-slate-400 mb-2 font-medium">{t('matches.empty')}</div>
             <p className="text-slate-400 text-xs">
               {t('matches.emptyDesc', { filter: activeTab, view: viewMode === 'mine' ? 'your schedule' : 'this view' })}
             </p>
          </div>
        )}
      </div>

      {/* Link to Friendlies */}
      <div className="mt-8 text-center">
          <Link to="/friendlies" className="inline-flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors">
              <Smile size={16} />
              {t('matches.friendliesLink')}
          </Link>
      </div>
    </Layout>
  );
};