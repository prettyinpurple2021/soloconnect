import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Calendar as CalendarIcon, MapPin, Plus, Clock, Users, Share2, X, Edit2, Camera, UserCheck, Sparkles, LayoutGrid, List } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { generateEventDescription } from '../services/geminiService';
import { cn } from '../lib/utils';
import { CalendarView } from '../components/CalendarView';

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
  createdAt: any;
}

interface Connection {
  uid: string;
  displayName: string;
  photoURL: string;
}

export function Events() {
  const { user, userProfile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '', coverImage: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      
      setEvents(eventsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const groupsMap: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        groupsMap[doc.id] = doc.data().name;
      });
      setGroups(groupsMap);
    });
    return () => unsubscribe();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File) => {
    const storageRef = ref(storage, `events/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.date || !user) return;

    setIsUploading(true);
    try {
      let coverImageUrl = newEvent.coverImage;
      if (imageFile) {
        coverImageUrl = await uploadImage(imageFile);
      }

      await addDoc(collection(db, 'events'), {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        date: new Date(newEvent.date),
        location: newEvent.location.trim(),
        creatorId: user.uid,
        attendees: [user.uid],
        coverImage: coverImageUrl,
        createdAt: serverTimestamp(),
      });
      setNewEvent({ title: '', description: '', date: '', location: '', coverImage: '' });
      setImageFile(null);
      setImagePreview(null);
      setIsCreating(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventId || !newEvent.title.trim() || !newEvent.date || !user) return;

    setIsUploading(true);
    try {
      let coverImageUrl = newEvent.coverImage;
      if (imageFile) {
        coverImageUrl = await uploadImage(imageFile);
      }

      await updateDoc(doc(db, 'events', editingEventId), {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        date: new Date(newEvent.date),
        location: newEvent.location.trim(),
        coverImage: coverImageUrl,
        updatedAt: serverTimestamp(),
      });
      setNewEvent({ title: '', description: '', date: '', location: '', coverImage: '' });
      setImageFile(null);
      setImagePreview(null);
      setIsEditing(false);
      setEditingEventId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${editingEventId}`);
    } finally {
      setIsUploading(false);
    }
  };

  const startEditing = (event: Event) => {
    const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
    // Format date for datetime-local input: YYYY-MM-DDTHH:mm
    const formattedDate = eventDate.toISOString().slice(0, 16);
    
    setNewEvent({
      title: event.title,
      description: event.description,
      date: formattedDate,
      location: event.location,
      coverImage: event.coverImage || ''
    });
    setImagePreview(event.coverImage || null);
    setEditingEventId(event.id);
    setIsEditing(true);
    setIsCreating(false);
  };

  const toggleRSVP = async (eventId: string, attendees: string[]) => {
    if (!user) {
      toast.error('Please sign in to RSVP');
      return;
    }
    const eventRef = doc(db, 'events', eventId);
    const isAttending = attendees.includes(user.uid);
    const toastId = toast.loading(isAttending ? 'Removing RSVP...' : 'Registering RSVP...');

    try {
      await updateDoc(eventRef, {
        attendees: isAttending ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
      toast.success(isAttending ? 'RSVP removed' : 'RSVP confirmed!', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `events/${eventId}`);
      toast.error('Failed to update RSVP', { id: toastId });
    }
  };

  const handleCheckIn = async (eventId: string) => {
    if (!user) return;
    const toastId = toast.loading('Initiating check-in sequence...');
    try {
      await addDoc(collection(db, `events/${eventId}/checkins`), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        timestamp: serverTimestamp()
      });
      toast.success('CHECK_IN_COMPLETE. TRANSMISSION_SECURE.', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `events/${eventId}/checkins`);
      toast.error('CHECK_IN_FAILED.', { id: toastId });
    }
  };

  const openInviteModal = async (event: Event) => {
    setSelectedEvent(event);
    setInviteModalOpen(true);
    setSelectedConnections([]);
    
    if (userProfile?.connections && userProfile.connections.length > 0) {
      try {
        // Fetch connection details
        // Note: Firestore 'in' query supports up to 30 items. 
        // For a real app, you might need to chunk this if connections > 30.
        const chunks = [];
        for (let i = 0; i < userProfile.connections.length; i += 30) {
          chunks.push(userProfile.connections.slice(i, i + 30));
        }
        
        const allConnections: Connection[] = [];
        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            const data = doc.data();
            allConnections.push({
              uid: data.uid,
              displayName: data.displayName,
              photoURL: data.photoURL
            });
          });
        }
        setConnections(allConnections);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users (connections)');
      }
    }
  };

  const handleSendInvites = async () => {
    if (!user || !selectedEvent || selectedConnections.length === 0) return;
    
    setIsInviting(true);
    try {
      const batch = writeBatch(db);
      
      selectedConnections.forEach(connectionId => {
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
          userId: connectionId,
          type: 'event_invite',
          sourceUserId: user.uid,
          sourceUserName: user.displayName || 'Someone',
          sourceUserPhoto: user.photoURL || '',
          content: `invited you to ${selectedEvent.title}`,
          link: `/events`,
          read: false,
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      setInviteModalOpen(false);
      setSelectedConnections([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications (batch)');
    } finally {
      setIsInviting(false);
    }
  };

  const toggleConnectionSelection = (uid: string) => {
    setSelectedConnections(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleAIAssist = async () => {
    if (!newEvent.title.trim()) {
      toast.error('Please enter an event title first.');
      return;
    }
    
    setIsGenerating(true);
    const toastId = toast.loading('AI is writing your event description...');
    try {
      const generated = await generateEventDescription(newEvent.title, newEvent.description);
      setNewEvent(prev => ({ ...prev, description: generated }));
      toast.success('AI description ready!', { id: toastId });
    } catch (error) {
      toast.error('AI failed to generate description.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 glass-panel border-2 border-outline/15 p-12 lg:p-20 shadow-brutal relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 liquid-gradient" />
        <div className="space-y-4 relative z-10">
          <h1 className="text-6xl lg:text-8xl font-headline font-black text-on-surface uppercase italic leading-none tracking-tighter">THE_GATHERING</h1>
          <p className="text-2xl font-bold uppercase italic tracking-widest text-on-surface-variant leading-tight">WHERE_THE_FOUNDERS_UNITE_IN_THE_REAL_WORLD.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-8 relative z-10">
          <div className="bg-surface-container-low border-2 border-outline/15 p-2 flex items-center gap-2 shadow-brutal rotate-1">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-4 border-2 border-transparent transition-all",
                viewMode === 'list' ? "bg-secondary border-on-surface shadow-brutal text-on-secondary" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <List className="w-8 h-8 stroke-[3px]" />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "p-4 border-2 border-transparent transition-all",
                viewMode === 'calendar' ? "bg-secondary border-on-surface shadow-brutal text-on-secondary" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <LayoutGrid className="w-8 h-8 stroke-[3px]" />
            </button>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="liquid-btn flex items-center justify-center gap-4 px-12 py-6 font-headline font-black text-3xl uppercase italic rotate-2"
          >
            <Plus className="w-10 h-10 stroke-[4px]" /> BLAST_EVENT
          </button>
        </div>
      </div>

      {(isCreating || isEditing) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-low border-2 border-outline/15 p-12 lg:p-20 shadow-brutal rotate-1 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <div className="flex items-center justify-between mb-12 border-b-2 border-outline/15 pb-8">
            <h2 className="text-5xl font-headline font-black text-on-surface uppercase italic tracking-tighter">
              {isEditing ? 'REWIRE_EVENT' : 'SPAWN_A_NEW_EVENT'}
            </h2>
            <button 
              onClick={() => {
                setIsCreating(false);
                setIsEditing(false);
                setEditingEventId(null);
                setNewEvent({ title: '', description: '', date: '', location: '', coverImage: '' });
                setImageFile(null);
                setImagePreview(null);
              }}
              className="p-4 bg-surface border-2 border-on-surface hover:bg-secondary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
            >
              <X className="w-10 h-10 stroke-[4px] text-on-surface" />
            </button>
          </div>
          <form onSubmit={isEditing ? handleUpdateEvent : handleCreateEvent} className="space-y-12">
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="w-full lg:w-1/3">
                <label className="block text-xs font-black text-on-surface-variant uppercase italic tracking-tighter mb-4">EVENT_VISUAL</label>
                <div 
                  onClick={() => document.getElementById('cover-image-input')?.click()}
                  className="aspect-video bg-surface-container-lowest border-2 border-dashed border-outline/30 flex flex-col items-center justify-center cursor-pointer hover:bg-surface transition-all overflow-hidden relative group shadow-brutal"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                      <div className="absolute inset-0 bg-surface/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-16 h-16 text-on-surface stroke-[3px]" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera className="w-16 h-16 text-on-surface-variant/20 mb-4 group-hover:text-secondary transition-colors stroke-[3px]" />
                      <span className="text-xl font-black uppercase italic tracking-widest text-on-surface-variant/40">UPLOAD_VISUAL</span>
                    </>
                  )}
                </div>
                <input 
                  id="cover-image-input"
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1 space-y-8">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase italic tracking-tighter mb-4">EVENT_TITLE</label>
                  <input 
                    type="text" 
                    required
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-surface-container-lowest border-2 border-on-surface px-8 py-6 font-bold uppercase italic text-2xl shadow-brutal focus:outline-none transition-all"
                    placeholder="E.G. INDIE_HACKERS_COFFEE_BLAST"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase italic tracking-tighter mb-4">DATE_&_TIME</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full bg-surface-container-lowest border-2 border-on-surface px-8 py-6 font-bold uppercase italic text-xl shadow-brutal focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase italic tracking-tighter mb-4">LOCATION_/_CYBER_LINK</label>
                    <input 
                      type="text" 
                      required
                      value={newEvent.location}
                      onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                      className="w-full bg-surface-container-lowest border-2 border-on-surface px-8 py-6 font-bold uppercase italic text-xl shadow-brutal focus:outline-none transition-all"
                      placeholder="E.G. BLUE_BOTTLE_OR_ZOOM"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-xs font-black text-on-surface-variant uppercase italic tracking-tighter">THE_MISSION (DESCRIPTION)</label>
                <button
                  type="button"
                  onClick={handleAIAssist}
                  disabled={!newEvent.title.trim() || isGenerating || isUploading}
                  className="flex items-center gap-4 bg-surface border-2 border-on-surface px-6 py-2 font-black uppercase italic text-xs tracking-widest shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all text-on-surface"
                >
                  <Sparkles className={cn("w-6 h-6 stroke-[3px]", isGenerating ? 'animate-pulse' : '')} />
                  {isGenerating ? 'GENERATING...' : 'AI_ASSIST'}
                </button>
              </div>
              <textarea 
                required
                value={newEvent.description}
                onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                className="w-full bg-surface-container-lowest border-2 border-on-surface px-8 py-6 min-h-[200px] font-bold uppercase italic text-xl shadow-brutal focus:outline-none transition-all outline-none resize-none"
                placeholder="WHAT'S_THE_PLAN_FOUNDER?"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-8 pt-12 border-t-2 border-outline/15">
              <button 
                type="button" 
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  setEditingEventId(null);
                  setNewEvent({ title: '', description: '', date: '', location: '', coverImage: '' });
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="px-12 py-6 text-2xl font-black text-on-surface-variant uppercase italic hover:text-on-surface transition-colors"
              >
                ABORT
              </button>
              <button 
                type="submit"
                disabled={isUploading}
                className="liquid-btn px-16 py-6 font-headline font-black text-3xl uppercase italic"
              >
                {isUploading ? 'BLASTING...' : isEditing ? 'REWIRE_EVENT' : 'BLAST_EVENT!'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {viewMode === 'calendar' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <CalendarView events={events} />
        </motion.div>
      ) : (
        <div className="space-y-12">
          <AnimatePresence>
            {events.map((event, index) => {
            const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
            const isAttending = event.attendees?.includes(user?.uid || '');
            const isEventToday = isToday(eventDate);
            const isTrending = (event.attendees?.length || 0) > 5;
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "bg-surface-container-low border-2 border-outline/15 p-12 lg:p-16 flex flex-col lg:flex-row gap-12 relative overflow-hidden group hover:bg-surface-container-lowest transition-colors shadow-brutal",
                  index % 2 === 0 ? "rotate-1" : "-rotate-1"
                )}
              >
                {isEventToday && isAttending && (
                  <div className="absolute top-0 right-0 z-20">
                    <DigitalLanyard user={userProfile} eventTitle={event.title} />
                  </div>
                )}
                
                {isEventToday && (
                  <div className="absolute top-0 right-0 bg-primary text-on-surface text-[10px] font-black px-8 py-4 border-l-2 border-b-2 border-on-surface uppercase italic tracking-widest z-10 animate-pulse">
                    HAPPENING_NOW
                  </div>
                )}
                
                {/* Date Block & Cover Image */}
                <div className="flex flex-col gap-8 shrink-0">
                  <div className="w-32 h-32 bg-secondary border-2 border-on-surface shadow-brutal flex flex-col items-center justify-center rotate-6 group-hover:rotate-0 transition-transform">
                    <span className="text-on-secondary font-black text-lg uppercase italic tracking-widest mb-1">
                      {format(eventDate, 'MMM').toUpperCase()}
                    </span>
                    <span className="text-6xl font-headline font-black text-on-secondary leading-none tracking-tighter">
                      {format(eventDate, 'dd')}
                    </span>
                  </div>
                  {event.coverImage && (
                    <div className="w-32 h-32 border-2 border-on-surface shadow-brutal overflow-hidden -rotate-6 group-hover:rotate-0 transition-transform">
                      <img 
                        src={event.coverImage} 
                        alt={event.title} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-8">
                  <div className="flex flex-wrap items-center gap-6">
                    <h3 className="text-4xl lg:text-5xl font-headline font-black uppercase italic text-on-surface truncate tracking-tighter leading-none">{event.title}</h3>
                    {isTrending && (
                      <span className="bg-tertiary border-2 border-on-surface px-4 py-1 text-[10px] font-black uppercase italic shadow-brutal flex items-center gap-2 text-on-surface">
                        <Sparkles className="w-4 h-4 stroke-[3px]" /> TRENDING
                      </span>
                    )}
                    {event.groupId && groups[event.groupId] && (
                      <span className="bg-secondary border-2 border-on-surface px-4 py-1 text-[10px] font-black uppercase italic shadow-brutal text-on-secondary">
                        {groups[event.groupId].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold italic text-on-surface leading-tight">"{event.description}"</p>
                  
                  <div className="flex flex-wrap items-center gap-10 text-sm font-black uppercase italic tracking-widest text-on-surface-variant">
                    <div className="flex items-center gap-4">
                      <Clock className="w-8 h-8 text-secondary stroke-[3px]" />
                      <span className="text-xl text-on-surface">{format(eventDate, 'h:mm a').toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <MapPin className="w-8 h-8 text-primary stroke-[3px]" />
                      <span className="text-xl text-on-surface truncate max-w-[300px]">{event.location.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-surface border-2 border-on-surface px-6 py-3 shadow-brutal">
                      <Users className="w-6 h-6 stroke-[3px] text-on-surface" />
                      <span className="text-lg text-on-surface">{event.attendees?.length || 0} FOUNDERS_GOING</span>
                    </div>
                    
                    {/* Attendee Avatars */}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex -space-x-6 overflow-hidden">
                        {event.attendees.slice(0, 5).map((uid, i) => (
                          <div key={uid} className="w-14 h-14 border-2 border-on-surface shadow-brutal overflow-hidden rounded-full bg-surface">
                            <img
                              className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all"
                              src={`https://ui-avatars.com/api/?name=User+${i}&background=random`}
                              alt=""
                            />
                          </div>
                        ))}
                        {event.attendees.length > 5 && (
                          <div className="flex items-center justify-center w-14 h-14 border-2 border-on-surface bg-surface shadow-brutal text-xs font-black text-on-surface rounded-full">
                            +{event.attendees.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {isAttending && (
                    <div className="flex flex-col w-full lg:w-auto gap-4">
                      <div className="flex items-center gap-3 bg-primary border-2 border-on-surface px-4 py-2 text-on-surface shadow-brutal">
                        <UserCheck className="w-6 h-6 stroke-[3px]" />
                        <span className="font-black">YOU'RE_IN</span>
                      </div>
                      {isEventToday && (
                        <button
                          onClick={() => handleCheckIn(event.id)}
                          className="bg-accent text-on-accent border-2 border-on-surface px-6 py-2 font-black uppercase italic text-xs shadow-brutal hover:shadow-none translate-all"
                        >
                          LIVE_CHECK_IN
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="flex flex-col items-center lg:items-end shrink-0 gap-8">
                  <button 
                    onClick={() => toggleRSVP(event.id, event.attendees || [])}
                    className={cn(
                      "w-full lg:w-auto border-2 border-on-surface px-10 py-4 font-black text-2xl uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all",
                      isAttending 
                        ? 'bg-surface text-on-surface' 
                        : 'bg-secondary text-on-secondary'
                    )}
                  >
                    {isAttending ? 'CANCEL_RSVP' : 'RSVP_NOW'}
                  </button>
                  
                  {user?.uid === event.creatorId && (
                    <div className="flex flex-col w-full lg:w-auto gap-6">
                      <button
                        onClick={() => startEditing(event)}
                        className="w-full lg:w-auto bg-surface border-2 border-on-surface px-8 py-3 font-black text-lg uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-4 text-on-surface"
                      >
                        <Edit2 className="w-6 h-6 stroke-[3px]" /> REWIRE
                      </button>
                      <button
                        onClick={() => openInviteModal(event)}
                        className="w-full lg:w-auto bg-surface border-2 border-on-surface px-8 py-3 font-black text-lg uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-4 text-on-surface"
                      >
                        <Share2 className="w-6 h-6 stroke-[3px]" /> INVITE
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
            })}
          </AnimatePresence>

          {events.length === 0 && !isCreating && (
            <div className="bg-surface-container-low border-2 border-outline/15 border-dashed p-32 text-center space-y-12 shadow-brutal">
              <CalendarIcon className="w-32 h-32 text-on-surface-variant/10 mx-auto stroke-[3px]" />
              <div className="space-y-4">
                <h3 className="text-5xl font-headline font-black uppercase italic tracking-tighter text-on-surface">NO_GATHERINGS_YET</h3>
                <p className="text-xl font-black uppercase italic tracking-widest text-on-surface-variant">CHECK_BACK_LATER_OR_BLAST_YOUR_OWN_EVENT.</p>
              </div>
              <button 
                onClick={() => setIsCreating(true)}
                className="liquid-btn px-12 py-6 font-headline font-black text-3xl uppercase italic"
              >
                CREATE_AN_EVENT
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-surface/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-surface-container-low border-2 border-outline/15 w-full max-w-2xl overflow-hidden flex flex-col shadow-brutal max-h-[90vh] relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 liquid-gradient" />
              <div className="p-10 border-b-2 border-outline/15 bg-secondary flex items-center justify-between shrink-0">
                <h3 className="text-5xl font-headline font-black uppercase italic text-on-secondary tracking-tighter">SUMMON_FOUNDERS</h3>
                <button 
                  onClick={() => setInviteModalOpen(false)}
                  className="p-6 bg-surface border-2 border-on-surface hover:bg-primary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                >
                  <X className="w-10 h-10 stroke-[4px] text-on-surface" />
                </button>
              </div>
              
              <div className="p-12 overflow-y-auto flex-1 bg-surface-container-low space-y-8">
                {connections.length > 0 ? (
                  <div className="grid grid-cols-1 gap-8">
                    {connections.map(conn => (
                      <div 
                        key={conn.uid}
                        onClick={() => toggleConnectionSelection(conn.uid)}
                        className={cn(
                          "bg-surface-container-lowest border-2 border-outline/15 p-8 flex items-center gap-8 cursor-pointer transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5",
                          selectedConnections.includes(conn.uid) 
                            ? 'bg-primary/5 border-primary' 
                            : ''
                        )}
                      >
                        <div className="w-20 h-20 border-2 border-on-surface shadow-brutal overflow-hidden bg-surface">
                          <img 
                            src={conn.photoURL || `https://ui-avatars.com/api/?name=${conn.displayName}`}
                            alt={conn.displayName}
                            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all"
                          />
                        </div>
                        <span className="text-3xl font-black uppercase italic text-on-surface flex-1 tracking-tighter">{conn.displayName}</span>
                        <div className={cn(
                          "w-12 h-12 border-2 border-on-surface flex items-center justify-center shadow-brutal transition-all",
                          selectedConnections.includes(conn.uid) ? 'bg-primary' : 'bg-surface'
                        )}>
                          {selectedConnections.includes(conn.uid) && <div className="w-4 h-4 bg-on-surface" />}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 space-y-8">
                    <Users className="w-32 h-32 text-on-surface-variant/10 mx-auto stroke-[3px]" />
                    <p className="text-2xl font-black uppercase italic tracking-widest text-on-surface-variant/40">YOU_HAVE_NO_FOUNDERS_TO_SUMMON_YET.</p>
                  </div>
                )}
              </div>
              
              <div className="p-12 border-t-2 border-outline/15 bg-surface-container-low shrink-0">
                <button
                  onClick={handleSendInvites}
                  disabled={selectedConnections.length === 0 || isInviting}
                  className="liquid-btn w-full py-10 font-headline font-black text-4xl uppercase italic"
                >
                  {isInviting ? 'SUMMONING...' : `SUMMON_${selectedConnections.length}_FOUNDER${selectedConnections.length !== 1 ? 'S' : ''}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DigitalLanyard({ user, eventTitle }: { user: any, eventTitle: string }) {
  return (
    <motion.div
      initial={{ y: -50, x: 50, rotate: 15 }}
      animate={{ y: -10, x: 10, rotate: 0 }}
      className="bg-surface border-4 border-on-surface p-4 w-32 shadow-brutal-lg rotate-1 flex flex-col items-center gap-2"
    >
      <div className="w-full h-1 liquid-gradient mb-2" />
      <div className="w-16 h-16 border-2 border-on-surface shadow-brutal overflow-hidden">
        <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} alt="" className="w-full h-full object-cover grayscale" />
      </div>
      <div className="text-[6px] font-black uppercase italic tracking-tighter text-on-surface text-center line-clamp-1">{user?.displayName}</div>
      <div className="w-full border-t-2 border-outline/15 pt-1">
        <div className="text-[5px] font-mono text-on-surface-variant uppercase text-center">{eventTitle}</div>
      </div>
      <div className="bg-primary border-2 border-on-surface w-full py-0.5 text-[5px] font-black text-center text-on-surface uppercase italic">ACCESS_GRANTED</div>
    </motion.div>
  );
}
