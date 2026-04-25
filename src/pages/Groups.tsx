import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Users, Plus, Search, Users2, Calendar, MapPin, X, Camera, Edit2, UserCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import { toast } from 'react-hot-toast';
import { logActivity } from '../lib/activities';
import { ConfirmModal } from '../components/ConfirmModal';
import { cn } from '../lib/utils';

interface Group {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  members: string[];
  moderators?: string[];
  coverImage?: string;
  createdAt: any;
}

interface MemberProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // Moderation State
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, MemberProfile>>({});
  const [isManaging, setIsManaging] = useState(false);

  // Event Creation State
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '', coverImage: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      setGroups(groupsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!managingGroupId) return;
    const group = groups.find(g => g.id === managingGroupId);
    if (!group) return;

    const fetchMemberProfiles = async () => {
      const profiles: Record<string, MemberProfile> = {};
      const memberIds = group.members || [];
      
      // Fetch in batches of 10 to be safe
      for (let i = 0; i < memberIds.length; i += 10) {
        const batch = memberIds.slice(i, i + 10);
        const q = query(collection(db, 'users'), where('uid', 'in', batch));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
          const data = doc.data();
          profiles[doc.id] = {
            uid: doc.id,
            displayName: data.displayName || 'Anonymous',
            photoURL: data.photoURL
          };
        });
      }
      setMemberProfiles(profiles);
    };

    fetchMemberProfiles();
  }, [managingGroupId, groups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim() || !user) return;

    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        creatorId: user.uid,
        members: [user.uid],
        moderators: [],
        createdAt: serverTimestamp(),
      });

      await logActivity({
        userId: user.uid,
        type: 'join_group',
        targetId: docRef.id,
        targetName: newGroup.name.trim()
      });

      setNewGroup({ name: '', description: '' });
      setIsCreating(false);
      toast.success('Group created successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'groups');
      toast.error('Failed to create group.');
    }
  };

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
    if (!newEvent.title.trim() || !newEvent.date || !user || !selectedGroupId) return;

    setIsUploading(true);
    try {
      let coverImageUrl = '';
      if (imageFile) {
        coverImageUrl = await uploadImage(imageFile);
      }

      const docRef = await addDoc(collection(db, 'events'), {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        date: new Date(newEvent.date),
        location: newEvent.location.trim(),
        creatorId: user.uid,
        attendees: [user.uid],
        groupId: selectedGroupId,
        coverImage: coverImageUrl,
        createdAt: serverTimestamp(),
      });

      await logActivity({
        userId: user.uid,
        type: 'create_post', // Using create_post for events for now or we could add a new type
        targetId: docRef.id,
        targetName: `event: ${newEvent.title.trim()}`
      });
      
      setNewEvent({ title: '', description: '', date: '', location: '', coverImage: '' });
      setImageFile(null);
      setImagePreview(null);
      setIsCreatingEvent(false);
      setSelectedGroupId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleJoinGroup = async (groupId: string, members: string[]) => {
    if (!user) return;
    const groupRef = doc(db, 'groups', groupId);
    const isMember = members.includes(user.uid);
    const group = groups.find(g => g.id === groupId);
    const isCreator = group?.creatorId === user.uid;

    if (isMember && isCreator) {
      toast.error('Creators cannot leave their own group.');
      return;
    }

    try {
      await updateDoc(groupRef, {
        members: isMember ? arrayRemove(user.uid) : arrayUnion(user.uid),
        // If leaving, also remove from moderators
        moderators: isMember ? arrayRemove(user.uid) : arrayUnion(user.uid) // Wait, if joining, don't add to moderators
      });
      // Correct logic for moderators
      if (isMember) {
        await updateDoc(groupRef, {
          moderators: arrayRemove(user.uid)
        });
      }
      toast.success(isMember ? 'Left group.' : 'Joined group!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
      toast.error('Failed to update membership.');
    }
  };

  const handleToggleModerator = async (groupId: string, memberId: string, isModerator: boolean) => {
    if (!user) return;
    const groupRef = doc(db, 'groups', groupId);
    try {
      await updateDoc(groupRef, {
        moderators: isModerator ? arrayRemove(memberId) : arrayUnion(memberId)
      });
      toast.success(isModerator ? 'Moderator removed.' : 'Moderator appointed!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
      toast.error('Failed to update moderator status.');
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleRemoveMember = async (groupId: string, memberId: string) => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: 'REMOVE_MEMBER',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_REMOVE_THIS_MEMBER_FROM_THE_COMMUNITY_COUNCIL?',
      onConfirm: async () => {
        const groupRef = doc(db, 'groups', groupId);
        try {
          await updateDoc(groupRef, {
            members: arrayRemove(memberId),
            moderators: arrayRemove(memberId)
          });
          toast.success('Member removed from group.');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `groups/${groupId}`);
          toast.error('Failed to remove member.');
        }
      }
    });
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 glass-panel border-2 border-outline/15 p-12 lg:p-20 shadow-brutal relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 liquid-gradient" />
        <div className="space-y-4 relative z-10">
          <motion.h1 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-6xl lg:text-8xl font-headline font-black text-on-surface uppercase italic leading-none tracking-tighter"
          >
            THE_COMMUNITIES
          </motion.h1>
          <p className="text-2xl font-bold uppercase italic tracking-widest text-on-surface-variant leading-tight">FIND_YOUR_SQUAD_OF_LEGENDARY_FOUNDERS.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="liquid-btn px-12 py-6 text-3xl rotate-2 shrink-0 relative z-10 group"
        >
          <Plus className="w-10 h-10 stroke-[4px] group-hover:rotate-90 transition-transform" /> CREATE_COMMUNITY
        </button>
      </div>

      <div className="relative group">
        <div className="absolute -inset-4 liquid-gradient opacity-0 group-focus-within:opacity-10 transition-opacity blur-xl"></div>
        <div className="relative z-10">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-primary border-r-2 border-on-surface flex items-center justify-center">
            <Search className="w-12 h-12 text-on-surface stroke-[4px]" />
          </div>
          <input 
            type="text"
            placeholder="SEARCH_COMMUNITIES_BY_NAME_OR_VIBE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border-2 border-on-surface shadow-brutal pl-32 pr-8 py-10 text-3xl uppercase font-black italic tracking-tight focus:outline-none transition-all placeholder:text-on-surface-variant/20"
          />
        </div>
      </div>

      {isCreating && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="bg-surface-container-low border-2 border-outline/15 shadow-brutal p-12 lg:p-16 relative overflow-hidden rotate-1"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          
          <div className="flex items-center justify-between mb-12 border-b-2 border-outline/15 pb-8">
            <h2 className="text-5xl font-headline font-black uppercase italic tracking-tighter text-on-surface">Spawn_A_New_Community</h2>
            <button 
              onClick={() => setIsCreating(false)} 
              className="p-4 bg-surface border-2 border-on-surface hover:bg-secondary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
            >
              <X className="w-10 h-10 stroke-[4px] text-on-surface" />
            </button>
          </div>
          
          <form onSubmit={handleCreateGroup} className="space-y-12 relative z-10">
            <div className="space-y-4">
              <label className="flex items-center gap-4 bg-on-surface text-surface px-6 py-2 text-xs font-black uppercase tracking-widest italic w-fit">
                <Users2 className="w-6 h-6" /> Community_Name
              </label>
              <input 
                type="text" 
                required
                value={newGroup.name}
                onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                className="w-full bg-surface-container-lowest border-2 border-on-surface p-8 text-2xl font-bold uppercase italic shadow-brutal focus:outline-none transition-all"
                placeholder="e.g. SAAS_FOUNDERS_NYC"
              />
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-4 bg-on-surface text-surface px-6 py-2 text-xs font-black uppercase tracking-widest italic w-fit">
                <Sparkles className="w-6 h-6" /> The_Vibe (Description)
              </label>
              <textarea 
                required
                value={newGroup.description}
                onChange={e => setNewGroup({...newGroup, description: e.target.value})}
                className="w-full bg-surface-container-lowest border-2 border-on-surface p-8 text-2xl font-bold uppercase italic shadow-brutal focus:outline-none transition-all min-h-[200px] resize-none"
                placeholder="What's the energy of this community?"
              />
            </div>
            <div className="flex justify-end gap-8 pt-12 border-t-2 border-outline/15">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-12 py-6 text-2xl font-black text-on-surface-variant uppercase italic hover:text-on-surface transition-colors"
              >
                ABORT
              </button>
              <button 
                type="submit"
                className="liquid-btn px-16 py-6 text-3xl"
              >
                SPAWN_IT!
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <AnimatePresence>
          {filteredGroups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, scale: 0.9, rotate: index % 2 === 0 ? -2 : 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.02, rotate: index % 2 === 0 ? 1 : -1 }}
              className={cn(
                "bg-surface-container-low border-2 border-outline/15 shadow-brutal flex flex-col h-full group relative overflow-hidden",
                index % 2 === 0 ? "rotate-1" : "-rotate-1"
              )}
            >
              <div className="absolute top-0 left-0 w-full h-2 liquid-gradient"></div>
              
              <div className="p-10 pt-16 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-10">
                  <div className="w-24 h-24 bg-secondary border-2 border-on-surface shadow-brutal flex items-center justify-center shrink-0 -rotate-6 group-hover:rotate-6 transition-transform">
                    <Users2 className="w-12 h-12 text-on-secondary stroke-[3px]" />
                  </div>
                  <div className="flex flex-col items-end gap-4">
                    <span className="bg-secondary text-on-secondary border-2 border-on-surface px-6 py-2 font-black text-[10px] uppercase italic tracking-widest shadow-brutal flex items-center gap-3">
                      <Users className="w-5 h-5 stroke-[3px]" /> {group.members?.length || 0} FOUNDERS
                    </span>
                    {(group.members?.length || 0) > 5 && (
                      <span className="bg-tertiary text-on-surface border-2 border-on-surface px-6 py-2 font-black text-[10px] uppercase italic tracking-widest shadow-brutal flex items-center gap-2">
                        <Sparkles className="w-4 h-4 stroke-[3px]" /> TRENDING
                      </span>
                    )}
                    {group.creatorId === user?.uid && (
                      <span className="bg-primary text-on-surface border-2 border-on-surface px-6 py-2 font-black text-[10px] uppercase italic tracking-widest shadow-brutal">ADMIN_FOUNDER</span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-4xl font-headline font-black uppercase italic tracking-tighter mb-8 line-clamp-1 group-hover:text-secondary transition-colors flex items-center gap-4 text-on-surface">
                  {group.name}
                  <Sparkles className="w-8 h-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                </h3>
                <div className="bg-surface-container-lowest border-2 border-outline/15 p-8 mb-12 flex-1 relative shadow-brutal group-hover:bg-surface transition-colors">
                  <div className="absolute -top-4 -left-4 bg-on-surface text-surface px-4 py-1 text-[10px] font-black uppercase tracking-widest italic shadow-brutal">The_Vibe</div>
                  <p className="text-on-surface font-bold text-xl italic leading-tight">
                    "{group.description}"
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-6">
                    <Link 
                      to={`/groups/${group.id}`}
                      className="flex-1 bg-surface border-2 border-on-surface px-8 py-5 font-black uppercase italic text-xl shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-4 text-on-surface"
                    >
                      VIEW_COMMUNITY
                    </Link>
                    
                    <button 
                      onClick={() => toggleJoinGroup(group.id, group.members || [])}
                      className={cn(
                        "flex-1 border-2 border-on-surface px-8 py-5 font-black uppercase italic text-xl shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all",
                        group.members?.includes(user?.uid || '') 
                          ? 'bg-surface text-on-surface' 
                          : 'bg-secondary text-on-secondary'
                      )}
                    >
                      {group.members?.includes(user?.uid || '') ? 'LEAVE' : 'JOIN'}
                    </button>
                    
                    {(group.creatorId === user?.uid || group.moderators?.includes(user?.uid || '')) && (
                      <button
                        onClick={() => {
                          setManagingGroupId(group.id);
                          setIsManaging(true);
                        }}
                        className="bg-surface border-2 border-on-surface p-5 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all text-on-surface"
                        title="Manage Community"
                      >
                        <Edit2 className="w-10 h-10 stroke-[3px]" />
                      </button>
                    )}
                  </div>

                  {group.members?.includes(user?.uid || '') && (
                    <button 
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setIsCreatingEvent(true);
                      }}
                      className="w-full bg-primary border-2 border-on-surface px-8 py-5 font-black uppercase italic text-xl shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-4 text-on-surface"
                    >
                      <Calendar className="w-8 h-8 stroke-[3px]" /> BLAST_AN_EVENT
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Manage Members Modal */}
      <AnimatePresence>
        {isManaging && managingGroupId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-surface/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-surface-container-low border-2 border-outline/15 shadow-brutal w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 liquid-gradient" />
              <div className="p-10 border-b-2 border-outline/15 bg-secondary flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-5xl font-headline font-black uppercase italic tracking-tighter text-on-secondary">Community_Council</h3>
                  <p className="text-xs font-black uppercase tracking-widest text-on-secondary mt-4 bg-on-surface/20 px-4 py-1 inline-block border-2 border-on-surface">
                    {groups.find(g => g.id === managingGroupId)?.name.toUpperCase()}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsManaging(false);
                    setManagingGroupId(null);
                  }}
                  className="p-6 bg-surface border-2 border-on-surface hover:bg-primary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                >
                  <X className="w-10 h-10 stroke-[4px] text-on-surface" />
                </button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 space-y-8 bg-surface-container-low">
                {groups.find(g => g.id === managingGroupId)?.members?.map(memberId => {
                  const profile = memberProfiles[memberId];
                  const group = groups.find(g => g.id === managingGroupId)!;
                  const isCreator = group.creatorId === memberId;
                  const isModerator = group.moderators?.includes(memberId);
                  const currentUserIsCreator = group.creatorId === user?.uid;
                  const currentUserIsModerator = group.moderators?.includes(user?.uid || '');

                  return (
                    <div key={memberId} className="bg-surface-container-lowest border-2 border-outline/15 p-6 shadow-brutal flex items-center justify-between group/member hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                      <div className="flex items-center gap-6">
                        <Link to={`/profile/${memberId}`} className="w-20 h-20 border-2 border-on-surface shadow-brutal overflow-hidden group-hover/member:-rotate-6 transition-transform block hover:scale-105">
                          <img 
                            src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}`} 
                            alt={profile?.displayName}
                            className="w-full h-full object-cover grayscale group-hover/member:grayscale-0 transition-all"
                          />
                        </Link>
                        <div>
                          <Link to={`/profile/${memberId}`} className="text-2xl font-black uppercase italic tracking-tight text-on-surface flex items-center gap-3 hover:text-secondary transition-colors">
                            {profile?.displayName}
                          </Link>
                          <div className="flex gap-3 mt-2">
                            {isCreator && <span className="bg-on-surface text-surface text-[10px] px-3 py-1 font-black uppercase tracking-widest italic">ADMIN</span>}
                            {isModerator && !isCreator && <span className="bg-tertiary text-on-surface text-[10px] px-3 py-1 font-black uppercase tracking-widest italic border-2 border-on-surface">MOD</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {currentUserIsCreator && !isCreator && (
                          <button
                            onClick={() => handleToggleModerator(group.id, memberId, !!isModerator)}
                            className={cn(
                              "p-4 border-2 border-on-surface transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5",
                              isModerator ? "bg-primary text-on-surface" : "bg-surface hover:bg-primary"
                            )}
                            title={isModerator ? "Remove Moderator" : "Appoint Moderator"}
                          >
                            <UserCheck className={cn("w-8 h-8 stroke-[3px]", isModerator ? "text-on-surface" : "text-on-surface-variant/40")} />
                          </button>
                        )}
                        
                        {((currentUserIsCreator && !isCreator) || (currentUserIsModerator && !isCreator && !isModerator)) && (
                          <button
                            onClick={() => handleRemoveMember(group.id, memberId)}
                            className="p-4 border-2 border-on-surface bg-surface hover:bg-secondary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                            title="Remove Member"
                          >
                            <X className="w-8 h-8 stroke-[3px] text-on-surface" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {/* Event Creation Modal */}
        {isCreatingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-surface/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-surface-container-low border-2 border-outline/15 shadow-brutal w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] relative"
            >
              <div className="absolute top-0 left-0 w-full h-2 liquid-gradient" />
              <div className="p-10 border-b-2 border-outline/15 bg-primary flex items-center justify-between shrink-0">
                <h3 className="text-5xl font-headline font-black uppercase italic tracking-tighter text-on-surface">Blast_A_Community_Event</h3>
                <button 
                  onClick={() => {
                    setIsCreatingEvent(false);
                    setSelectedGroupId(null);
                  }}
                  className="p-6 bg-surface border-2 border-on-surface hover:bg-secondary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                >
                  <X className="w-10 h-10 stroke-[4px] text-on-surface" />
                </button>
              </div>

              <div className="p-12 overflow-y-auto flex-1 bg-surface-container-low">
                <form onSubmit={handleCreateEvent} className="space-y-12">
                  <div className="flex flex-col md:flex-row gap-12">
                    <div className="w-full md:w-1/3">
                      <label className="inline-block bg-on-surface text-surface px-6 py-2 text-xs font-black uppercase tracking-widest italic mb-6">Event_Visual</label>
                      <div 
                        onClick={() => document.getElementById('event-image-input')?.click()}
                        className="aspect-square bg-surface-container-lowest border-2 border-dashed border-outline/30 flex flex-col items-center justify-center cursor-pointer hover:bg-surface transition-all overflow-hidden relative group shadow-brutal"
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
                            <Camera className="w-16 h-16 text-on-surface-variant/20 mb-6 group-hover:text-secondary transition-all stroke-[3px]" />
                            <span className="text-xs font-black uppercase tracking-widest italic text-on-surface-variant">Upload_Visual</span>
                          </>
                        )}
                      </div>
                      <input 
                        id="event-image-input"
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1 space-y-10">
                      <div className="space-y-4">
                        <label className="inline-block bg-on-surface text-surface px-6 py-2 text-xs font-black uppercase tracking-widest italic">Event_Title</label>
                        <input 
                          type="text" 
                          required
                          value={newEvent.title}
                          onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                          className="w-full bg-surface-container-lowest border-2 border-on-surface p-6 text-2xl font-bold uppercase italic shadow-brutal focus:outline-none transition-all"
                          placeholder="e.g. MONTHLY_MASTERMIND"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="inline-block bg-on-surface text-surface px-6 py-2 text-xs font-black uppercase tracking-widest italic">Date_&_Time</label>
                          <input 
                            type="datetime-local" 
                            required
                            value={newEvent.date}
                            onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                            className="w-full bg-surface-container-lowest border-2 border-on-surface p-6 text-2xl font-bold uppercase italic shadow-brutal focus:outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="inline-block bg-on-surface text-surface px-6 py-2 text-xs font-black uppercase tracking-widest italic">Location_/_Cyber_Link</label>
                          <input 
                            type="text" 
                            required
                            value={newEvent.location}
                            onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                            className="w-full bg-surface-container-lowest border-2 border-on-surface p-6 text-2xl font-bold uppercase italic shadow-brutal focus:outline-none transition-all"
                            placeholder="e.g. ZOOM_OR_CAVE"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="inline-block bg-on-surface text-surface px-6 py-2 text-xs font-black uppercase tracking-widest italic">The_Mission (Description)</label>
                    <textarea 
                      required
                      value={newEvent.description}
                      onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                      className="w-full bg-surface-container-lowest border-2 border-on-surface p-8 text-2xl font-bold uppercase italic shadow-brutal focus:outline-none transition-all min-h-[180px] resize-none"
                      placeholder="What's the plan, founder?"
                    />
                  </div>
                  <div className="flex justify-end gap-8 pt-12 border-t-2 border-outline/15">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsCreatingEvent(false);
                        setSelectedGroupId(null);
                      }}
                      className="px-12 py-6 text-2xl font-black text-on-surface-variant uppercase italic hover:text-on-surface transition-colors"
                    >
                      ABORT
                    </button>
                    <button 
                      type="submit"
                      disabled={isUploading}
                      className="liquid-btn px-16 py-6 text-3xl disabled:opacity-50"
                    >
                      {isUploading ? 'BLASTING...' : 'BLAST_EVENT!'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filteredGroups.length === 0 && !isCreating && (
        <div className="bg-surface-container-low border-2 border-outline/15 border-dashed p-32 text-center space-y-12 shadow-brutal">
          <Users2 className="w-40 h-40 text-on-surface-variant/10 mx-auto mb-10 stroke-[2px]" />
          <h3 className="text-5xl font-headline font-black uppercase italic tracking-tighter mb-6 text-on-surface">No_Communities_Found</h3>
          <p className="text-2xl font-black uppercase tracking-[0.3em] text-on-surface-variant italic">Adjust_your_vibe_search_or_spawn_a_new_community.</p>
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
