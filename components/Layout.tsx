import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, Shield, CalendarDays, Smile, ArrowLeft, Plus, Activity } from 'lucide-react';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { UserRole, MatchStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import { TennisAvatar } from './TennisAvatar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [matches] = useQuery(
    () => (user ? db.getMatchesForUser(user.id) : Promise.resolve([])),
    [user?.id]
  );
  const hasActionRequired = (matches ?? []).some((m) => m.status === MatchStatus.PROPOSED);

  const { t } = useAppContext();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Bottom nav: 5 items – Hjem | Kamper | [PLUS senter] | Tabell | Analyse
  const bottomNavLeft = [
    { icon: Home, label: t('nav.home'), path: '/' },
    { icon: CalendarDays, label: t('nav.matches'), path: '/matches' },
  ];
  const bottomNavRight = [
    { icon: Trophy, label: t('nav.standings'), path: '/standings' },
    { icon: Activity, label: t('nav.analyse'), path: '/analyse' },
  ];

  // Desktop nav (without Profile – profile is avatar in header)
  const desktopNavItems = [
    { icon: Home, label: t('nav.home'), path: '/' },
    { icon: CalendarDays, label: t('nav.matches'), path: '/matches' },
    { icon: Trophy, label: t('nav.standings'), path: '/standings' },
    { icon: Activity, label: t('nav.analyse'), path: '/analyse' },
    { icon: Smile, label: t('nav.friendlies'), path: '/friendlies' },
  ];
  if (user?.role === UserRole.ADMIN) {
    desktopNavItems.push({ icon: Shield, label: t('nav.admin'), path: '/admin' });
  }

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleQuickMatch = () => {
    navigate('/matches', { state: { quickMatch: true } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <div className="w-10 flex-shrink-0 flex items-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={t('common.back') || 'Back'}
              aria-label={t('common.back') || 'Back'}
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          <Link to="/" className="flex-1 flex justify-center min-w-0">
            <h1 className="text-center text-lg sm:text-xl font-bold tracking-tight text-white truncate">
              Club League
            </h1>
          </Link>
          <div className="flex-shrink-0 flex items-center justify-end gap-2 min-w-[2.5rem] md:min-w-0">
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
            {desktopNavItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-lime-400 ${isActive(item.path) ? 'text-lime-400' : 'text-slate-300'}`}
              >
                <span className="relative inline-flex">
                  <item.icon size={16} />
                  {item.path === '/matches' && hasActionRequired && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-slate-900" aria-hidden />
                  )}
                </span>
                {item.label}
              </Link>
            ))}
            {user && (
              <Link
                to="/profile"
                className="flex items-center rounded-full ring-2 ring-slate-600 ring-offset-2 ring-offset-slate-900 hover:ring-lime-400 transition-colors"
                aria-label={t('nav.profile')}
              >
                <TennisAvatar user={user} size={28} className="rounded-full" />
              </Link>
            )}
            <button 
              onClick={handleLogout}
              className="ml-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {t('nav.logout')}
            </button>
            </nav>
            {/* Mobile: profilbilde til /profile */}
            {user && (
              <Link
                to="/profile"
                className="md:hidden flex items-center rounded-full ring-2 ring-slate-600 ring-offset-2 ring-offset-slate-900 p-0.5"
                aria-label={t('nav.profile')}
              >
                <TennisAvatar user={user} size={36} className="rounded-full" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 pb-20">
        {children}
      </main>

       {/* Mobile Bottom Tab Bar (Sticky) – 5 items, plus i midten */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-safe">
        <div className="flex items-end justify-around h-20 px-1">
          {bottomNavLeft.map((item) => (
            <Link
              key={item.path + item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 ${isActive(item.path) ? 'text-slate-900' : 'text-gray-400'}`}
            >
              <span className="relative inline-flex">
                <item.icon size={22} className={isActive(item.path) ? 'fill-slate-900/10' : ''} />
                {item.path === '/matches' && hasActionRequired && (
                  <span className="absolute -top-0.5 -right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" aria-hidden />
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
          <div className="flex flex-col items-center justify-end flex-0 px-2 pb-1">
            <button
              type="button"
              onClick={handleQuickMatch}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700 active:scale-95 transition-all -mt-6"
              aria-label={t('nav.newMatch')}
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
            <span className="text-[10px] font-medium text-slate-500 mt-1">{t('nav.newMatch')}</span>
          </div>
          {bottomNavRight.map((item) => (
            <Link
              key={item.path + item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 gap-1 py-2 ${isActive(item.path) ? 'text-slate-900' : 'text-gray-400'}`}
            >
              <item.icon size={22} className={isActive(item.path) ? 'fill-slate-900/10' : ''} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};