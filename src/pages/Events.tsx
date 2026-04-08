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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 bg-primary border-[12px] border-on-surface p-12 lg:p-20 shadow-kinetic -rotate-1">
        <div className="space-y-4">
          <h1 className="text-6xl lg:text-8xl font-black text-black uppercase italic leading-none tracking-tighter drop-shadow-[6px_6px_0px_#FFFFFF]">THE GATHERING</h1>
          <p className="text-2xl font-black uppercase italic tracking-widest text-black/80 leading-tight">WHERE THE FOUNDERS UNITE IN THE REAL WORLD.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="bg-surface-bg border-8 border-on-surface p-2 flex items-center gap-2 shadow-kinetic-sm rotate-1">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-4 border-4 border-transparent transition-all",
                viewMode === 'list' ? "bg-secondary border-on-surface shadow-kinetic-thud text-white" : "text-on-surface/40 hover:text-on-surface"
              )}
            >
              <List className="w-8 h-8 stroke-[3px]" />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={cn(
                "p-4 border-4 border-transparent transition-all",
                viewMode === 'calendar' ? "bg-secondary border-on-surface shadow-kinetic-thud text-white" : "text-on-surface/40 hover:text-on-surface"
              )}
            >
              <LayoutGrid className="w-8 h-8 stroke-[3px]" />
            </button>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center gap-4 bg-accent border-8 border-on-surface text-black px-12 py-6 font-black text-3xl uppercase italic shadow-kinetic hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all rotate-2"
          >
            <Plus className="w-10 h-10 stroke-[4px]" /> BLAST EVENT
          </button>
        </div>
      </div>

      {(isCreating || isEditing) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary border-[12px] border-on-surface p-12 lg:p-20 shadow-kinetic rotate-1"
        >
          <div className="flex items-center justify-between mb-12 border-b-[10px] border-on-surface pb-8">
            <h2 className="text-5xl font-black text-black uppercase italic tracking-tighter">
              {isEditing ? 'REWIRE EVENT' : 'SPAWN A NEW EVENT'}
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
              className="p-4 bg-surface-bg border-8 border-on-surface hover:bg-secondary transition-all shadow-kinetic-thud active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              <X className="w-10 h-10 stroke-[4px]" />
            </button>
          </div>
          <form onSubmit={isEditing ? handleUpdateEvent : handleCreateEvent} className="space-y-12">
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="w-full lg:w-1/3">
                <label className="block text-2xl font-black text-on-surface uppercase italic tracking-tighter mb-4">EVENT VISUAL</label>
                <div 
                  onClick={() => document.getElementById('cover-image-input')?.click()}
                  className="aspect-video bg-surface-bg border-8 border-dashed border-on-surface flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors overflow-hidden relative group shadow-kinetic-sm"
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-16 h-16 text-white stroke-[3px]" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera className="w-16 h-16 text-on-surface/20 mb-4 group-hover:text-secondary transition-colors stroke-[3px]" />
                      <span className="text-xl font-black uppercase italic tracking-widest text-on-surface/40">UPLOAD VISUAL</span>
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
                  <label className="block text-2xl font-black text-on-surface uppercase italic tracking-tighter mb-4">EVENT TITLE</label>
                  <input 
                    type="text" 
                    required
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-surface-bg border-8 border-on-surface px-8 py-6 font-black uppercase italic text-2xl shadow-kinetic-sm focus:shadow-none focus:bg-secondary/10 transition-all outline-none"
                    placeholder="E.G. INDIE HACKERS COFFEE BLAST"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-2xl font-black text-on-surface uppercase italic tracking-tighter mb-4">DATE & TIME</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={newEvent.date}
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full bg-surface-bg border-8 border-on-surface px-8 py-6 font-black uppercase italic text-xl shadow-kinetic-sm focus:shadow-none focus:bg-secondary/10 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-2xl font-black text-on-surface uppercase italic tracking-tighter mb-4">LOCATION / CYBER LINK</label>
                    <input 
                      type="text" 
                      required
                      value={newEvent.location}
                      onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                      className="w-full bg-surface-bg border-8 border-on-surface px-8 py-6 font-black uppercase italic text-xl shadow-kinetic-sm focus:shadow-none focus:bg-secondary/10 transition-all outline-none"
                      placeholder="E.G. BLUE BOTTLE OR ZOOM"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-2xl font-black text-on-surface uppercase italic tracking-tighter">THE MISSION (DESCRIPTION)</label>
                <button
                  type="button"
                  onClick={handleAIAssist}
                  disabled={!newEvent.title.trim() || isGenerating || isUploading}
                  className="flex items-center gap-4 bg-surface-bg border-4 border-on-surface px-6 py-2 font-black uppercase italic text-sm tracking-widest shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  <Sparkles className={cn("w-6 h-6 stroke-[3px]", isGenerating ? 'animate-pulse' : '')} />
                  {isGenerating ? 'GENERATING...' : 'AI ASSIST'}
                </button>
              </div>
              <textarea 
                required
                value={newEvent.description}
                onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                className="w-full bg-surface-bg border-8 border-on-surface px-8 py-6 min-h-[200px] font-black uppercase italic text-xl shadow-kinetic-sm focus:shadow-none focus:bg-secondary/10 transition-all outline-none resize-none"
                placeholder="WHAT'S THE PLAN, FOUNDER?"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-8 pt-12 border-t-[10px] border-on-surface">
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
                className="px-12 py-6 text-2xl font-black text-on-surface uppercase italic hover:bg-on-surface/5 transition-colors"
              >
                ABORT
              </button>
              <button 
                type="submit"
                disabled={isUploading}
                className="bg-on-surface border-8 border-on-surface text-surface-bg px-16 py-6 font-black text-3xl uppercase italic shadow-kinetic hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-50 transition-all"
              >
                {isUploading ? 'BLASTING...' : isEditing ? 'REWIRE EVENT' : 'BLAST EVENT!'}
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
                  "bg-surface-bg border-[12px] border-on-surface p-12 lg:p-16 flex flex-col lg:flex-row gap-12 relative overflow-hidden group hover:bg-secondary/5 transition-colors shadow-kinetic",
                  index % 2 === 0 ? "rotate-1" : "-rotate-1"
                )}
              >
                {isEventToday && (
                  <div className="absolute top-0 right-0 bg-primary text-black text-xs font-black px-8 py-4 border-l-[10px] border-b-[10px] border-on-surface uppercase italic tracking-widest z-10 animate-pulse">
                    HAPPENING NOW
                  </div>
                )}
                
                {/* Date Block & Cover Image */}
                <div className="flex flex-col gap-8 shrink-0">
                  <div className="w-32 h-32 bg-secondary border-8 border-on-surface shadow-kinetic-sm flex flex-col items-center justify-center rotate-6 group-hover:rotate-0 transition-transform">
                    <span className="text-white font-black text-lg uppercase italic tracking-widest mb-1">
                      {format(eventDate, 'MMM')}
                    </span>
                    <span className="text-6xl font-black text-white leading-none tracking-tighter">
                      {format(eventDate, 'dd')}
                    </span>
                  </div>
                  {event.coverImage && (
                    <div className="w-32 h-32 border-8 border-on-surface shadow-kinetic-sm overflow-hidden -rotate-6 group-hover:rotate-0 transition-transform">
                      <img 
                        src={event.coverImage} 
                        alt={event.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-8">
                  <div className="flex flex-wrap items-center gap-6">
                    <h3 className="text-4xl lg:text-5xl font-black uppercase italic text-on-surface truncate tracking-tighter leading-none">{event.title}</h3>
                    {isTrending && (
                      <span className="bg-accent border-4 border-on-surface px-4 py-1 text-xs font-black uppercase italic shadow-kinetic-thud flex items-center gap-2">
                        <Sparkles className="w-4 h-4 stroke-[3px]" /> TRENDING
                      </span>
                    )}
                    {event.groupId && groups[event.groupId] && (
                      <span className="bg-secondary border-4 border-on-surface px-4 py-1 text-xs font-black uppercase italic shadow-kinetic-thud text-white">
                        {groups[event.groupId]}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold italic text-on-surface leading-tight">"{event.description}"</p>
                  
                  <div className="flex flex-wrap items-center gap-10 text-sm font-black uppercase italic tracking-widest text-on-surface/60">
                    <div className="flex items-center gap-4">
                      <Clock className="w-8 h-8 text-secondary stroke-[3px]" />
                      <span className="text-xl text-on-surface">{format(eventDate, 'h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <MapPin className="w-8 h-8 text-primary stroke-[3px]" />
                      <span className="text-xl text-on-surface truncate max-w-[300px]">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-on-surface text-surface-bg px-6 py-3 border-4 border-on-surface shadow-kinetic-thud">
                      <Users className="w-6 h-6 stroke-[3px]" />
                      <span className="text-lg">{event.attendees?.length || 0} FOUNDERS GOING</span>
                    </div>
                    
                    {/* Attendee Avatars */}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex -space-x-6 overflow-hidden">
                        {event.attendees.slice(0, 5).map((uid, i) => (
                          <div key={uid} className="w-14 h-14 border-4 border-on-surface shadow-kinetic-thud overflow-hidden rounded-full bg-surface-bg">
                            <img
                              className="w-full h-full object-cover"
                              src={`https://ui-avatars.com/api/?name=User+${i}&background=random`}
                              alt=""
                            />
                          </div>
                        ))}
                        {event.attendees.length > 5 && (
                          <div className="flex items-center justify-center w-14 h-14 border-4 border-on-surface bg-surface-bg shadow-kinetic-thud text-xs font-black text-on-surface rounded-full">
                            +{event.attendees.length - 5}
                          </div>
                        )}
                      </div>
                    )}

                    {isAttending && (
                      <div className="flex items-center gap-3 bg-primary border-4 border-on-surface px-4 py-2 text-black shadow-kinetic-thud">
                        <UserCheck className="w-6 h-6 stroke-[3px]" />
                        <span className="font-black">YOU'RE IN</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="flex flex-col items-center lg:items-end shrink-0 gap-8">
                  <button 
                    onClick={() => toggleRSVP(event.id, event.attendees || [])}
                    className={cn(
                      "w-full lg:w-auto border-8 border-on-surface px-10 py-4 font-black text-2xl uppercase italic shadow-kinetic-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all",
                      isAttending 
                        ? 'bg-surface-bg text-on-surface' 
                        : 'bg-secondary text-white'
                    )}
                  >
                    {isAttending ? 'CANCEL RSVP' : 'RSVP NOW'}
                  </button>
                  
                  {user?.uid === event.creatorId && (
                    <div className="flex flex-col w-full lg:w-auto gap-6">
                      <button
                        onClick={() => startEditing(event)}
                        className="w-full lg:w-auto bg-primary border-8 border-on-surface px-8 py-3 font-black text-lg uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-4"
                      >
                        <Edit2 className="w-6 h-6 stroke-[3px]" /> REWIRE
                      </button>
                      <button
                        onClick={() => openInviteModal(event)}
                        className="w-full lg:w-auto bg-accent border-8 border-on-surface px-8 py-3 font-black text-lg uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-4"
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
            <div className="bg-white border-[12px] border-black border-dashed p-32 text-center space-y-12 shadow-[24px_24px_0px_0px_rgba(0,0,0,1)]">
              <CalendarIcon className="w-32 h-32 text-black/10 mx-auto stroke-[3px]" />
              <div className="space-y-4">
                <h3 className="text-5xl font-black uppercase italic tracking-tighter">NO GATHERINGS YET</h3>
                <p className="text-xl font-black uppercase italic tracking-widest text-black/40">CHECK BACK LATER OR BLAST YOUR OWN EVENT.</p>
              </div>
              <button 
                onClick={() => setIsCreating(true)}
                className="bg-[#FFFF00] border-8 border-black text-black px-12 py-6 font-black text-3xl uppercase italic shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all"
              >
                CREATE AN EVENT
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-surface-bg border-[16px] border-on-surface w-full max-w-2xl overflow-hidden flex flex-col shadow-kinetic-active max-h-[90vh]"
            >
              <div className="p-10 border-b-[12px] border-on-surface bg-secondary flex items-center justify-between shrink-0">
                <h3 className="text-5xl font-black uppercase italic text-white tracking-tighter drop-shadow-[4px_4px_0px_#000000]">SUMMON FOUNDERS</h3>
                <button 
                  onClick={() => setInviteModalOpen(false)}
                  className="p-6 bg-surface-bg border-8 border-on-surface hover:bg-accent transition-all shadow-kinetic-thud active:shadow-none active:translate-x-2 active:translate-y-2"
                >
                  <X className="w-10 h-10 stroke-[4px]" />
                </button>
              </div>
              
              <div className="p-12 overflow-y-auto flex-1 bg-surface-bg space-y-8">
                {connections.length > 0 ? (
                  <div className="grid grid-cols-1 gap-8">
                    {connections.map(conn => (
                      <div 
                        key={conn.uid}
                        onClick={() => toggleConnectionSelection(conn.uid)}
                        className={cn(
                          "bg-surface-bg border-8 border-on-surface p-8 flex items-center gap-8 cursor-pointer transition-all shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
                          selectedConnections.includes(conn.uid) 
                            ? 'bg-primary/10 border-primary' 
                            : ''
                        )}
                      >
                        <div className="w-20 h-20 border-8 border-on-surface shadow-kinetic-thud overflow-hidden bg-surface-bg">
                          <img 
                            src={conn.photoURL || `https://ui-avatars.com/api/?name=${conn.displayName}`}
                            alt={conn.displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-3xl font-black uppercase italic text-on-surface flex-1 tracking-tighter">{conn.displayName}</span>
                        <div className={cn(
                          "w-12 h-12 border-8 border-on-surface flex items-center justify-center shadow-kinetic-thud",
                          selectedConnections.includes(conn.uid) ? 'bg-primary' : 'bg-surface-bg'
                        )}>
                          {selectedConnections.includes(conn.uid) && <div className="w-4 h-4 bg-black" />}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 space-y-8">
                    <Users className="w-32 h-32 text-on-surface/10 mx-auto stroke-[3px]" />
                    <p className="text-2xl font-black uppercase italic tracking-widest text-on-surface/40">YOU HAVE NO FOUNDERS TO SUMMON YET.</p>
                  </div>
                )}
              </div>
              
              <div className="p-12 border-t-[12px] border-on-surface bg-accent/10 shrink-0">
                <button
                  onClick={handleSendInvites}
                  disabled={selectedConnections.length === 0 || isInviting}
                  className="w-full bg-on-surface border-8 border-on-surface text-surface-bg py-10 font-black text-4xl uppercase italic shadow-kinetic hover:translate-x-2 hover:translate-y-2 hover:shadow-none disabled:opacity-50 transition-all"
                >
                  {isInviting ? 'SUMMONING...' : `SUMMON ${selectedConnections.length} FOUNDER${selectedConnections.length !== 1 ? 'S' : ''}`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
