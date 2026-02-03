import React, { useState, useEffect } from 'react';
import { format, addDays, setHours, setMinutes, isSameMonth } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';

interface DateTimeSelectorProps {
  onSelect: (isoString: string) => void;
  startDate?: Date;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({ onSelect, startDate = new Date() }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(startDate);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const { t, language } = useAppContext();

  useEffect(() => {
    setSelectedDate(startDate);
  }, [startDate]);

  // Generate next 60 days (approx 2 months) from the provided startDate
  const dates = Array.from({ length: 60 }, (_, i) => addDays(startDate, i));

  // Generate time slots (07:00 to 22:00)
  const timeSlots = Array.from({ length: 16 }, (_, i) => 7 + i);

  const handleTimeClick = (hour: number) => {
    setSelectedTime(hour);
    const dateWithTime = setMinutes(setHours(selectedDate, hour), 0);
    onSelect(dateWithTime.toISOString());
  };

  const formatTime = (hour: number) => {
      const date = setHours(new Date(), hour);
      if (language === 'no') {
          return format(date, 'HH:mm');
      }
      return format(date, 'h:mm a');
  };

  const formatDateLabel = (date: Date, type: 'month' | 'day' | 'num') => {
      const locale = language === 'no' ? nb : undefined;
      if (type === 'month') return format(date, 'MMM', { locale });
      if (type === 'day') return format(date, 'EEE', { locale });
      if (type === 'num') return format(date, 'd');
      return '';
  };

  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
      <div className="mb-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('match.proposal.selectDate')}</label>
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-1 px-1">
          {dates.map((date, index) => {
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const showMonth = index === 0 || !isSameMonth(date, dates[index - 1]);
            
            return (
              <div key={date.toISOString()} className="flex flex-col gap-1">
                {showMonth && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase pl-1">
                        {formatDateLabel(date, 'month')}
                    </span>
                )}
                <button
                    onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime(null); // Reset time when date changes
                    }}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-lg border transition-all ${
                    isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md transform scale-105'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-lime-400'
                    }`}
                >
                    <span className="text-[10px] uppercase font-bold">{formatDateLabel(date, 'day')}</span>
                    <span className="text-xl font-bold">{formatDateLabel(date, 'num')}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{t('match.proposal.selectTime')}</label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {timeSlots.map((hour) => {
            const isSelected = selectedTime === hour;
            return (
              <button
                key={hour}
                onClick={() => handleTimeClick(hour)}
                className={`py-2 rounded-md text-sm font-bold transition-all border ${
                  isSelected
                    ? 'bg-lime-400 border-lime-500 text-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {formatTime(hour)}
              </button>
            );
          })}
        </div>
      </div>
      
      {selectedTime === null && (
          <div className="mt-2 text-center text-xs text-slate-400 italic">
              {t('match.proposal.timeHelper')}
          </div>
      )}
    </div>
  );
};