import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { translations, Language } from '../utils/i18n';

interface AppContextType {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en'], params?: Record<string, string | number>) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  // Initialize with today's date or a stored date
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const stored = localStorage.getItem('club_league_sim_date');
    return stored ? new Date(stored) : new Date();
  });

  // Initialize language - Default to Norwegian ('no')
  const [language, setLanguage] = useState<Language>(() => {
      const stored = localStorage.getItem('club_league_lang');
      return (stored === 'en' || stored === 'no') ? stored : 'no';
  });

  useEffect(() => {
    localStorage.setItem('club_league_sim_date', currentDate.toISOString());
  }, [currentDate]);

  useEffect(() => {
      localStorage.setItem('club_league_lang', language);
  }, [language]);

  const t = (key: keyof typeof translations['en'], params?: Record<string, string | number>) => {
      let text = translations[language][key] || translations['en'][key] || key;
      
      if (params) {
          Object.entries(params).forEach(([paramKey, value]) => {
              text = text.replace(`{${paramKey}}`, String(value));
          });
      }
      return text;
  };

  return (
    <AppContext.Provider value={{ currentDate, setCurrentDate, language, setLanguage, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};