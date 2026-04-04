import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
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
  isToday,
  startOfDay
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  Circle,
  X,
  AlertCircle,
  Repeat,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { cn } from '../lib/utils';

interface PersonalEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  date: any;
  type: 'event' | 'reminder' | 'task';
  completed: boolean;
  completedDates?: string[];
  excludedDates?: string[];
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  createdAt: any;
}

export function PersonalCalendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    description: '', 
    time: '12:00', 
    type: 'reminder' as const,
    recurrence: 'none' as const
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'personal_events'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PersonalEvent[];
      setEvents(eventsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'personal_events');
    });

    return () => unsubscribe();
  }, [user]);

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
      const dateStr = format(day, 'yyyy-MM-dd');

      if (event.excludedDates?.includes(dateStr)) return false;
      
      if (!event.recurrence || event.recurrence === 'none') {
        return isSameDay(eventDate, day);
      }

      // Check if the day is after or same as the start date
      if (startOfDay(day) < startOfDay(eventDate)) return false;

      switch (event.recurrence) {
        case 'daily':
          return true;
        case 'weekly':
          return eventDate.getDay() === day.getDay();
        case 'monthly':
          return eventDate.getDate() === day.getDate();
        default:
          return false;
      }
    });
  };

  const isEventCompletedOnDay = (event: PersonalEvent, day: Date) => {
    if (!event.recurrence || event.recurrence === 'none') {
      return event.completed;
    }
    const dateStr = format(day, 'yyyy-MM-dd');
    return event.completedDates?.includes(dateStr) || false;
  };

  const selectedDayEvents = getEventsForDay(selectedDate);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEvent.title.trim()) return;

    try {
      const [hours, minutes] = newEvent.time.split(':');
      const eventDate = new Date(selectedDate);
      eventDate.setHours(parseInt(hours), parseInt(minutes));

      await addDoc(collection(db, 'personal_events'), {
        userId: user.uid,
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        date: eventDate,
        type: newEvent.type,
        recurrence: newEvent.recurrence,
        completed: false,
        completedDates: [],
        excludedDates: [],
        createdAt: serverTimestamp()
      });

      setNewEvent({ title: '', description: '', time: '12:00', type: 'reminder', recurrence: 'none' });
      setIsAdding(false);
      toast.success('MISSION LOGGED!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'personal_events');
      toast.error('MISSION FAILED TO LOG');
    }
  };

  const toggleComplete = async (event: PersonalEvent, day: Date) => {
    try {
      if (!event.recurrence || event.recurrence === 'none') {
        await updateDoc(doc(db, 'personal_events', event.id), {
          completed: !event.completed
        });
      } else {
        const dateStr = format(day, 'yyyy-MM-dd');
        const currentCompletedDates = event.completedDates || [];
        const newCompletedDates = currentCompletedDates.includes(dateStr)
          ? currentCompletedDates.filter(d => d !== dateStr)
          : [...currentCompletedDates, dateStr];
        
        await updateDoc(doc(db, 'personal_events', event.id), {
          completedDates: newCompletedDates
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `personal_events/${event.id}`);
    }
  };

  const deleteEvent = async (eventId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'ABORT_MISSION',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_TERMINATE_THIS_DATA_STREAM?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'personal_events', eventId));
          toast.success('MISSION_ABORTED');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `personal_events/${eventId}`);
        }
      }
    });
  };

  const skipOccurrence = async (event: PersonalEvent, day: Date) => {
    setConfirmModal({
      isOpen: true,
      title: 'SKIP_NODE',
      message: 'BYPASS_THIS_SPECIFIC_TEMPORAL_NODE?',
      variant: 'warning',
      onConfirm: async () => {
        try {
          const dateStr = format(day, 'yyyy-MM-dd');
          const currentExcludedDates = event.excludedDates || [];
          await updateDoc(doc(db, 'personal_events', event.id), {
            excludedDates: [...currentExcludedDates, dateStr]
          });
          toast.success('NODE_BYPASSED');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `personal_events/${event.id}`);
        }
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-20 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-6xl lg:text-8xl font-black text-on-surface uppercase italic tracking-[-4px] leading-none">TIME_CAVE</h1>
          <div className="mt-4 bg-primary border-[4px] border-black px-4 py-2 shadow-kinetic-sm inline-block">
            <p className="text-black font-bold uppercase italic tracking-widest text-xs">TEMPORAL_COORDINATOR_V2.0</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="kinetic-btn flex items-center gap-3 group shrink-0"
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" /> SPAWN_MISSION
        </button>
      </div>

      <div className="bg-surface-container border-[8px] border-on-surface shadow-kinetic overflow-hidden flex flex-col lg:flex-row min-h-[700px]">
        {/* Calendar Grid */}
        <div className="flex-1 p-8 border-b-[8px] lg:border-b-0 lg:border-r-[8px] border-on-surface">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-4xl font-black text-on-surface uppercase italic tracking-tighter">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-3 bg-surface-bg border-[4px] border-on-surface shadow-kinetic-thud hover:bg-primary hover:text-black transition-all">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setCurrentMonth(new Date())}
                className="px-6 py-3 text-xs font-bold uppercase italic tracking-widest text-black bg-accent border-[4px] border-black shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                NOW
              </button>
              <button onClick={nextMonth} className="p-3 bg-surface-bg border-[4px] border-on-surface shadow-kinetic-thud hover:bg-primary hover:text-black transition-all">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-[4px] border-on-surface bg-on-surface gap-1 overflow-hidden">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="bg-on-surface py-4 text-center">
                <span className="text-[10px] font-bold uppercase italic tracking-widest text-surface-bg">{day}</span>
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
                    "bg-surface-bg min-h-[100px] p-3 cursor-pointer transition-all relative group",
                    !isCurrentMonth && "opacity-20",
                    isSelected && "bg-primary/10 ring-[6px] ring-inset ring-primary z-10"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn(
                      "text-lg font-black w-10 h-10 flex items-center justify-center border-[3px] border-on-surface transition-all",
                      isTodayDay ? "bg-secondary text-black shadow-kinetic-thud" : "text-on-surface",
                      isSelected && !isTodayDay && "bg-on-surface text-surface-bg shadow-kinetic-thud"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end max-w-[40px]">
                        {dayEvents.slice(0, 4).map((ev, i) => {
                          const isCompleted = isEventCompletedOnDay(ev, day);
                          return (
                            <div key={i} className={cn(
                              "w-2 h-2 border-2 border-on-surface",
                              isCompleted ? "bg-on-surface/20" : "bg-primary shadow-kinetic-thud"
                            )} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => {
                      const isCompleted = isEventCompletedOnDay(event, day);
                      return (
                        <div 
                          key={event.id}
                          className={cn(
                            "text-[8px] font-bold truncate px-2 py-1 border-[2px] border-on-surface uppercase italic flex items-center gap-1",
                            isCompleted 
                              ? "bg-on-surface/10 text-on-surface/40 border-on-surface/20 line-through" 
                              : "bg-accent text-black shadow-kinetic-thud"
                          )}
                        >
                          {event.recurrence && event.recurrence !== 'none' && <Repeat className="w-2 h-2" />}
                          {event.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Details Sidebar */}
        <div className="w-full lg:w-96 bg-surface-bg p-8 flex flex-col border-l-0 lg:border-l-[8px] border-on-surface">
          <div className="mb-10">
            <h3 className="text-[10px] font-bold uppercase italic tracking-widest text-on-surface/60 mb-1">
              {format(selectedDate, 'EEEE')}
            </h3>
            <h2 className="text-5xl font-black text-on-surface uppercase italic tracking-tighter leading-none">
              {format(selectedDate, 'MMM d')}
            </h2>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "bg-surface-container p-5 border-[4px] border-on-surface shadow-kinetic-sm group relative transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
                      isEventCompletedOnDay(event, selectedDate) && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <button 
                        onClick={() => toggleComplete(event, selectedDate)}
                        className="mt-1 text-on-surface hover:text-primary transition-colors"
                      >
                        {isEventCompletedOnDay(event, selectedDate) ? <CheckCircle2 className="w-7 h-7 text-primary" /> : <Circle className="w-7 h-7" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={cn(
                            "font-black text-xl text-on-surface uppercase italic tracking-tighter leading-none",
                            isEventCompletedOnDay(event, selectedDate) && "line-through text-on-surface/40"
                          )}>
                            {event.title}
                          </h4>
                          {event.recurrence && event.recurrence !== 'none' && (
                            <Repeat className="w-4 h-4 text-secondary" />
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs font-bold text-on-surface/60 mb-3 line-clamp-2 italic">{event.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[8px] font-bold uppercase italic tracking-wider">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.date?.toDate ? format(event.date.toDate(), 'h:mm a') : format(new Date(event.date), 'h:mm a')}
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 border-[2px] border-on-surface shadow-kinetic-thud",
                            event.type === 'task' ? "bg-primary text-black" : 
                            event.type === 'reminder' ? "bg-secondary text-black" : "bg-accent text-black"
                          )}>
                            {event.type}
                          </span>
                          {event.recurrence && event.recurrence !== 'none' && (
                            <span className="bg-on-surface text-surface-bg px-2 py-0.5 border-[2px] border-on-surface shadow-kinetic-thud">
                              {event.recurrence}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => deleteEvent(event.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-on-surface hover:text-secondary transition-all"
                          title="Delete entire series"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        {event.recurrence && event.recurrence !== 'none' && (
                          <button 
                            onClick={() => skipOccurrence(event, selectedDate)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-on-surface hover:text-accent transition-all"
                            title="Skip this occurrence"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16 bg-surface-container border-[4px] border-on-surface shadow-kinetic-sm rotate-2">
                  <div className="w-16 h-16 bg-accent border-[4px] border-on-surface flex items-center justify-center mx-auto mb-4 shadow-kinetic-thud">
                    <AlertCircle className="w-8 h-8 text-black" />
                  </div>
                  <p className="text-on-surface font-bold uppercase italic text-[10px] px-4 tracking-widest">CLEAR_SKIES_IN_THE_CAVE_TODAY</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-bg/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
              className="bg-surface-container border-[8px] border-on-surface w-full max-w-md shadow-kinetic overflow-hidden"
            >
              <div className="p-8 border-b-[8px] border-on-surface bg-secondary flex items-center justify-between">
                <div>
                  <h3 className="text-4xl font-black text-black uppercase italic tracking-tighter leading-none">SPAWN_MISSION</h3>
                  <p className="text-[10px] text-black font-bold uppercase italic tracking-widest mt-2">{format(selectedDate, 'MMMM d, yyyy')}</p>
                </div>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="p-3 bg-black text-secondary hover:bg-secondary hover:text-black border-[4px] border-black transition-all shadow-kinetic-thud"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddEvent} className="p-8 space-y-8">
                <div>
                  <label className="block text-[10px] font-bold uppercase italic tracking-widest text-on-surface/60 mb-3">MISSION_TITLE</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-surface-bg border-[4px] border-on-surface px-5 py-4 font-black uppercase italic text-lg focus:border-primary transition-all shadow-kinetic-thud focus:translate-x-1 focus:translate-y-1 focus:shadow-none outline-none"
                    placeholder="WHAT_NEEDS_TO_BE_DONE?"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold uppercase italic tracking-widest text-on-surface/60 mb-3">TIME</label>
                    <input 
                      type="time" 
                      required
                      value={newEvent.time}
                      onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                      className="w-full bg-surface-bg border-[4px] border-on-surface px-5 py-4 font-black uppercase italic focus:border-primary transition-all shadow-kinetic-thud focus:translate-x-1 focus:translate-y-1 focus:shadow-none outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase italic tracking-widest text-on-surface/60 mb-3">MISSION_TYPE</label>
                    <select 
                      value={newEvent.type}
                      onChange={e => setNewEvent({...newEvent, type: e.target.value as any})}
                      className="w-full bg-surface-bg border-[4px] border-on-surface px-5 py-4 font-black uppercase italic focus:border-primary transition-all shadow-kinetic-thud focus:translate-x-1 focus:translate-y-1 focus:shadow-none outline-none appearance-none"
                    >
                      <option value="reminder">REMINDER</option>
                      <option value="task">TASK</option>
                      <option value="event">EVENT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase italic tracking-widest text-on-surface/60 mb-3">RECURRENCE</label>
                  <select 
                    value={newEvent.recurrence}
                    onChange={e => setNewEvent({...newEvent, recurrence: e.target.value as any})}
                    className="w-full bg-surface-bg border-[4px] border-on-surface px-5 py-4 font-black uppercase italic focus:border-primary transition-all shadow-kinetic-thud focus:translate-x-1 focus:translate-y-1 focus:shadow-none outline-none appearance-none"
                  >
                    <option value="none">ONE-TIME_MISSION</option>
                    <option value="daily">DAILY_GRIND</option>
                    <option value="weekly">WEEKLY_RITUAL</option>
                    <option value="monthly">MONTHLY_MILESTONE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase italic tracking-widest text-on-surface/60 mb-3">INTEL (OPTIONAL)</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full bg-surface-bg border-[4px] border-on-surface px-5 py-4 font-black uppercase italic text-lg focus:border-primary transition-all min-h-[120px] resize-none shadow-kinetic-thud focus:translate-x-1 focus:translate-y-1 focus:shadow-none outline-none"
                    placeholder="ADD_SOME_DETAILS..."
                  />
                </div>

                <button
                  type="submit"
                  className="kinetic-btn w-full flex items-center justify-center gap-3"
                >
                  SAVE_MISSION <Zap className="w-6 h-6" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />
    </div>
  );
}
