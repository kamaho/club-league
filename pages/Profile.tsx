import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { Mail, Phone, Trash2, Save, Calendar, PauseCircle, XCircle, RotateCcw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User as UserType } from '../types';
import { useAppContext } from '../context/AppContext';
import { AvailabilitySelector } from '../components/AvailabilitySelector';
import { TennisAvatar } from '../components/TennisAvatar';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const { t, language, setLanguage } = useAppContext();

  const [user, setUser] = useState<UserType | undefined>(currentUser);
  const [editForm, setEditForm] = useState<UserType>(currentUser || {} as any);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      setEditForm(currentUser);
    }
  }, [currentUser?.id]);

  const [enrollmentsData, , refetchEnrollments] = useQuery(
    () => (user ? db.getEnrollmentsForUser(user.id) : Promise.resolve([])),
    [user?.id]
  );
  const enrollments = enrollmentsData ?? [];
  const currentDivisionId = enrollments[0]?.divisionId;

  if (!user) return null;

  const hasChanges = JSON.stringify(user) !== JSON.stringify(editForm);

  const handleSave = async () => {
    const updated = await db.updateUser(user.id, editForm);
    setUser({ ...updated } as UserType);
    setEditForm({ ...updated } as UserType);
  };

  const handleCancel = () => {
    setEditForm({ ...user } as UserType);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteAccountConfirm = async () => {
    setShowDeleteConfirm(false);
    await db.deleteUser(user.id);
    authService.logout();
    navigate('/login');
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
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
      <div className="space-y-6 pb-20">
              {/* Header Profile Section (Small) */}
              <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
                <div className="relative group cursor-pointer">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
                        {user && <TennisAvatar user={user} size={48} />}
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

              {/* Logout – tydelig hovedknapp nederst */}
              <div className="mt-8 pt-6 border-t border-slate-200 pt-8 pb-4">
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors shadow-lg"
                    >
                        <LogOut size={20} />
                        {t('nav.logout')}
                    </button>
              </div>

              {/* Danger zone – lite synlig, krever bekreftelse */}
              <div className="pt-2 pb-8">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{t('profile.dangerZone')}</p>
                    <button 
                        onClick={handleDeleteAccount}
                        className="text-sm text-slate-400 hover:text-red-600 transition-colors flex items-center gap-2"
                    >
                        <Trash2 size={14} />
                        {t('profile.deleteAccount')}
                    </button>
              </div>

              {/* Bekreftelsesmodal for sletting */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDeleteConfirm(false)}>
                  <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{t('profile.deleteConfirmTitle')}</h3>
                    <p className="text-sm text-slate-600 mb-6">{t('profile.deleteConfirmMessage')}</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2.5 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        {t('profile.deleteCancel')}
                      </button>
                      <button
                        onClick={handleDeleteAccountConfirm}
                        className="flex-1 py-2.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                      >
                        {t('profile.deleteConfirmBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
    </Layout>
  );
};