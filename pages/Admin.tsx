import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { db } from '../services/db';
import { authService } from '../services/auth';
import { useQuery } from '../hooks/useQuery';
import { getApiUrl } from '../services/api';
import { Season, User, UserRole } from '../types';
import { 
    Plus, Calendar, Users, Settings, Search, Edit2, 
    ChevronRight, Activity, X, Mail, Phone, Lock, Copy, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type AdminTab = 'overview' | 'seasons' | 'players' | 'settings';

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('seasons');
  const [seasonsData, , refetchSeasons] = useQuery(() => db.getSeasons(), []);
  const [usersData, , refetchUsers] = useQuery(() => db.getUsers(), []);
  const [clubSettingsData] = useQuery(() => db.getClubSettings(), []);
  const seasons = seasonsData ?? [];
  const users = usersData ?? [];
  const clubSettings = clubSettingsData ?? { logoUrl: '' };
  const navigate = useNavigate();

  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonForm, setSeasonForm] = useState<Partial<Season>>({
      name: '',
      startDate: '',
      endDate: '',
      status: 'UPCOMING'
  });
  
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<User | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [settings, setSettings] = useState({
      clubName: 'Metro Tennis Club',
      primaryColor: '#84cc16',
      allowPublicSignup: true,
      autoApprove: false,
      logoUrl: clubSettings.logoUrl || ''
  });

  // --- HANDLERS ---
  
  const openNewSeasonModal = () => {
      setEditingSeason(null);
      setSeasonForm({
          name: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          status: 'UPCOMING'
      });
      setIsSeasonModalOpen(true);
  };

  const openEditSeasonModal = (season: Season) => {
      setEditingSeason(season);
      setSeasonForm({
          name: season.name,
          startDate: season.startDate,
          endDate: season.endDate,
          status: season.status
      });
      setIsSeasonModalOpen(true);
  };

  const handleSaveSeason = async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingSeason) {
        await db.updateSeason(editingSeason.id, seasonForm);
      } else {
        await db.createSeason({ name: seasonForm.name!, startDate: seasonForm.startDate!, endDate: seasonForm.endDate!, status: (seasonForm.status as 'ACTIVE' | 'UPCOMING' | 'COMPLETED') ?? 'UPCOMING' });
      }
      setIsSeasonModalOpen(false);
      refetchSeasons();
  };

  const handleSaveSettings = async () => {
      await db.updateClubSettings({ logoUrl: settings.logoUrl });
      alert('Settings saved!');
  };

  const clubId = authService.getCurrentUser()?.clubId ?? users[0]?.clubId ?? 'club-1';
  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}#/signup?club=${clubId}`
    : '';

  const handleCopyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    });
  };

  const handleResetPassword = async () => {
    if (!selectedPlayer?.email) return;
    const base = getApiUrl();
    if (!base) {
      alert('Password reset is available when using the API.');
      return;
    }
    try {
      await fetch(`${base.replace(/\/$/, '')}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedPlayer.email }),
      });
      alert(`If they have an account, reset instructions will be sent to ${selectedPlayer.email}`);
    } catch {
      alert('Failed to send reset. Try again.');
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    await db.updateUser(editingPlayer.id, {
      name: editingPlayer.name,
      email: editingPlayer.email,
      phone: editingPlayer.phone,
    });
    await refetchUsers();
    setEditingPlayer(null);
    const updated = users.find(u => u.id === editingPlayer.id);
    if (updated) setSelectedPlayer({ ...updated, name: editingPlayer.name, email: editingPlayer.email, phone: editingPlayer.phone });
  };

  const handleDeactivatePlayer = async () => {
    if (!selectedPlayer) return;
    if (!window.confirm(`Deactivate ${selectedPlayer.name}? They will no longer be able to log in. This cannot be undone.`)) return;
    try {
      await db.deleteUser(selectedPlayer.id);
      await refetchUsers();
      setSelectedPlayer(null);
    } catch {
      alert('Failed to deactivate. Try again.');
    }
  };

  // --- SUB-COMPONENTS ---

  const SidebarItem = ({ id, label, icon: Icon }: { id: AdminTab, label: string, icon: any }) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
            activeTab === id 
            ? 'bg-slate-900 text-white shadow-md' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
          <Icon size={18} />
          {label}
      </button>
  );

  const SeasonList = () => {
    const [divisionsBySeason, setDivisionsBySeason] = React.useState<Record<string, { id: string; seasonId: string; name: string }[]>>({});
    const [playerCountByDiv, setPlayerCountByDiv] = React.useState<Record<string, number>>({});
    React.useEffect(() => {
      if (!seasons.length) return;
      (async () => {
        const divs: Record<string, { id: string; seasonId: string; name: string }[]> = {};
        for (const s of seasons) {
          divs[s.id] = await db.getDivisions(s.id);
        }
        setDivisionsBySeason(divs);
        const counts: Record<string, number> = {};
        for (const arr of Object.values(divs)) {
          for (const d of arr) {
            const enrollments = await db.getEnrollments(d.id);
            counts[d.id] = enrollments.length;
          }
        }
        setPlayerCountByDiv(counts);
      })();
    }, [seasons.map(s => s.id).join(',')]);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Seasons & Ladders</h2>
          <button type="button" onClick={openNewSeasonModal} className="bg-lime-400 text-slate-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-lime-300 flex items-center gap-2 shadow-sm">
            <Plus size={16} /> New Season
          </button>
        </div>
        <div className="grid gap-4">
          {seasons.map(season => {
            const divisions = divisionsBySeason[season.id] ?? [];
            const isActive = season.status === 'ACTIVE';
            return (
              <div key={season.id} className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${isActive ? 'border-lime-500 ring-1 ring-lime-500' : 'border-slate-200'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-900">{season.name}</h3>
                      {isActive && <span className="text-[10px] bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Active</span>}
                      {season.status === 'COMPLETED' && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Finished</span>}
                    </div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <button type="button" onClick={() => openEditSeasonModal(season)} className="text-slate-400 hover:text-slate-700">
                    <Edit2 size={20} />
                  </button>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Divisions</div>
                  {divisions.map(div => (
                    <button key={div.id} type="button" onClick={() => navigate(`/admin/divisions/${div.id}`)} className="w-full flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-sm hover:border-lime-400 hover:shadow-sm transition-all group">
                      <span className="font-bold text-slate-700 group-hover:text-slate-900">{div.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Users size={12} /> {playerCountByDiv[div.id] ?? 0}
                        </span>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-lime-500" />
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={async () => {
                      const name = prompt('Enter new division name:');
                      if (name) {
                        await db.createDivision(season.id, name);
                        refetchSeasons();
                      }
                    }}
                    className="w-full py-2 text-xs font-bold text-slate-500 border border-dashed border-slate-300 rounded hover:bg-slate-100 transition-colors"
                  >
                    + Add Division
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const PlayerManager = () => (
      <div>
          <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Player Directory</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search players..." 
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lime-400"
                      />
                  </div>
                  <button
                      type="button"
                      onClick={() => setShowInviteModal(true)}
                      className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 flex items-center justify-center gap-2"
                  >
                      <Plus size={16} /> Invite
                  </button>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
             {users.map(u => (
                 <div 
                   key={u.id} 
                   onClick={() => setSelectedPlayer(u)}
                   className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-lime-400 hover:shadow-md transition-all"
                 >
                     <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                             {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full rounded-full" /> : u.name.charAt(0)}
                         </div>
                         <div>
                             <div className="font-bold text-sm text-slate-900">{u.name}</div>
                             <div className="text-xs text-slate-400">{u.email}</div>
                         </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                            {u.role === UserRole.ADMIN ? 'Admin' : 'Player'}
                        </span>
                        <ChevronRight size={16} className="text-slate-300" />
                     </div>
                 </div>
             ))}
          </div>
      </div>
  );

  const SettingsPanel = () => (
      <div className="max-w-xl">
           <h2 className="text-xl font-bold text-slate-800 mb-6">Club Settings</h2>
           
           <Card className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Club Name</label>
                    <input 
                        type="text" 
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-lime-400 outline-none"
                        value={settings.clubName}
                        onChange={(e) => setSettings({...settings, clubName: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Club Logo URL</label>
                    <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {settings.logoUrl ? (
                                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-xs text-slate-400 font-bold">No Logo</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <input 
                                type="text" 
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-lime-400 outline-none text-sm mb-2"
                                placeholder="https://example.com/logo.png"
                                value={settings.logoUrl}
                                onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                            />
                            <p className="text-xs text-slate-400">Enter a direct link to your logo image.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Branding Color</label>
                    <div className="flex gap-3">
                        <input 
                            type="color" 
                            className="h-10 w-20 rounded cursor-pointer"
                            value={settings.primaryColor}
                            onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                        />
                        <div className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm font-mono flex items-center">
                            {settings.primaryColor}
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Public Signup</div>
                            <div className="text-xs text-slate-500">Allow users to register without invite</div>
                        </div>
                        <div 
                            onClick={() => setSettings({...settings, allowPublicSignup: !settings.allowPublicSignup})}
                            className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${settings.allowPublicSignup ? 'bg-lime-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.allowPublicSignup ? 'left-7' : 'left-1'}`} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-bold text-slate-800 text-sm">Auto-Approve Players</div>
                            <div className="text-xs text-slate-500">New signups bypass admin review</div>
                        </div>
                        <div 
                            onClick={() => setSettings({...settings, autoApprove: !settings.autoApprove})}
                            className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${settings.autoApprove ? 'bg-lime-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoApprove ? 'left-7' : 'left-1'}`} />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        onClick={handleSaveSettings}
                        className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800"
                    >
                        Save Changes
                    </button>
                </div>
           </Card>
      </div>
  );

  // --- LAYOUT ---

  return (
    <Layout>
      <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
              <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm space-y-1">
                  <div className="px-4 py-3 mb-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admin Panel</div>
                  </div>
                  <SidebarItem id="seasons" label="Seasons" icon={Calendar} />
                  <SidebarItem id="players" label="Players" icon={Users} />
                  <SidebarItem id="overview" label="Activity Log" icon={Activity} />
                  <div className="h-px bg-slate-100 my-2"></div>
                  <SidebarItem id="settings" label="Settings" icon={Settings} />
              </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
              {activeTab === 'seasons' && <SeasonList />}
              {activeTab === 'players' && <PlayerManager />}
              {activeTab === 'settings' && <SettingsPanel />}
              {activeTab === 'overview' && (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                      <Activity className="mx-auto text-slate-300 mb-3" size={32} />
                      <p className="text-slate-500">System activity log is empty.</p>
                  </div>
              )}
          </div>
      </div>

      {/* --- SEASON MODAL --- */}
      {isSeasonModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-slate-900">
                          {editingSeason ? 'Edit Season' : 'New Season'}
                      </h2>
                      <button onClick={() => setIsSeasonModalOpen(false)} className="text-slate-400 hover:text-slate-800">
                          <X size={24} />
                      </button>
                  </div>

                  <form onSubmit={handleSaveSeason} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Season Name</label>
                          <input 
                              type="text"
                              required
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400"
                              placeholder="e.g. Summer 2024"
                              value={seasonForm.name}
                              onChange={(e) => setSeasonForm({...seasonForm, name: e.target.value})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                              <input 
                                  type="date"
                                  required
                                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400"
                                  value={seasonForm.startDate}
                                  onChange={(e) => setSeasonForm({...seasonForm, startDate: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                              <input 
                                  type="date"
                                  required
                                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400"
                                  value={seasonForm.endDate}
                                  onChange={(e) => setSeasonForm({...seasonForm, endDate: e.target.value})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                          <select 
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 bg-white"
                              value={seasonForm.status}
                              onChange={(e) => setSeasonForm({...seasonForm, status: e.target.value as any})}
                          >
                              <option value="UPCOMING">Upcoming</option>
                              <option value="ACTIVE">Active</option>
                              <option value="COMPLETED">Completed</option>
                          </select>
                      </div>

                      <div className="pt-4 flex gap-3">
                          <button 
                              type="button"
                              onClick={() => setIsSeasonModalOpen(false)}
                              className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg"
                          >
                              Save Season
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- PLAYER DETAIL MODAL --- */}
      {selectedPlayer && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                  <div className="flex justify-end mb-2">
                       <button onClick={() => setSelectedPlayer(null)} className="text-slate-400 hover:text-slate-800">
                          <X size={24} />
                       </button>
                  </div>
                  
                  <div className="text-center mb-6">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl font-bold text-slate-500 mx-auto mb-3">
                            {selectedPlayer.avatarUrl ? <img src={selectedPlayer.avatarUrl} className="w-full h-full rounded-full" /> : selectedPlayer.name.charAt(0)}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{selectedPlayer.name}</h2>
                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedPlayer.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                            {selectedPlayer.role}
                        </span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Mail size={16} className="text-slate-400" />
                          <span className="text-sm text-slate-600">{selectedPlayer.email}</span>
                      </div>
                       <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Phone size={16} className="text-slate-400" />
                          <span className="text-sm text-slate-600">{selectedPlayer.phone || 'No phone'}</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <button
                          type="button"
                          onClick={handleResetPassword}
                          className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                          <Lock size={16} /> Reset Pass
                      </button>
                      <button
                          type="button"
                          onClick={() => setEditingPlayer(selectedPlayer)}
                          className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                           <Edit2 size={16} /> Edit
                      </button>
                      <button
                          type="button"
                          onClick={handleDeactivatePlayer}
                          className="col-span-2 flex items-center justify-center gap-2 py-3 bg-white border border-red-200 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50"
                      >
                          Deactivate Account
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- INVITE MODAL --- */}
      {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-slate-900">Invite players</h2>
                      <button onClick={() => { setShowInviteModal(false); setInviteLinkCopied(false); }} className="text-slate-400 hover:text-slate-800">
                          <X size={24} />
                      </button>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">Share this link so new players can sign up for your club.</p>
                  <div className="flex gap-2">
                      <input readOnly value={inviteLink} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
                      <button
                          type="button"
                          onClick={handleCopyInviteLink}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800"
                      >
                          {inviteLinkCopied ? <Check size={16} /> : <Copy size={16} />}
                          {inviteLinkCopied ? 'Copied' : 'Copy'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- EDIT PLAYER MODAL --- */}
      {editingPlayer && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-slate-900">Edit player</h2>
                      <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-slate-800">
                          <X size={24} />
                      </button>
                  </div>
                  <form onSubmit={handleSavePlayer} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                          <input
                              type="text"
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-lime-400 outline-none"
                              value={editingPlayer.name}
                              onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                          <input
                              type="email"
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-lime-400 outline-none"
                              value={editingPlayer.email}
                              onChange={(e) => setEditingPlayer({ ...editingPlayer, email: e.target.value })}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                          <input
                              type="tel"
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-lime-400 outline-none"
                              value={editingPlayer.phone ?? ''}
                              onChange={(e) => setEditingPlayer({ ...editingPlayer, phone: e.target.value || undefined })}
                          />
                      </div>
                      <div className="flex gap-3 pt-2">
                          <button type="button" onClick={() => setEditingPlayer(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">
                              Cancel
                          </button>
                          <button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">
                              Save
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </Layout>
  );
};