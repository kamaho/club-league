import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, User, LogOut, Menu, X, Shield, CalendarDays, ChevronLeft, ChevronRight, Smile } from 'lucide-react';
import { authService } from '../services/auth';
import { UserRole } from '../types';
import { useAppContext } from '../context/AppContext';
import { db } from '../services/db';
import { useQuery } from '../hooks/useQuery';
import { format, addDays, differenceInCalendarDays, startOfYear } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const user = authService.getCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { currentDate, setCurrentDate, t } = useAppContext();
  const [seasonsData] = useQuery(() => db.getSeasons(), []);
  const seasons = seasonsData ?? [];
  const activeSeason = seasons.find(s => s.status === 'ACTIVE') || seasons[0];
  
  const seasonStartDate = activeSeason ? new Date(activeSeason.startDate) : startOfYear(currentDate);
  const daysDiff = differenceInCalendarDays(currentDate, seasonStartDate);
  const roundIndex = Math.floor(daysDiff / 14); // 14 days per round
  const roundNumber = roundIndex + 1;
  
  const roundStartDate = addDays(seasonStartDate, roundIndex * 14);
  const roundEndDate = addDays(roundStartDate, 13);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Core items for Bottom Nav & Main Nav
  const mainNavItems = [
    { icon: Home, label: t('nav.home'), path: '/' },
    { icon: CalendarDays, label: t('nav.matches'), path: '/matches' },
    { icon: Trophy, label: t('nav.standings'), path: '/standings' },
    { icon: User, label: t('nav.profile'), path: '/profile' },
  ];

  // Secondary items for Hamburger & Desktop
  const secondaryNavItems = [
     { icon: Smile, label: t('nav.friendlies'), path: '/friendlies' },
  ];

  if (user?.role === UserRole.ADMIN) {
    secondaryNavItems.push({ icon: Shield, label: t('nav.admin'), path: '/admin' });
  }

  // Combined list for side/top menus
  const allNavItems = [...mainNavItems, ...secondaryNavItems];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handlePrevRound = () => {
      setCurrentDate(addDays(currentDate, -14));
  };

  const handleNextRound = () => {
      setCurrentDate(addDays(currentDate, 14));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main Header */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="bg-lime-400 text-slate-900 px-2 py-0.5 rounded-md text-sm font-black">CL</span>
            Club League
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {allNavItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-lime-400 ${isActive(item.path) ? 'text-lime-400' : 'text-slate-300'}`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
            <button 
              onClick={handleLogout}
              className="ml-4 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {t('nav.logout')}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Date & Season Status Bar */}
        <div className="bg-slate-800 border-t border-slate-700">
           <div className="max-w-4xl mx-auto px-4 py-2 flex justify-between items-center text-xs sm:text-sm">
              <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
                 <button onClick={handlePrevRound} className="text-slate-400 hover:text-white p-1">
                    <ChevronLeft size={16} />
                 </button>
                 <span className="font-mono text-lime-400 font-bold min-w-[180px] text-center text-[11px] sm:text-xs">
                    Round {roundNumber} ({format(roundStartDate, 'd MMM')} - {format(roundEndDate, 'd MMM')})
                 </span>
                 <button onClick={handleNextRound} className="text-slate-400 hover:text-white p-1">
                    <ChevronRight size={16} />
                 </button>
              </div>
              
              <div className="hidden sm:flex items-center gap-3">
                 {activeSeason ? (
                    <span className="text-slate-400 text-xs">{activeSeason.name}</span>
                 ) : (
                    <span className="text-slate-400">No active season</span>
                 )}
              </div>
           </div>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/95 backdrop-blur-sm pt-20 px-6">
          <nav className="flex flex-col gap-6">
             {allNavItems.map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-4 text-lg font-medium ${isActive(item.path) ? 'text-lime-400' : 'text-slate-300'}`}
              >
                <item.icon size={24} />
                {item.label}
              </Link>
            ))}
            <div className="h-px bg-slate-700 my-2"></div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-4 text-lg font-medium text-red-400"
            >
              <LogOut size={24} />
              {t('nav.logout')}
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 pb-20">
        {children}
      </main>

       {/* Mobile Bottom Tab Bar (Sticky) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-safe">
        <div className="flex justify-around items-center h-16">
          {mainNavItems.map((item) => (
             <Link 
                key={item.path}
                to={item.path} 
                className={`flex flex-col items-center justify-center w-full h-full gap-1 ${isActive(item.path) ? 'text-slate-900' : 'text-gray-400'}`}
              >
                <item.icon size={20} className={isActive(item.path) ? "fill-slate-900/10" : ""} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
          ))}
        </div>
      </div>
    </div>
  );
};