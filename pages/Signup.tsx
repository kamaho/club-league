import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth';
import { ChevronLeft, Check, Camera, Search, Briefcase } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AvailabilitySelector } from '../components/AvailabilitySelector';
import { UserPreferences } from '../types';

export const Signup: React.FC = () => {
  const { t, language, setLanguage } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clubFromUrl = searchParams.get('club') ?? '';
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      phone: '',
      avatarUrl: '',
      clubId: clubFromUrl,
      utr: 1.0,
      preferences: {
          matchFrequency: '1_per_2_weeks',
          opponentGender: 'both',
          availability: {},
          skipNextRound: false
      } as UserPreferences
  });

  // --- SKILL ASSESSMENT STATE ---
  const [skillAnswers, setSkillAnswers] = useState({
      years: 0,
      frequency: 0,
      style: 0
  });

  // Calculate UTR whenever answers change
  useEffect(() => {
      // Base UTR
      const base = 1.0;
      
      // Years: 0 (<1yr) -> 0.5, 1 (1-3) -> 1.5, 2 (3-5) -> 2.5, 3 (5+) -> 3.5
      const yearsBonus = (skillAnswers.years * 1.0) + 0.5; 
      
      // Frequency: 0 (Rarely) -> 0, 1 (Monthly) -> 0.25, 2 (Weekly) -> 0.75, 3 (2x+) -> 1.5
      const freqBonus = skillAnswers.frequency * 0.5;
      
      const estimated = Math.min(10, Math.max(1, base + yearsBonus + freqBonus));
      
      setFormData(prev => ({ ...prev, utr: parseFloat(estimated.toFixed(1)) }));
  }, [skillAnswers]);

  // --- CLUBS (real tennis clubs in Norway / nærområdet) ---
  const clubs = [
      { id: 'club-1', name: 'Oslo Tennisklubb (OTK)', city: 'Oslo' },
      { id: 'club-2', name: 'Bergens Tennisklubb (BTK)', city: 'Bergen' },
      { id: 'club-3', name: 'Stavanger Tennisklubb', city: 'Stavanger' },
      { id: 'club-4', name: 'Trondheim Tennisklubb', city: 'Trondheim' },
      { id: 'club-5', name: 'Kristiansand Tennisklubb', city: 'Kristiansand' }
  ];

  // --- HANDLERS ---
  
  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      await authService.register(formData);
      navigate('/');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER STEPS ---

  const renderStep1_Account = () => (
      <div className="space-y-4 animate-slide-up">
          <div className="flex justify-center mb-6">
              <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-300 overflow-hidden">
                      {formData.avatarUrl ? (
                          <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                          <Camera size={32} />
                      )}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-lime-400 p-2 rounded-full text-slate-900 shadow-sm">
                      <PlusIcon size={14} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Paste image URL here for MVP..."
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                         if(e.target.value) setFormData({...formData, avatarUrl: 'https://i.pravatar.cc/150?u=' + e.target.value}) // Mock logic
                    }}
                  />
              </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-lime-400 outline-none"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-lime-400 outline-none"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{language === 'no' ? 'Mobilnummer' : 'Phone number'}</label>
            <input
              type="tel"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-lime-400 outline-none"
              placeholder={language === 'no' ? 'f.eks. 123 45 678' : 'e.g. +47 123 45 678'}
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-lime-400 outline-none"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
      </div>
  );

  const renderStep2_Club = () => (
      <div className="space-y-4 animate-slide-up">
          <div className="relative">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input 
                  type="text" 
                  placeholder={t('signup.club.placeholder')} 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-lime-400 outline-none"
              />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
              {clubs.map(club => (
                  <button 
                    key={club.id}
                    onClick={() => setFormData({...formData, clubId: club.id})}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                        formData.clubId === club.id 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                        : 'bg-white border-slate-100 hover:border-lime-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                      <div className="text-left">
                          <div className="font-bold">{club.name}</div>
                          <div className={`text-xs ${formData.clubId === club.id ? 'text-slate-400' : 'text-slate-500'}`}>{club.city}</div>
                      </div>
                      {formData.clubId === club.id && <Check size={20} className="text-lime-400" />}
                  </button>
              ))}
          </div>
          <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start border border-blue-100">
              <Briefcase className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-blue-700 leading-relaxed">
                  {t('signup.club.notice')}
              </p>
          </div>
      </div>
  );

  const renderStep3_Skill = () => (
      <div className="space-y-6 animate-slide-up">
          {/* Question 1 */}
          <div>
              <label className="block text-sm font-bold text-slate-800 mb-3">{t('signup.skill.years')}</label>
              <div className="grid grid-cols-2 gap-2">
                  {['< 1 Year', '1-3 Years', '3-5 Years', '5+ Years'].map((label, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSkillAnswers(prev => ({...prev, years: idx}))}
                        className={`py-3 rounded-lg text-sm font-bold border transition-all ${
                            skillAnswers.years === idx 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                          {label}
                      </button>
                  ))}
              </div>
          </div>
          
          {/* Question 2 */}
           <div>
              <label className="block text-sm font-bold text-slate-800 mb-3">{t('signup.skill.frequency')}</label>
              <div className="grid grid-cols-2 gap-2">
                  {['Rarely', 'Monthly', 'Weekly', '2x+ Week'].map((label, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSkillAnswers(prev => ({...prev, frequency: idx}))}
                        className={`py-3 rounded-lg text-sm font-bold border transition-all ${
                            skillAnswers.frequency === idx 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                          {label}
                      </button>
                  ))}
              </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
             <div className="flex justify-between items-center mb-2">
                 <label className="block text-sm font-bold text-slate-800">{t('signup.skill.estimated')}</label>
                 <span className="text-2xl font-black text-lime-600">{formData.utr.toFixed(1)}</span>
             </div>
             <input 
                type="range" 
                min="1" max="10" step="0.1"
                value={formData.utr}
                onChange={(e) => setFormData({...formData, utr: parseFloat(e.target.value)})}
                className="w-full accent-lime-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
             />
             <p className="text-xs text-slate-400 mt-2 text-center">Drag to adjust if you know your UTR</p>
          </div>
      </div>
  );

  const renderStep4_Preferences = () => (
      <div className="space-y-6 animate-slide-up">
          {/* Frequency */}
          <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">How often do you want to play?</label>
              <select 
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-lime-400 outline-none"
                value={formData.preferences.matchFrequency}
                onChange={(e) => setFormData({
                    ...formData, 
                    preferences: {...formData.preferences, matchFrequency: e.target.value as any}
                })}
              >
                  <option value="1_per_2_weeks">{t('profile.freq.1_per_2')}</option>
                  <option value="2_per_2_weeks">{t('profile.freq.2_per_2')}</option>
                  <option value="1_per_4_weeks">{t('profile.freq.1_per_4')}</option>
                  <option value="3_per_4_weeks">{t('profile.freq.3_per_4')}</option>
              </select>
          </div>

          {/* Gender */}
          <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Opponent Preference</label>
              <div className="flex gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    {['female', 'male', 'both'].map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setFormData({
                                ...formData,
                                preferences: { ...formData.preferences, opponentGender: opt as any }
                            })}
                            className={`flex-1 py-2 rounded-md text-xs font-bold capitalize transition-all ${
                                formData.preferences.opponentGender === opt
                                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {opt === 'female' ? t('profile.gender.female') : opt === 'male' ? t('profile.gender.male') : t('profile.gender.both')}
                        </button>
                    ))}
              </div>
          </div>

          {/* Availability */}
          <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Availability</label>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <AvailabilitySelector 
                    availability={formData.preferences.availability}
                    onChange={(newAvail) => setFormData({
                        ...formData,
                        preferences: { ...formData.preferences, availability: newAvail }
                    })}
                />
              </div>
          </div>
      </div>
  );

  // --- PROGRESS BAR ---
  const titles = [t('signup.step1.title'), t('signup.step2.title'), t('signup.step3.title'), t('signup.step4.title')];
  const subtitles = [t('signup.step1.subtitle'), t('signup.step2.subtitle'), t('signup.step3.subtitle'), t('signup.step4.subtitle')];

  // Helper component for icon
  const PlusIcon = ({size}: {size: number}) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14"/>
      </svg>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl w-full max-w-md min-h-[500px] flex flex-col">
        
        {/* Language Selection Header */}
        <div className="flex justify-end mb-4">
            <div className="bg-slate-100 rounded-lg p-0.5 flex">
                <button 
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === 'en' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    English
                </button>
                <button 
                    onClick={() => setLanguage('no')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${language === 'no' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Norsk
                </button>
            </div>
        </div>

        {/* Header */}
        <div className="mb-6">
            <Link to="/login" className="inline-flex items-center text-slate-400 hover:text-slate-600 mb-4 text-xs font-bold uppercase tracking-wider">
                <ChevronLeft size={16} /> {t('signup.back')}
            </Link>
            
            <div className="flex justify-between items-end mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{titles[step-1]}</h1>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Step {step}/4</span>
            </div>
            <p className="text-slate-500 text-sm">{subtitles[step-1]}</p>
            
            {/* Progress Bar */}
            <div className="h-1 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <div 
                    className="h-full bg-lime-400 transition-all duration-300 ease-out"
                    style={{ width: `${(step / 4) * 100}%` }}
                ></div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1">
            {step === 1 && renderStep1_Account()}
            {step === 2 && renderStep2_Club()}
            {step === 3 && renderStep3_Skill()}
            {step === 4 && renderStep4_Preferences()}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3">
            {step > 1 && (
                <button 
                    onClick={prevStep}
                    className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
                >
                    {t('signup.back')}
                </button>
            )}
            
            {step < 4 ? (
                <button 
                    onClick={() => {
                        if (step === 1 && !formData.phone?.trim()) {
                            alert(language === 'no' ? 'Vennligst oppgi mobilnummer.' : 'Please enter your phone number.');
                            return;
                        }
                        if (step === 2 && !formData.clubId) {
                            alert(language === 'no' ? 'Vennligst velg en klubb.' : 'Please select a club.');
                            return;
                        }
                        nextStep();
                    }}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
                >
                    {t('signup.next')}
                </button>
            ) : (
                <button 
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="flex-1 bg-lime-400 text-slate-900 py-3 rounded-xl font-bold hover:bg-lime-300 shadow-lg shadow-lime-900/20 transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? t('common.loading') : t('signup.finish')}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};