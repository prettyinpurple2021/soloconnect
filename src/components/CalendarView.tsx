import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface Event {
  id: string;
  title: string;
  description: string;
  date: any;
  location: string;
  creatorId: string;
  attendees: string[];
  coverImage?: string;
  groupId?: string;
}

interface CalendarViewProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
}

export function CalendarView({ events, onEventClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
      return isSameDay(eventDate, day);
    });
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  return (
    <div className="bg-white border-[12px] border-black shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col lg:flex-row min-h-[700px] font-mono">
      {/* Calendar Grid */}
      <div className="flex-1 p-12 lg:p-16 border-r-[12px] border-black">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-12">
          <div>
            <h2 className="text-5xl font-black text-black uppercase italic tracking-tighter drop-shadow-[4px_4px_0px_#00FFFF]">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <p className="text-xl font-black uppercase italic tracking-widest text-black/40">ORCHESTRATE YOUR SOLO JOURNEY</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={prevMonth}
              className="p-4 bg-white border-8 border-black hover:bg-[#FF00FF] transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              <ChevronLeft className="w-8 h-8 text-black stroke-[4px]" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-8 py-4 bg-[#FFFF00] border-8 border-black text-black font-black text-xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              TODAY
            </button>
            <button 
              onClick={nextMonth}
              className="p-4 bg-white border-8 border-black hover:bg-[#FF00FF] transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              <ChevronRight className="w-8 h-8 text-black stroke-[4px]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-8 border-black bg-black gap-2">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="bg-white py-4 text-center border-b-8 border-black">
              <span className="text-sm font-black uppercase italic tracking-widest text-black/40">{day}</span>
            </div>
          ))}
          {calendarDays.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDay = isToday(day);

            return (
              <div 
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "bg-white min-h-[120px] p-4 cursor-pointer transition-all relative group border-black",
                  !isCurrentMonth && "bg-black/5 opacity-40",
                  isSelected && "bg-[#00FFFF]/10 ring-[8px] ring-inset ring-black z-10"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={cn(
                    "text-2xl font-black w-12 h-12 flex items-center justify-center border-4 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                    isTodayDay ? "bg-[#00FF00] text-black" : "bg-white text-black",
                    isSelected && !isTodayDay && "bg-black text-white"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className="flex -space-x-2">
                      {dayEvents.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-4 h-4 bg-[#FF00FF] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  {dayEvents.slice(0, 2).map(event => (
                    <div 
                      key={event.id}
                      className="text-[10px] font-black uppercase italic truncate bg-white text-black px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-black/40 font-black uppercase italic pl-1">
                      + {dayEvents.length - 2} MORE
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Details Sidebar */}
      <div className="w-full lg:w-[400px] bg-[#FFFF00]/5 p-12 lg:p-16 flex flex-col space-y-12">
        <div className="space-y-2">
          <h3 className="text-xl font-black uppercase italic tracking-widest text-black/40">
            {format(selectedDate, 'EEEE')}
          </h3>
          <h2 className="text-6xl font-black text-black uppercase italic tracking-tighter drop-shadow-[4px_4px_0px_#FF00FF]">
            {format(selectedDate, 'MMM d')}
          </h2>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => onEventClick?.(event)}
                  className="bg-white p-8 border-8 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-pointer group"
                >
                  <h4 className="text-2xl font-black text-black uppercase italic tracking-tighter group-hover:text-[#FF00FF] transition-colors mb-4">
                    {event.title}
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm font-black uppercase italic tracking-widest text-black/60">
                      <Clock className="w-5 h-5 text-[#FF00FF] stroke-[3px]" />
                      <span className="text-black">{event.date?.toDate ? format(event.date.toDate(), 'h:mm a') : format(new Date(event.date), 'h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-black uppercase italic tracking-widest text-black/60">
                      <MapPin className="w-5 h-5 text-[#00FFFF] stroke-[3px]" />
                      <span className="text-black truncate">{event.location}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 space-y-8"
              >
                <div className="w-24 h-24 bg-white border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mx-auto rotate-12">
                  <CalendarIcon className="w-12 h-12 text-black/10 stroke-[3px]" />
                </div>
                <p className="text-xl font-black uppercase italic tracking-widest text-black/40">NO EVENTS SCHEDULED FOR THIS DAY.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectedDayEvents.length > 0 && (
          <div className="pt-12 border-t-[8px] border-black space-y-8">
            <p className="text-sm font-black uppercase italic tracking-widest text-black/40">QUICK STATS</p>
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white p-6 border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[10px] font-black uppercase italic text-black/40 mb-2">ATTENDEES</p>
                <p className="text-4xl font-black text-black tracking-tighter">
                  {selectedDayEvents.reduce((acc, curr) => acc + (curr.attendees?.length || 0), 0)}
                </p>
              </div>
              <div className="bg-white p-6 border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-[10px] font-black uppercase italic text-black/40 mb-2">TOTAL EVENTS</p>
                <p className="text-4xl font-black text-black tracking-tighter">{selectedDayEvents.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
