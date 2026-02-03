import React from 'react';
import { Sun, Cloud, Moon, Check } from 'lucide-react';
import { DayOfWeek, TimeSlot } from '../types';
import { useAppContext } from '../context/AppContext';

interface AvailabilitySelectorProps {
  availability: Partial<Record<DayOfWeek, TimeSlot[]>>;
  onChange: (newAvailability: Partial<Record<DayOfWeek, TimeSlot[]>>) => void;
  readOnly?: boolean;
}

export const AvailabilitySelector: React.FC<AvailabilitySelectorProps> = ({ availability, onChange, readOnly = false }) => {
  const { language } = useAppContext();
  const days: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Mapping for display names
  const dayLabels: Record<string, Record<DayOfWeek, string>> = {
      en: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' },
      no: { Mon: 'Man', Tue: 'Tir', Wed: 'Ons', Thu: 'Tor', Fri: 'Fre', Sat: 'Lør', Sun: 'Søn' }
  };

  const toggleAvailability = (day: DayOfWeek, slot: TimeSlot) => {
    if (readOnly) return;
    
    const currentDaySlots = availability[day] || [];
    let newDaySlots;
    
    if (currentDaySlots.includes(slot)) {
      newDaySlots = currentDaySlots.filter(s => s !== slot);
    } else {
      newDaySlots = [...currentDaySlots, slot];
    }

    const newAvailability = {
      ...availability,
      [day]: newDaySlots
    };

    onChange(newAvailability);
  };

  const isAvailable = (day: DayOfWeek, slot: TimeSlot) => {
    return availability[day]?.includes(slot) || false;
  };

  return (
    <div className="w-full">
        {/* Legend / Explanation */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
             <div className="flex items-center justify-center gap-1">
                 <Sun size={12} className="text-amber-500" /> 06:00 - 11:00
             </div>
             <div className="flex items-center justify-center gap-1">
                 <Cloud size={12} className="text-blue-400" /> 12:00 - 17:00
             </div>
             <div className="flex items-center justify-center gap-1">
                 <Moon size={12} className="text-indigo-500" /> 18:00 - 23:00
             </div>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 mb-2 text-center items-end">
            <div className="text-xs font-bold text-slate-300"></div>
            <div className="flex flex-col items-center justify-end pb-1">
                <Sun size={18} className="text-amber-500" />
            </div>
            <div className="flex flex-col items-center justify-end pb-1">
                <Cloud size={18} className="text-blue-400" />
            </div>
            <div className="flex flex-col items-center justify-end pb-1">
                <Moon size={18} className="text-indigo-500" />
            </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
            {days.map(day => (
                <div key={day} className="grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 items-center h-10">
                    {/* Day Label */}
                    <div className="text-xs font-bold text-slate-600 text-center bg-slate-50 h-full flex items-center justify-center rounded">
                        {dayLabels[language][day]}
                    </div>

                    {/* Time Slots */}
                    {(['morning', 'midday', 'evening'] as TimeSlot[]).map(slot => {
                    const active = isAvailable(day, slot);
                    return (
                        <button
                            key={slot}
                            onClick={() => toggleAvailability(day, slot)}
                            disabled={readOnly}
                            type="button"
                            className={`h-full w-full rounded-lg flex items-center justify-center transition-all border ${
                                active 
                                ? 'bg-lime-400 border-lime-500 text-slate-900 shadow-sm' 
                                : 'bg-white border-slate-100 text-slate-200 hover:border-lime-200'
                            } ${readOnly ? 'cursor-default' : ''}`}
                        >
                            {active && <Check size={20} strokeWidth={3} />}
                        </button>
                    );
                    })}
                </div>
            ))}
        </div>
    </div>
  );
};