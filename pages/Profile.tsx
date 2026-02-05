import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { calculateStandings } from '../utils/standings';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Mail, Phone, Trash2, Save, Calendar, PauseCircle, XCircle, RotateCcw, TrendingUp, Settings, Trophy, Smile, HelpCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { User as UserType, MatchType } from '../types';
import { useAppContext } from '../context/AppContext';
import { AvailabilitySelector } from '../components/AvailabilitySelector';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const { t, language, setLanguage } = useAppContext();
  
  // Tabs: 'stats' | 'settings'
  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');
  
  // "Committed" state (what is in DB)
  const [user, setUser] = useState<UserType | undefined>(currentUser);
  
  // "Draft" state (what is being edited)
  const [editForm, setEditForm] = useState<UserType>(currentUser || {} as any);

  // Sync editForm if user reloads or changes (mostly for safety)
  useEffect(() => {
    if (currentUser) {
       setUser(currentUser);
       setEditForm(currentUser);
    }
  }, [currentUser?.id]); // Only re-sync if ID changes (e.g. relogin)

  const [allMatchesData] = useQuery(() => user ? db.getMatchesForUser(user.id) : Promise.resolve([]), [user?.id]);
  const [enrollmentsData, , refetchEnrollments] = useQuery(() => user ? db.getEnrollmentsForUser(user.id) : Promise.resolve([]), [user?.id]);
  const allMatches = allMatchesData ?? [];
  const enrollments = enrollmentsData ?? [];
  const currentDivisionId = enrollments[0]?.divisionId;

  const [divisionData] = useQuery(() => currentDivisionId ? db.getDivision(currentDivisionId) : Promise.resolve(undefined), [currentDivisionId]);
  const [divisionPlayersData] = useQuery(() => currentDivisionId ? db.getPlayersInDivision(currentDivisionId) : Promise.resolve([]), [currentDivisionId]);
  const [divisionMatchesData] = useQuery(() => currentDivisionId ? db.getMatchesForDivision(currentDivisionId) : Promise.resolve([]), [currentDivisionId]);
  const [seasonsData] = useQuery(() => db.getSeasons(), []);
  const [usersData] = useQuery(() => db.getUsers(), []);
  const seasons = seasonsData ?? [];
  const seasonIds = seasons.map(s => s.id).join(',');
  const [allDivisionsData] = useQuery(
    () => (seasons.length ? Promise.all(seasons.map(s => db.getDivisions(s.id))).then(arr => arr.flat()) : Promise.resolve([])),
    [seasonIds]
  );
  const allDivisions = allDivisionsData ?? [];

  const division = divisionData ?? undefined;
  const divisionPlayers = divisionPlayersData ?? [];
  const divisionMatches = divisionMatchesData ?? [];
  const users = usersData ?? [];
  const getDivision = (divisionId: string) => allDivisions.find(d => d.id === divisionId);
  const getSeasonForMatch = (match: { divisionId?: string }) => {
    const div = match.divisionId ? getDivision(match.divisionId) : undefined;
    return div ? seasons.find(s => s.id === div.seasonId) : undefined;
  };

  const standings = calculateStandings(divisionMatches, divisionPlayers);
  const rank = user ? standings.findIndex(s => s.playerId === user.id) + 1 : 0;

  const leagueMatches = allMatches.filter(m => m.type !== MatchType.FRIENDLY);
  const friendlyMatches = allMatches.filter(m => m.type === MatchType.FRIENDLY);

  const calculateStats = (matchList: typeof allMatches) => {
    if (!user) return { completed: [] as typeof allMatches, won: 0, lost: 0, winRate: 0 };
    const completed = matchList.filter(m => m.status === 'CONFIRMED' || m.status === 'WALKOVER');
    const won = completed.filter(m => m.score?.winnerId === user.id).length;
    const lost = completed.length - won;
    const winRate = completed.length > 0 ? Math.round((won / completed.length) * 100) : 0;
    return { completed, won, lost, winRate };
  };

  const leagueStats = calculateStats(leagueMatches);
  const friendlyStats = calculateStats(friendlyMatches);

  if (!user) return null;

  // Development curve: no fake history. New users see empty state until they have completed matches.
  const hasAnyCompletedMatches = leagueMatches.some(m => m.status === 'CONFIRMED' || m.status === 'WALKOVER') ||
    friendlyMatches.some(m => m.status === 'CONFIRMED' || m.status === 'REPORTED');
  const developmentData = hasAnyCompletedMatches
    ? [
        { date: language === 'no' ? 'Start' : 'Start', utr: user.utr || 1 },
        { date: language === 'no' ? 'Nå' : 'Now', utr: user.utr || 1 },
      ]
    : [];

  // --- SETTINGS LOGIC ---

  // Determine if there are unsaved changes
  const hasChanges = JSON.stringify(user) !== JSON.stringify(editForm);

  const handleSave = async () => {
    const updated = await db.updateUser(user.id, editForm);
    setUser({ ...updated } as UserType);
    setEditForm({ ...updated } as UserType);
  };

  const handleCancel = () => {
    setEditForm({ ...user } as UserType);
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      await db.deleteUser(user.id);
      authService.logout();
      navigate('/login');
    }
  };

  const handleCancelSeason = async () => {
    if (!currentDivisionId) return;
    if (!window.confirm("Are you sure you want to withdraw from the current season? Matches will be marked as walkovers.")) return;
    try {
      await db.removePlayerFromDivision(currentDivisionId, user.id);
      await refetchEnrollments();
    } catch {
      alert("Could not withdraw. Please try again.");
    }
  };

  return (
    <Layout>
      {/* Tab Switcher */}
      <div className="flex bg-white rounded-xl p-1 mb-6 border border-slate-200 shadow-sm">
         <button 
           onClick={() => setActiveTab('stats')}
           className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
         >
            <TrendingUp size={16} /> {t('profile.tab.stats')}
         </button>
         <button 
           onClick={() => setActiveTab('settings')}
           className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
         >
            <Settings size={16} /> {t('profile.tab.settings')}
         </button>
      </div>

      {activeTab === 'stats' ? (
          /* --- PERFORMANCE DASHBOARD --- */
          <div className="space-y-6">
              
              {/* Player Card */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                 
                 <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-xl font-bold overflow-hidden">
                        {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{user.name}</h2>
                        <p className="text-slate-400 text-sm">
                            {division?.name || 'No Division'} • <span className="text-lime-400 font-bold">Rank #{rank > 0 ? rank : '-'}</span>
                        </p>
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
                    <div className="text-center">
                        <Link to="/rating-info" className="flex items-center justify-center gap-1 hover:text-lime-400 transition-colors">
                           <div className="text-2xl font-black text-lime-400">{user.utr || '-'}</div>
                           <HelpCircle size={12} className="text-slate-500 mb-2" />
                        </Link>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('profile.stats.rating')}</div>
                    </div>
                    <div className="text-center border-l border-slate-800">
                        <div className="text-2xl font-black">{leagueStats.winRate}%</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('profile.stats.winRate')}</div>
                    </div>
                    <div className="text-center border-l border-slate-800">
                        <div className="text-2xl font-black">{leagueStats.won}-{leagueStats.lost}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('profile.stats.record')}</div>
                    </div>
                 </div>
              </div>

              {/* Friendly Stats */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-4">
                     <div className="bg-white p-2 rounded-full text-indigo-500 shadow-sm">
                        <Smile size={20} />
                     </div>
                     <div>
                        <div className="text-sm font-bold text-slate-900">Friendlies</div>
                        <div className="text-xs text-slate-500">{friendlyStats.won}W - {friendlyStats.lost}L ({friendlyStats.winRate}%)</div>
                     </div>
                 </div>
                 <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-4">
                     <div className="bg-white p-2 rounded-full text-amber-500 shadow-sm">
                        <Trophy size={20} />
                     </div>
                     <div>
                        <div className="text-sm font-bold text-slate-900">League</div>
                        <div className="text-xs text-slate-500">{leagueStats.won}W - {leagueStats.lost}L ({leagueStats.winRate}%)</div>
                     </div>
                 </div>
              </div>

              {/* UTR Chart – only show when user has data; new users see current rating only */}
              <Card title={language === 'no' ? 'Utviklingskurve' : 'Development Curve'}>
                {developmentData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm px-4 text-center">
                    {language === 'no' ? 'Ingen data ennå. Spill kamper for å se utvikling.' : 'No data yet. Play matches to see your development.'}
                  </div>
                ) : (
                  <div className="h-48 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={developmentData}>
                        <XAxis dataKey="date" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis domain={[Math.max(0, (user.utr || 1) - 1), (user.utr || 1) + 1]} hide />
                        <Tooltip />
                        <Line type="monotone" dataKey="utr" stroke="#84cc16" strokeWidth={3} dot={{r: 4, fill: '#84cc16'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
              
              {/* Match History List */}
              <div className="space-y-3">
                 <h3 className="font-bold text-slate-800 px-1">Recent Matches</h3>
                 {allMatches.filter(m => m.status === 'CONFIRMED' || m.status === 'WALKOVER').slice().reverse().map(match => {
                     const isWin = match.score?.winnerId === user.id;
                     const opponentId = match.playerAId === user.id ? match.playerBId : match.playerAId;
                     const opponent = users.find(u => u.id === opponentId);
                     const season = getSeasonForMatch(match);

                     return (
                         <div key={match.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <div className={`w-1 h-10 rounded-full ${isWin ? 'bg-lime-500' : 'bg-red-400'}`}></div>
                                 <div>
                                     <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                         {isWin ? <span className="text-lime-600">W</span> : <span className="text-red-500">L</span>}
                                         <span className="text-slate-300">vs</span> 
                                         {opponent?.name}
                                     </div>
                                     <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                         {match.type === MatchType.FRIENDLY ? (
                                             <span className="text-indigo-400 font-bold bg-indigo-50 px-1 rounded">Friendly</span>
                                         ) : (
                                            <span>{season?.name || 'League Match'}</span>
                                         )}
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="text-right">
                                 <div className="font-mono font-bold text-slate-800 text-sm">
                                     {match.score?.sets.map(s => {
                                         // Always show MyScore-OpponentScore
                                         const myScore = match.playerAId === user.id ? s.scoreA : s.scoreB;
                                         const oppScore = match.playerAId === user.id ? s.scoreB : s.scoreA;
                                         return `${myScore}-${oppScore}`;
                                     }).join(' ')}
                                 </div>
                                 <div className="text-[10px] text-slate-400 mt-0.5">
                                     {match.scheduledAt ? new Date(match.scheduledAt).toLocaleDateString() : 'Unknown date'}
                                 </div>
                             </div>
                         </div>
                     );
                 })}
                 {allMatches.length === 0 && (
                     <div className="text-center p-8 text-slate-400 bg-white rounded-xl border border-dashed">
                         No matches played yet.
                     </div>
                 )}
              </div>
          </div>
      ) : (
          /* --- SETTINGS TAB --- */
          <div className="space-y-6 pb-20">
              {/* Header Profile Section (Small) */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
                <div className="relative group cursor-pointer">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-xl font-bold text-slate-500 overflow-hidden">
                        {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                    </div>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">{user.name}</h1>
                    <p className="text-slate-500 text-xs">{user.email}</p>
                </div>
              </div>

              {/* Language Selector */}
              <Card title={t('profile.language')}>
                  <div className="flex gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setLanguage('en')}
                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                            language === 'en'
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                          🇬🇧 English
                      </button>
                      <button
                        onClick={() => setLanguage('no')}
                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                            language === 'no'
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                          🇳🇴 Norsk
                      </button>
                  </div>
              </Card>

              {/* Match Preferences */}
              <Card title={t('profile.section.preferences')}>
                <div className="space-y-5">
                    
                    {/* Frequency */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Match Frequency</label>
                        <div className="relative">
                            <select 
                            className="w-full p-3 pl-10 border border-slate-200 rounded-lg text-sm bg-slate-50 appearance-none focus:ring-2 focus:ring-lime-400 outline-none transition-all"
                            value={editForm.preferences?.matchFrequency || '1_per_2_weeks'}
                            onChange={(e) => setEditForm({
                                ...editForm,
                                preferences: { 
                                    ...editForm.preferences!, 
                                    matchFrequency: e.target.value as any
                                }
                            })}
                            >
                            <option value="1_per_2_weeks">{t('profile.freq.1_per_2')}</option>
                            <option value="2_per_2_weeks">{t('profile.freq.2_per_2')}</option>
                            <option value="1_per_4_weeks">{t('profile.freq.1_per_4')}</option>
                            <option value="3_per_4_weeks">{t('profile.freq.3_per_4')}</option>
                            </select>
                            <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                        </div>
                    </div>

                    {/* Opponent Preference */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Preferred Opponent</label>
                        <div className="flex gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                            {['female', 'male', 'both'].map((opt) => {
                            const isSelected = (editForm.preferences?.opponentGender || 'both') === opt;
                            let label = '';
                            if (opt === 'female') label = t('profile.gender.female');
                            else if (opt === 'male') label = t('profile.gender.male');
                            else label = t('profile.gender.both');
                            
                            return (
                                <button
                                    key={opt}
                                    onClick={() => setEditForm({
                                        ...editForm,
                                        preferences: { ...editForm.preferences!, opponentGender: opt as any }
                                    })}
                                    className={`flex-1 py-2 rounded-md text-xs font-bold capitalize transition-all ${
                                        isSelected
                                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                            })}
                        </div>
                    </div>
                </div>
              </Card>

              {/* Availability Grid */}
              <Card title={t('profile.section.availability')}>
                <p className="text-xs text-slate-500 mb-4">{t('profile.tapToToggle')}</p>
                <AvailabilitySelector 
                    availability={editForm.preferences?.availability || {}}
                    onChange={(newAvail) => setEditForm({
                        ...editForm,
                        preferences: { ...editForm.preferences!, availability: newAvail }
                    })}
                />
              </Card>

              {/* Season Management */}
              <Card title={t('profile.section.status')}>
                    <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                            <PauseCircle className="text-amber-500" />
                            <div>
                                <div className="text-sm font-bold text-slate-800">{t('profile.skipRound')}</div>
                                <div className="text-xs text-slate-500">{t('profile.skipRoundDesc')}</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setEditForm({
                                ...editForm,
                                preferences: { ...editForm.preferences!, skipNextRound: !editForm.preferences?.skipNextRound }
                            })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${
                                editForm.preferences?.skipNextRound ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                                editForm.preferences?.skipNextRound ? 'left-7' : 'left-1'
                                }`} />
                        </button>
                    </div>

                    <button 
                        onClick={handleCancelSeason}
                        className="w-full flex items-center gap-3 p-3 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-colors group text-left"
                    >
                        <XCircle className="text-red-500 group-hover:text-red-600" />
                        <div>
                            <div className="text-sm font-bold text-red-600">{t('profile.withdraw')}</div>
                            <div className="text-xs text-red-400">{t('profile.withdrawDesc')}</div>
                        </div>
                    </button>
                    </div>
              </Card>

              {/* Basic Personal Information */}
              <Card title={t('profile.section.contact')}>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                            <Mail size={16} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-slate-400 font-medium uppercase mb-0.5">Email</div>
                            <input 
                                type="email" 
                                className="w-full text-sm border-b border-slate-200 focus:border-lime-400 outline-none py-1 bg-transparent transition-colors placeholder-slate-300"
                                value={editForm.email}
                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                placeholder="Enter email"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                            <Phone size={16} />
                        </div>
                        <div className="flex-1">
                            <div className="text-xs text-slate-400 font-medium uppercase mb-0.5">Phone</div>
                            <input 
                                type="tel" 
                                className="w-full text-sm border-b border-slate-200 focus:border-lime-400 outline-none py-1 bg-transparent transition-colors placeholder-slate-300"
                                value={editForm.phone || ''}
                                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                    </div>
                </div>
              </Card>

              {/* Danger Zone */}
              <div className="mt-8 pt-6 border-t border-slate-200 pb-8">
                    <button 
                        onClick={handleDeleteAccount}
                        className="w-full bg-white border border-red-200 text-red-600 py-3 rounded-lg font-medium hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Trash2 size={18} />
                        {t('profile.deleteAccount')}
                    </button>
              </div>

              {/* UNSAVED CHANGES FLOATING BAR */}
              {hasChanges && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 shadow-2xl z-50 animate-slide-up pb-safe">
                        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                            <span className="text-white font-medium text-sm hidden sm:inline">{t('profile.unsaved')}</span>
                            <div className="flex gap-3 w-full sm:w-auto">
                                <button 
                                    onClick={handleCancel}
                                    className="flex-1 sm:flex-none px-4 py-3 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={16} /> {t('profile.reset')}
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="flex-1 sm:flex-none px-6 py-3 bg-lime-400 text-slate-900 rounded-lg font-bold text-sm hover:bg-lime-300 transition-colors shadow-lg shadow-lime-900/20 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> {t('profile.save')}
                                </button>
                            </div>
                        </div>
                    </div>
              )}
          </div>
      )}
    </Layout>
  );
};