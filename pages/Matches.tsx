import React, { useState, useMemo, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { db } from '../services/db';
import { authService } from '../services/auth';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { MatchStatus, Match, MatchType } from '../types';
import type { ProposalLogistics, MatchSet, MatchLogistics } from '../types';
import { Smile, ChevronLeft, ChevronRight, X, Trophy, Search, MapPin, Plus, Trash2, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  eachDayOfInterval,
  parseISO,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { fireConfetti } from '../utils/confetti';
import { TennisAvatar } from '../components/TennisAvatar';

type MatchFilter = 'open' | 'planned' | 'played' | 'canceled';
type ViewMode = 'league' | 'friendlies' | 'all';
type FlowType = 'friendly' | 'ladder';
type CalendarModal = 'empty' | 'events' | null;

const MOCK_VENUES = ['Oslo Tennis Arena', 'Bærum Tennisklubb', 'Stovner Tennis', 'Nordstrand Tennis', 'Sørenga Tennis'];

function getMatchDate(m: Match): Date {
  const s = m.scheduledAt || m.createdAt;
  return parseISO(s);
}

function getMatchStatusCategory(status: MatchStatus): MatchFilter {
  if (status === MatchStatus.PENDING || status === MatchStatus.PROPOSED) return 'open';
  if (status === MatchStatus.SCHEDULED) return 'planned';
  if (status === MatchStatus.WALKOVER) return 'canceled';
  if (status === MatchStatus.REPORTED || status === MatchStatus.CONFIRMED || status === MatchStatus.DISPUTED) return 'played';
  return 'open';
}

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => 7 + i); // 07:00 - 20:00

export const Matches: React.FC = () => {
  const user = authService.getCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarModal, setCalendarModal] = useState<CalendarModal>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayMatches, setSelectedDayMatches] = useState<Match[]>([]);
  const { t, language } = useAppContext();

  // Stepper state (for empty-day flow)
  const [step, setStep] = useState(1);
  const [flowType, setFlowType] = useState<FlowType | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [logistics, setLogistics] = useState({
    whoBooks: 'me' as 'me' | 'opponent' | 'unknown',
    venueName: '',
    venueSearch: '',
    courtNumber: 1,
    cost: 0,
    whoPays: 'split' as 'me' | 'split' | 'opponent',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  /** Når satt: vi sender forslag for denne kampen (åpnet fra kalender), ikke oppretter ny. */
  const [proposingForMatchId, setProposingForMatchId] = useState<string | null>(null);
  /** Planlagt kamp man rapporterer resultat for fra kalendermodalen. */
  const [reportScoreMatch, setReportScoreMatch] = useState<Match | null>(null);
  const [reportScoreSets, setReportScoreSets] = useState<MatchSet[]>([{ scoreA: 0, scoreB: 0 }]);
  const [reportScoreSubmitting, setReportScoreSubmitting] = useState(false);
  /** Spilt eller kansellert kamp som vises i modal (erstatter navigering til kamp-siden). */
  const [viewMatchInModal, setViewMatchInModal] = useState<Match | null>(null);
  const [confirmScoreSubmitting, setConfirmScoreSubmitting] = useState(false);
  /** Åpen vennskapskamp fra kalender: vis bekrefte/avvise forespørsel eller «Send forslag», ikke planleggingsstepper. */
  const [openFriendlyMatch, setOpenFriendlyMatch] = useState<Match | null>(null);

  const [matchesByUser, , refetchMatches] = useQuery(() => user ? db.getMatchesForUser(user.id) : Promise.resolve([]), [user?.id]);
  const [usersData] = useQuery(() => db.getUsers(), []);
  const [seasonStatus] = useQuery(() => db.getSeasonStatus(new Date()), []);
  const [friendlyProposals] = useQuery(
    () => (openFriendlyMatch ? db.getProposals(openFriendlyMatch.id) : Promise.resolve([])),
    [openFriendlyMatch?.id]
  );

  /** Quick match fra bunnnav: åpne planleggingsmodalen med dagens dato. */
  useEffect(() => {
    const state = location.state as { quickMatch?: boolean; proposeForMatchId?: string } | null;
    if (state?.quickMatch && user) {
      setSelectedDay(new Date());
      setCalendarModal('empty');
      navigate('/matches', { replace: true, state: {} });
    }
  }, [location.state, user, navigate]);

  /** Åpne stepper når bruker kommer fra Hjem med «Send forespørsel» for en kamp. */
  useEffect(() => {
    const matchId = (location.state as { proposeForMatchId?: string } | null)?.proposeForMatchId;
    if (!matchId || !user) return;
    const list = matchesByUser ?? [];
    if (list.length === 0) return;
    const match = list.find(m => m.id === matchId);
    if (!match || getMatchStatusCategory(match.status) !== 'open') {
      navigate('/matches', { replace: true, state: {} });
      return;
    }
    const opponentId = match.playerAId === user.id ? match.playerBId : match.playerAId;
    setFlowType(match.type === MatchType.LEAGUE ? 'ladder' : 'friendly');
    setSelectedMatchId(match.type === MatchType.LEAGUE ? match.id : null);
    setSelectedOpponentId(match.type === MatchType.FRIENDLY ? opponentId : null);
    setProposingForMatchId(match.id);
    setStep(3);
    setSelectedTime(null);
    setSelectedDay(new Date());
    setLogistics({ whoBooks: 'me', venueName: '', venueSearch: '', courtNumber: 1, cost: 0, whoPays: 'split', message: '' });
    setCalendarModal('empty');
    navigate('/matches', { replace: true, state: {} });
  }, [location.state, matchesByUser, user, navigate]);

  if (!user) return null;

  const matchesForView: Match[] =
    viewMode === 'league'
      ? (matchesByUser ?? []).filter(m => m.type === MatchType.LEAGUE)
      : viewMode === 'friendlies'
        ? (matchesByUser ?? []).filter(m => m.type === MatchType.FRIENDLY)
        : (matchesByUser ?? []);
  const users = usersData ?? [];
  const getUser = (id: string) => users.find(u => u.id === id);
  const openLadderMatches = (matchesByUser ?? []).filter(
    m => m.type === MatchType.LEAGUE && (m.status === MatchStatus.PENDING || m.status === MatchStatus.PROPOSED)
  );
  const activeRound = seasonStatus?.activeRound ?? 0;
  const openLadderMatchesThisRound = activeRound > 0
    ? openLadderMatches.filter(m => (m.round ?? 0) === activeRound)
    : openLadderMatches;

  const potentialOpponents = users.filter(u => u.id !== user?.id);
  const opponentsForFlow = flowType === 'ladder'
    ? potentialOpponents.filter(p => openLadderMatchesThisRound.some(m => m.playerAId === p.id || m.playerBId === p.id))
    : potentialOpponents;
  const playerSearchLower = playerSearch.trim().toLowerCase();
  const filteredOpponents = playerSearchLower
    ? opponentsForFlow.filter(p => p.name.toLowerCase().includes(playerSearchLower) || (p.email && p.email.toLowerCase().includes(playerSearchLower)))
    : opponentsForFlow;

  const openDayEmpty = (day: Date) => {
    setSelectedDay(day);
    setSelectedDayMatches([]);
    setStep(1);
    setFlowType(null);
    setSelectedOpponentId(null);
    setSelectedMatchId(null);
    setProposingForMatchId(null);
    setPlayerSearch('');
    setSelectedTime(null);
    setLogistics({ whoBooks: 'me', venueName: '', venueSearch: '', courtNumber: 1, cost: 0, whoPays: 'split', message: '' });
    setCalendarModal('empty');
  };

  /** Åpne rapporter-resultat-modal for en planlagt kamp (fra dagmodalen). */
  const openReportScoreModal = (match: Match) => {
    if (!user) return;
    const isParticipant = match.playerAId === user.id || match.playerBId === user.id;
    if (!isParticipant || match.status !== MatchStatus.SCHEDULED) return;
    setReportScoreMatch(match);
    setReportScoreSets([{ scoreA: 0, scoreB: 0 }]);
    setCalendarModal(null);
  };

  const openViewMatchModal = (match: Match) => {
    setViewMatchInModal(match);
    setCalendarModal(null);
  };

  const handleConfirmScoreInModal = async () => {
    if (!viewMatchInModal) return;
    setConfirmScoreSubmitting(true);
    try {
      await db.confirmScore(viewMatchInModal.id);
      await refetchMatches();
      setViewMatchInModal(null);
    } finally {
      setConfirmScoreSubmitting(false);
    }
  };

  const handleSubmitReportScore = async () => {
    if (!reportScoreMatch || !user) return;
    const pA = getUser(reportScoreMatch.playerAId);
    const pB = getUser(reportScoreMatch.playerBId);
    if (!pA || !pB) return;
    let winsA = 0, winsB = 0;
    reportScoreSets.forEach(s => {
      if (s.scoreA > s.scoreB) winsA++;
      else if (s.scoreB > s.scoreA) winsB++;
    });
    const winnerId = winsA > winsB ? pA.id : pB.id;
    setReportScoreSubmitting(true);
    try {
      await db.submitScore(reportScoreMatch.id, { sets: reportScoreSets, winnerId });
      await refetchMatches();
      setReportScoreMatch(null);
    } finally {
      setReportScoreSubmitting(false);
    }
  };

  /** Åpne planleggings-stepper for en eksisterende åpen kamp (fra dagmodalen). Kun stigekamper. */
  const openStepperForMatch = (match: Match) => {
    if (!user) return;
    const isOpen = getMatchStatusCategory(match.status) === 'open';
    if (!isOpen) return;
    const opponentId = match.playerAId === user.id ? match.playerBId : match.playerAId;
    setFlowType(match.type === MatchType.LEAGUE ? 'ladder' : 'friendly');
    setSelectedMatchId(match.type === MatchType.LEAGUE ? match.id : null);
    setSelectedOpponentId(match.type === MatchType.FRIENDLY ? opponentId : null);
    setProposingForMatchId(match.id);
    setStep(3);
    setSelectedTime(null);
    setLogistics({ whoBooks: 'me', venueName: '', venueSearch: '', courtNumber: 1, cost: 0, whoPays: 'split', message: '' });
    setCalendarModal('empty');
  };

  /** Fra «åpen vennskapskamp»-modalen: åpne stepper fra steg 3 (tid) for å sende forslag. */
  const openStepperForFriendlyFromModal = () => {
    if (!openFriendlyMatch || !user) return;
    const opponentId = openFriendlyMatch.playerAId === user.id ? openFriendlyMatch.playerBId : openFriendlyMatch.playerAId;
    setFlowType('friendly');
    setSelectedOpponentId(opponentId);
    setSelectedMatchId(null);
    setProposingForMatchId(openFriendlyMatch.id);
    setStep(3);
    setSelectedTime(null);
    setLogistics({ whoBooks: 'me', venueName: '', venueSearch: '', courtNumber: 1, cost: 0, whoPays: 'split', message: '' });
    setOpenFriendlyMatch(null);
    setCalendarModal('empty');
  };

  const handleAcceptFriendlyProposal = async (proposalId: string, time: string) => {
    if (!openFriendlyMatch || !user) return;
    const proposals = friendlyProposals ?? [];
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return;
    const opponent = getUser(openFriendlyMatch.playerAId === user.id ? openFriendlyMatch.playerBId : openFriendlyMatch.playerAId);
    const formatDateTime = (s: string) => format(new Date(s), language === 'no' ? 'd. MMM, HH:00' : 'MMM d, h:00 a', { locale: language === 'no' ? nb : undefined });
    const confirmMsg = proposal.logistics
      ? (language === 'no'
          ? `Bekrefte kamp ${formatDateTime(time)}?\n\nBane: ${proposal.logistics.courtNumber || '—'}\nKostnad: ${proposal.logistics.cost} ${t('common.currency')}\nBooker: ${proposal.logistics.bookedById === user.id ? 'Deg' : opponent?.name ?? '—'}`
          : `Confirm match for ${formatDateTime(time)}?\n\nCourt: ${proposal.logistics.courtNumber || 'Any'}\nCost: ${proposal.logistics.cost} ${t('common.currency')}\nBooking: ${proposal.logistics.bookedById === user.id ? 'You' : opponent?.name ?? '—'}`)
      : (language === 'no' ? `Bekrefte kamp ${formatDateTime(time)}?` : `Confirm match for ${formatDateTime(time)}?`);
    if (!window.confirm(confirmMsg)) return;
    let logistics: MatchLogistics | undefined;
    if (proposal.logistics) {
      logistics = {
        courtNumber: proposal.logistics.courtNumber ?? 1,
        bookedById: proposal.logistics.bookedById,
        cost: proposal.logistics.cost,
        splitType: proposal.logistics.splitType,
        isSettled: false,
      };
    }
    await db.updateMatchStatus(openFriendlyMatch.id, MatchStatus.SCHEDULED, time, logistics);
    await refetchMatches();
    setOpenFriendlyMatch(null);
  };

  const openDayEvents = (day: Date, dayMatches: Match[]) => {
    setSelectedDay(day);
    setSelectedDayMatches(dayMatches);
    setCalendarModal('events');
  };

  const stepNext = () => { if (step < 9) setStep(s => s + 1); };
  const stepperBack = () => { if (step > 1) setStep(s => s - 1); };

  const selectedOpponent = selectedOpponentId ? getUser(selectedOpponentId) : null;
  const selectedLadderMatch = selectedMatchId ? (matchesByUser ?? []).find(m => m.id === selectedMatchId) : null;

  const buildLogistics = (): ProposalLogistics => {
    const opponentId = flowType === 'ladder' && selectedLadderMatch
      ? (selectedLadderMatch.playerAId === user?.id ? selectedLadderMatch.playerBId : selectedLadderMatch.playerAId)
      : selectedOpponentId;
    if (!user) return { courtNumber: 0, venueName: '', bookedById: '', cost: 0, splitType: 'SPLIT' as const };
    const oid = opponentId ?? user.id;
    const splitType = logistics.whoPays === 'split' ? 'SPLIT' : 'BOOKER_PAYS';
    const bookedById = logistics.whoPays === 'me' ? user.id : logistics.whoPays === 'opponent' ? oid : (logistics.whoBooks === 'opponent' ? oid : user.id);
    return {
      courtNumber: logistics.courtNumber,
      venueName: logistics.venueName || undefined,
      bookedById,
      cost: logistics.cost,
      splitType,
    };
  };

  const handleStepperSubmit = async () => {
    if (!user || !selectedDay) return;
    setSubmitting(true);
    try {
      const dateStr = selectedTime || format(selectedDay, "yyyy-MM-dd'T'12:00:00");
      const log = buildLogistics();
      if (proposingForMatchId) {
        await db.createProposal(proposingForMatchId, user.id, [dateStr], logistics.message, log);
        await refetchMatches();
        fireConfetti();
        setCalendarModal(null);
        setProposingForMatchId(null);
      } else if (flowType === 'friendly' && selectedOpponentId) {
        const newMatch = await db.createFriendlyMatch(user.id, selectedOpponentId, dateStr);
        await db.createProposal(newMatch.id, user.id, [dateStr], logistics.message, log);
        await refetchMatches();
        fireConfetti();
        setCalendarModal(null);
      } else if (flowType === 'ladder' && selectedMatchId) {
        await db.createProposal(selectedMatchId, user.id, [dateStr], logistics.message, log);
        await refetchMatches();
        fireConfetti();
        setCalendarModal(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return flowType !== null;
    if (step === 2) return flowType === 'friendly' ? !!selectedOpponentId : !!selectedMatchId;
    if (step === 3) return !!selectedTime;
    return true; // steps 4–8
  };

  // Calendar: group matches by date (use scheduledAt or createdAt)
  const matchesByDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    matchesForView.forEach(m => {
      const d = getMatchDate(m);
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return map;
  }, [matchesForView]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const weekDays = language === 'no' ? ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const statusColors: Record<MatchFilter, string> = {
    open: 'bg-amber-100 text-amber-800 border-amber-200',
    planned: 'bg-blue-100 text-blue-800 border-blue-200',
    played: 'bg-green-100 text-green-800 border-green-200',
    canceled: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <Layout>
      <div className="mt-8 mb-4">
        <div className="bg-slate-100 p-1 rounded-lg flex flex-nowrap overflow-x-auto">
          <button type="button" onClick={() => setViewMode('league')} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${viewMode === 'league' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Trophy size={14} /> {t('matches.filter.league')}
          </button>
          <button type="button" onClick={() => setViewMode('friendlies')} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${viewMode === 'friendlies' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Smile size={14} /> {t('matches.filter.friendlies')}
          </button>
          <button type="button" onClick={() => setViewMode('all')} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${viewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Calendar size={14} /> {t('matches.filter.all')}
          </button>
        </div>
      </div>

      <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setCalendarMonth(m => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {format(calendarMonth, 'MMMM yyyy', { locale: language === 'no' ? nb : undefined })}
            </h2>
            <button type="button" onClick={() => setCalendarMonth(m => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {weekDays.map(day => (
                <div key={day} className="py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-fr min-h-[60px]">
              {calendarDays.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const dayMatches = matchesByDate.get(key) ?? [];
                const isCurrentMonth = isSameMonth(day, calendarMonth);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => dayMatches.length === 0 ? openDayEmpty(day) : openDayEvents(day, dayMatches)}
                    className={`min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-slate-100 last:border-r-0 text-left w-full hover:bg-slate-50 transition-colors ${!isCurrentMonth ? 'bg-slate-50/50' : ''}`}
                  >
                    <div className={`text-xs font-bold mb-1 ${isCurrentMonth ? 'text-slate-700' : 'text-slate-400'} ${isToday(day) ? 'bg-slate-900 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayMatches.length > 1 ? (
                        <div
                          className="flex items-center justify-center w-full min-h-[28px] sm:min-h-[32px] rounded-lg border border-violet-300 bg-violet-100 text-violet-800 font-bold text-sm"
                          title={dayMatches.length + (language === 'no' ? ' hendelser – trykk for å åpne' : ' events – tap to open')}
                        >
                          {dayMatches.length}
                        </div>
                      ) : (
                        dayMatches.map(m => {
                          const category = getMatchStatusCategory(m.status);
                          const pA = getUser(m.playerAId);
                          const pB = getUser(m.playerBId);
                          const label = pA && pB ? `${pA.name.split(' ')[0]}–${pB.name.split(' ')[0]}` : 'Match';
                          return (
                            <span
                              key={m.id}
                              className={`block text-[10px] sm:text-xs font-medium px-1.5 py-1 rounded border truncate pointer-events-none ${statusColors[category]}`}
                              title={pA && pB ? `${pA.name} vs ${pB.name}` : ''}
                            >
                              {label}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-300" /> {t('matches.tab.open')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300" /> {t('matches.tab.planned')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 border border-green-300" /> {t('matches.tab.played')}</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300" /> {t('matches.tab.canceled')}</span>
          </div>
        </div>

      {/* Stepper modal: plan friendly or ladder request */}
      {calendarModal === 'empty' && selectedDay && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(s => (
                  <span
                    key={s}
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      s < step ? 'bg-slate-900 text-white' : s === step ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <button type="button" onClick={() => setCalendarModal(null)} className="text-slate-400 hover:text-slate-800 p-1">
                <X size={22} />
              </button>
            </div>
            <div className="px-4 pt-2 pb-4 text-sm text-slate-500 shrink-0">
              {format(selectedDay, 'EEEE d. MMMM', { locale: language === 'no' ? nb : undefined })}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {/* Step 1: Choose type */}
              {step === 1 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.step1')}</h2>
                  <button
                    type="button"
                    onClick={() => setFlowType('friendly')}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${flowType === 'friendly' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'}`}
                  >
                    <Smile size={24} className="text-indigo-600" />
                    <span className="font-bold text-slate-900">{t('matches.calendar.planFriendly')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openLadderMatchesThisRound.length > 0 && setFlowType('ladder')}
                    disabled={openLadderMatchesThisRound.length === 0}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${openLadderMatchesThisRound.length === 0 ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' : flowType === 'ladder' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 hover:border-amber-200 hover:bg-amber-50/50'}`}
                  >
                    <Trophy size={24} className="text-amber-600" />
                    <span className="font-bold text-slate-900">{t('matches.calendar.sendLadderRequest')}</span>
                  </button>
                  {openLadderMatchesThisRound.length === 0 && <p className="text-xs text-slate-400">{t('matches.calendar.noOpenLadder')}</p>}
                </div>
              )}

              {/* Step 2: Choose opponent (with search) */}
              {step === 2 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.step2')}</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={e => setPlayerSearch(e.target.value)}
                      placeholder={t('matches.stepper.searchPlayer')}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-2">
                    {flowType === 'ladder' ? (
                      openLadderMatchesThisRound.map(m => {
                        const opp = getUser(m.playerAId === user?.id ? m.playerBId : m.playerAId);
                        if (!opp || (playerSearchLower && !opp.name.toLowerCase().includes(playerSearchLower) && !(opp.email && opp.email.toLowerCase().includes(playerSearchLower)))) return null;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMatchId(m.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedMatchId === m.id ? 'border-amber-300 bg-amber-50' : 'border-slate-100 hover:border-amber-200 hover:bg-slate-50'}`}
                          >
                            <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                              <TennisAvatar user={opp} size={40} />
                            </div>
                            <span className="font-bold text-slate-900">{opp.name}</span>
                            <span className="text-xs text-slate-400">UTR {opp.utr ?? '-'}</span>
                          </button>
                        );
                      })
                    ) : (
                      filteredOpponents.map(opp => (
                        <button
                          key={opp.id}
                          type="button"
                          onClick={() => setSelectedOpponentId(opp.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedOpponentId === opp.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                            <TennisAvatar user={opp} size={40} />
                          </div>
                          <span className="font-bold text-slate-900">{opp.name}</span>
                          <span className="text-xs text-slate-400">UTR {opp.utr ?? '-'}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Time */}
              {step === 3 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.step3')}</h2>
                  <p className="text-sm text-slate-500">
                    {language === 'no' ? 'Velg klokkeslett' : 'Choose time'} ({format(selectedDay, 'd. MMM', { locale: language === 'no' ? nb : undefined })})
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {TIME_SLOTS.map(hour => {
                      const y = selectedDay.getFullYear(), m = selectedDay.getMonth(), d = selectedDay.getDate();
                      const iso = new Date(y, m, d, hour, 0, 0, 0).toISOString();
                      const isSelected = selectedTime === iso;
                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => setSelectedTime(iso)}
                          className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                        >
                          {hour.toString().padStart(2, '0')}:00
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 4: Hvem booker bane */}
              {step === 4 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.step4')}</h2>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('matches.stepper.whoBooks')}</label>
                    <div className="flex gap-2">
                      {(['me', 'opponent', 'unknown'] as const).map(key => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setLogistics(l => ({ ...l, whoBooks: key }))}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold border ${logistics.whoBooks === key ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}
                        >
                          {key === 'me' ? t('matches.stepper.whoBooksMe') : key === 'opponent' ? t('matches.stepper.whoBooksOpponent') : t('matches.stepper.whoBooksUnknown')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Arena og bane */}
              {step === 5 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.arena')}</h2>
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase">{t('matches.stepper.arenaSearch')}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        value={logistics.venueSearch}
                        onChange={e => setLogistics(l => ({ ...l, venueSearch: e.target.value }))}
                        onBlur={() => {
                          const v = MOCK_VENUES.find(x => x.toLowerCase().includes(logistics.venueSearch.toLowerCase()));
                          if (v) setLogistics(l => ({ ...l, venueName: v, venueSearch: v }));
                        }}
                        placeholder={t('matches.stepper.arenaSearch')}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {MOCK_VENUES.filter(v => !logistics.venueSearch || v.toLowerCase().includes(logistics.venueSearch.toLowerCase())).map(venue => (
                        <button
                          key={venue}
                          type="button"
                          onClick={() => setLogistics(l => ({ ...l, venueName: venue, venueSearch: venue }))}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm ${logistics.venueName === venue ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}
                        >
                          {venue}
                        </button>
                      ))}
                    </div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mt-2">{t('matches.stepper.court')}</label>
                    <select
                      value={logistics.courtNumber}
                      onChange={e => setLogistics(l => ({ ...l, courtNumber: parseInt(e.target.value, 10) }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>{t('common.court')} {n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Step 6: Kostnad */}
              {step === 6 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.cost')}</h2>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('matches.stepper.cost')} ({t('common.currency')})</label>
                  <input
                    type="number"
                    min={0}
                    value={logistics.cost || ''}
                    onChange={e => setLogistics(l => ({ ...l, cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    placeholder="0"
                  />
                </div>
              )}

              {/* Step 7: Hvem betaler */}
              {step === 7 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.whoPays')}</h2>
                  <div className="flex flex-col gap-2">
                    {(['me', 'split', 'opponent'] as const).map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setLogistics(l => ({ ...l, whoPays: key }))}
                        className={`py-2.5 rounded-lg text-sm font-bold border text-left px-4 ${logistics.whoPays === key ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}
                      >
                        {key === 'me' ? t('matches.stepper.whoPaysMe') : key === 'split' ? t('matches.stepper.whoPaysSplit') : t('matches.stepper.whoPaysOpponent')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 8: Melding */}
              {step === 8 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.messageToOpponent')}</h2>
                  <textarea
                    value={logistics.message}
                    onChange={e => setLogistics(l => ({ ...l, message: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none"
                    placeholder={language === 'no' ? 'Skriv en melding...' : 'Write a message...'}
                  />
                </div>
              )}

              {/* Step 9: Review */}
              {step === 9 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{t('matches.stepper.step5')}</h2>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    <p><span className="font-bold text-slate-500">{language === 'no' ? 'Type' : 'Type'}:</span> {flowType === 'friendly' ? t('matches.calendar.planFriendly') : t('matches.calendar.sendLadderRequest')}</p>
                    <p><span className="font-bold text-slate-500">{language === 'no' ? 'Motstander' : 'Opponent'}:</span> {(flowType === 'ladder' && selectedLadderMatch ? getUser(selectedLadderMatch.playerAId === user?.id ? selectedLadderMatch.playerBId : selectedLadderMatch.playerAId)?.name : selectedOpponent?.name) ?? '-'}</p>
                    <p><span className="font-bold text-slate-500">{language === 'no' ? 'Dato/tid' : 'Date/time'}:</span> {selectedTime ? format(parseISO(selectedTime), 'd. MMM HH:mm', { locale: language === 'no' ? nb : undefined }) : format(selectedDay, 'd. MMM')}</p>
                    <p><span className="font-bold text-slate-500">{t('match.logistics')}:</span> {logistics.venueName || '-'} · {t('common.court')} {logistics.courtNumber} · {logistics.cost} {t('common.currency')} · {logistics.whoPays === 'split' ? t('matches.stepper.whoPaysSplit') : logistics.whoPays === 'me' ? t('matches.stepper.whoPaysMe') : t('matches.stepper.whoPaysOpponent')}</p>
                    {logistics.message && <p><span className="font-bold text-slate-500">{language === 'no' ? 'Melding' : 'Message'}:</span> {logistics.message}</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2 shrink-0">
              {step > 1 ? (
                <button type="button" onClick={stepperBack} className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-700">
                  {t('matches.stepper.back')}
                </button>
              ) : null}
              <div className="flex-1" />
              {step < 9 ? (
                <button
                  type="button"
                  onClick={stepNext}
                  disabled={!canGoNext()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('matches.stepper.next')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStepperSubmit}
                  disabled={submitting || (!proposingForMatchId && (!flowType || (flowType === 'friendly' ? !selectedOpponentId : !selectedMatchId)))}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (language === 'no' ? 'Sender...' : 'Sending...') : t('matches.stepper.submit')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Day with events: list matches, link to detail */}
      {calendarModal === 'events' && selectedDay && selectedDayMatches.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">{t('matches.calendar.eventsOnDay')}</h2>
              <button type="button" onClick={() => setCalendarModal(null)} className="text-slate-400 hover:text-slate-800 p-1">
                <X size={22} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              {format(selectedDay, 'EEEE d. MMMM', { locale: language === 'no' ? nb : undefined })}
            </p>
            <div className="overflow-y-auto space-y-2 flex-1">
              {selectedDayMatches.map(m => {
                const category = getMatchStatusCategory(m.status);
                const isOpen = category === 'open';
                const isPlanned = category === 'planned';
                const isParticipant = user && (m.playerAId === user.id || m.playerBId === user.id);
                const statusLabel = category === 'open' ? t('matches.tab.open') : category === 'planned' ? t('matches.tab.planned') : category === 'played' ? t('matches.tab.played') : t('matches.tab.canceled');
                const pA = getUser(m.playerAId);
                const pB = getUser(m.playerBId);
                const label = pA && pB ? `${pA.name} – ${pB.name}` : 'Match';
                const className = `flex items-center justify-between w-full p-4 rounded-xl border text-left transition-all hover:opacity-90 ${statusColors[category]}`;
                if (isOpen) {
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (m.type === MatchType.FRIENDLY) {
                          setOpenFriendlyMatch(m);
                          setCalendarModal(null);
                        } else {
                          openStepperForMatch(m);
                        }
                      }}
                      className={className}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-medium block truncate">{label}</span>
                        <span className="text-xs font-bold opacity-90">{statusLabel}</span>
                      </div>
                      <span className="text-xs font-bold shrink-0">{m.type === MatchType.FRIENDLY ? t('matches.calendar.openFriendlyAction') : t('matches.stepper.next')}</span>
                    </button>
                  );
                }
                if (isPlanned && isParticipant) {
                  return (
                    <div key={m.id} className={className}>
                      <div className="min-w-0 pr-2 flex-1">
                        <span className="font-medium block truncate">{label}</span>
                        <span className="text-xs font-bold opacity-90">{statusLabel}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link
                          to={`/match/${m.id}/live`}
                          className="px-3 py-1.5 rounded-lg bg-lime-500 text-slate-900 text-xs font-bold hover:bg-lime-400"
                        >
                          {t('live.startMatch')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => openReportScoreModal(m)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                        >
                          {t('match.report.submit')}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openViewMatchModal(m)}
                    className={className}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-medium block truncate">{label}</span>
                      <span className="text-xs font-bold opacity-90">{statusLabel}</span>
                    </div>
                    <span className="text-xs font-bold shrink-0">{t('matches.calendar.viewMatch')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Åpen vennskapskamp: bekrefte/avvise forespørsel eller sende forslag (ikke full planleggingsstepper) */}
      {openFriendlyMatch && (() => {
        const m = openFriendlyMatch;
        const opponent = getUser(m.playerAId === user?.id ? m.playerBId : m.playerAId);
        const proposals = friendlyProposals ?? [];
        const incomingProposals = proposals.filter(p => p.proposedById !== user?.id);
        const hasIncoming = incomingProposals.length > 0;
        const formatDay = (s: string) => format(new Date(s), language === 'no' ? 'EEE d. MMM' : 'EEE, MMM d', { locale: language === 'no' ? nb : undefined });
        const formatTime = (s: string) => format(new Date(s), language === 'no' ? 'HH:00' : 'h:00 a', { locale: language === 'no' ? nb : undefined });
        if (!opponent) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-900">{t('matches.calendar.openFriendlyTitle')}</h2>
                <button type="button" onClick={() => setOpenFriendlyMatch(null)} className="text-slate-400 hover:text-slate-800 p-1">
                  <X size={22} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm font-medium text-slate-800">
                  {opponent.name} <span className="text-xs font-bold text-amber-700">· {t('matches.tab.open')}</span>
                </p>
                {hasIncoming ? (
                  <>
                    <p className="text-xs text-slate-500">{t('match.proposal.tapToConfirm')}</p>
                    <div className="space-y-2">
                      {incomingProposals.flatMap(p =>
                        p.proposedTimes.map((time, idx) => (
                          <button
                            key={`${p.id}-${idx}`}
                            type="button"
                            onClick={() => handleAcceptFriendlyProposal(p.id, time)}
                            className="w-full text-left p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 flex justify-between items-center"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-500 block">{formatDay(time)}</span>
                              <span className="text-sm font-bold text-slate-900">{formatTime(time)}</span>
                            </div>
                            <span className="text-xs font-black bg-slate-900 text-white px-2 py-1 rounded">{t('match.proposal.confirmBtn')}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={openStepperForFriendlyFromModal}
                      className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                    >
                      {t('match.proposal.decline')}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600">{t('matches.calendar.openFriendlyNoProposals')}</p>
                    <button
                      type="button"
                      onClick={openStepperForFriendlyFromModal}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                    >
                      {t('matches.calendar.openFriendlySendProposal')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Rapporter resultat (planlagt kamp fra kalender) */}
      {reportScoreMatch && (() => {
        const pA = getUser(reportScoreMatch.playerAId);
        const pB = getUser(reportScoreMatch.playerBId);
        if (!pA || !pB) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-900">{t('match.report.title')}</h2>
                <button type="button" onClick={() => setReportScoreMatch(null)} className="text-slate-400 hover:text-slate-800 p-1">
                  <X size={22} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <p className="text-sm text-slate-600 mb-4">
                  {pA.name} {t('common.vs')} {pB.name}
                </p>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  <span>Set</span>
                  <span className="w-16 text-center">{pA.name.split(' ')[0]}</span>
                  <span className="w-16 text-center">{pB.name.split(' ')[0]}</span>
                </div>
                <div className="space-y-2">
                  {reportScoreSets.map((set, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="text-sm font-bold text-slate-900 w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm border border-slate-200">
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="tel"
                          className="w-16 h-12 text-center border-2 border-slate-200 rounded-lg font-mono text-xl font-bold focus:border-indigo-400 focus:outline-none bg-white"
                          placeholder="0"
                          value={set.scoreA}
                          onChange={e => {
                            const next = [...reportScoreSets];
                            next[idx] = { ...next[idx], scoreA: parseInt(e.target.value, 10) || 0 };
                            setReportScoreSets(next);
                          }}
                        />
                        <span className="text-slate-300 font-black">-</span>
                        <input
                          type="tel"
                          className="w-16 h-12 text-center border-2 border-slate-200 rounded-lg font-mono text-xl font-bold focus:border-indigo-400 focus:outline-none bg-white"
                          placeholder="0"
                          value={set.scoreB}
                          onChange={e => {
                            const next = [...reportScoreSets];
                            next[idx] = { ...next[idx], scoreB: parseInt(e.target.value, 10) || 0 };
                            setReportScoreSets(next);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-3 text-sm">
                  <button
                    type="button"
                    className="flex-1 py-2 border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                    onClick={() => setReportScoreSets([...reportScoreSets, { scoreA: 0, scoreB: 0 }])}
                  >
                    <Plus size={16} /> {language === 'no' ? 'Legg til set' : 'Add set'}
                  </button>
                  {reportScoreSets.length > 1 && (
                    <button
                      type="button"
                      className="px-4 py-2 border border-red-100 text-red-500 rounded-lg font-bold hover:bg-red-50"
                      onClick={() => setReportScoreSets(reportScoreSets.slice(0, -1))}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSubmitReportScore}
                  disabled={reportScoreSubmitting}
                  className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 shadow-lg disabled:opacity-50"
                >
                  {reportScoreSubmitting ? (language === 'no' ? 'Sender...' : 'Submitting...') : t('match.report.submit')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Vis kamp (spilt eller kansellert) – erstatter kampdetalj-siden */}
      {viewMatchInModal && (() => {
        const m = viewMatchInModal;
        const pA = getUser(m.playerAId);
        const pB = getUser(m.playerBId);
        if (!pA || !pB) return null;
        const isParticipant = user && (m.playerAId === user.id || m.playerBId === user.id);
        const isReported = m.status === MatchStatus.REPORTED && m.score;
        const isConfirmed = m.status === MatchStatus.CONFIRMED && m.score;
        const isWalkover = m.status === MatchStatus.WALKOVER;
        const winnerName = m.score?.winnerId === pA.id ? pA.name : m.score?.winnerId === pB.id ? pB.name : null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-bold text-slate-900">{pA.name} {t('common.vs')} {pB.name}</h2>
                <button type="button" onClick={() => setViewMatchInModal(null)} className="text-slate-400 hover:text-slate-800 p-1">
                  <X size={22} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {isWalkover && (
                  <div className="text-center py-6">
                    <p className="text-slate-600 font-medium">{t('matches.tab.canceled')}</p>
                    <p className="text-slate-400 text-sm mt-1">{language === 'no' ? 'Kampen er kansellert.' : 'This match was canceled.'}</p>
                  </div>
                )}
                {(isConfirmed || isReported) && m.score && (
                  <div className="text-center">
                    <Trophy className="mx-auto text-amber-500 mb-2" size={28} />
                    <p className="text-slate-500 text-sm mb-3">{language === 'no' ? 'Resultat' : 'Result'}</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-3">
                      {m.score.sets.map((s, i) => (
                        <div key={i} className="bg-slate-100 px-4 py-2 rounded-lg text-xl font-mono font-bold text-slate-800 border border-slate-200">
                          {s.scoreA}–{s.scoreB}
                        </div>
                      ))}
                    </div>
                    {winnerName && <p className="text-slate-600 font-medium">{t('common.winner')}: {winnerName}</p>}
                    {isReported && isParticipant && (
                      <button
                        type="button"
                        onClick={handleConfirmScoreInModal}
                        disabled={confirmScoreSubmitting}
                        className="w-full mt-4 bg-lime-500 text-slate-900 py-3 rounded-xl font-bold hover:bg-lime-400 disabled:opacity-50"
                      >
                        {confirmScoreSubmitting ? (language === 'no' ? 'Bekrefter...' : 'Confirming...') : t('match.report.confirm')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
};
