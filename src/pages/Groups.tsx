import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Users, Plus, Search, Users2, Calendar, MapPin, X, Camera, Edit2, UserCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
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
      await addDoc(collection(db, 'groups'), {
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        creatorId: user.uid,
        members: [user.uid],
        moderators: [],
        createdAt: serverTimestamp(),
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

      await addDoc(collection(db, 'events'), {
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
      title: 'BANISH_TROLL',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_BANISH_THIS_MEMBER_FROM_THE_TRIBE_COUNCIL?',
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 bg-accent border-[12px] border-on-surface p-12 lg:p-20 shadow-kinetic -rotate-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary opacity-20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary opacity-20 blur-3xl rounded-full"></div>
        <div className="absolute top-10 left-1/4 w-8 h-8 bg-secondary border-4 border-on-surface rotate-12 animate-pulse hidden lg:block"></div>
        <div className="absolute bottom-10 right-1/3 w-6 h-6 bg-primary border-4 border-on-surface -rotate-12 animate-bounce hidden lg:block"></div>
        
        <div className="space-y-4 relative z-10">
          <motion.h1 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-6xl lg:text-8xl font-black text-surface-bg uppercase italic leading-none tracking-tighter drop-shadow-[6px_6px_0px_#FFFFFF]"
          >
            THE TRIBES
          </motion.h1>
          <p className="text-2xl font-black uppercase italic tracking-widest text-surface-bg leading-tight bg-on-surface px-6 py-2 border-4 border-on-surface inline-block shadow-kinetic-sm">FIND YOUR SQUAD OF LEGENDARY TROLLS.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="kinetic-btn bg-primary text-black px-12 py-6 text-3xl rotate-2 shrink-0 relative z-10 group"
        >
          <Plus className="w-10 h-10 stroke-[4px] group-hover:rotate-90 transition-transform" /> CREATE TRIBE
        </button>
      </div>

      <div className="relative group">
        <div className="absolute -inset-4 bg-secondary border-8 border-on-surface -rotate-1 z-0 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-primary border-r-8 border-on-surface flex items-center justify-center">
            <Search className="w-12 h-12 text-black stroke-[4px]" />
          </div>
          <input 
            type="text"
            placeholder="SEARCH TRIBES BY NAME OR VIBE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-bg border-[12px] border-on-surface shadow-kinetic-sm pl-32 pr-8 py-10 text-3xl uppercase font-black italic tracking-tight focus:outline-none focus:shadow-none focus:translate-x-2 focus:translate-y-2 transition-all placeholder:text-on-surface/20"
          />
        </div>
      </div>

      {isCreating && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="bg-accent border-[12px] border-on-surface shadow-kinetic p-12 lg:p-16 relative overflow-hidden rotate-1"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary border-l-[10px] border-b-[10px] border-on-surface -rotate-12 translate-x-10 -translate-y-10"></div>
          
          <div className="flex items-center justify-between mb-12 border-b-[10px] border-on-surface pb-8">
            <h2 className="text-5xl font-black uppercase italic tracking-tighter text-surface-bg drop-shadow-[4px_4px_0px_#FFFFFF]">Spawn A New Tribe</h2>
            <button 
              onClick={() => setIsCreating(false)} 
              className="p-4 bg-surface-bg border-8 border-on-surface hover:bg-secondary transition-all shadow-kinetic-thud active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              <X className="w-10 h-10 stroke-[4px]" />
            </button>
          </div>
          
          <form onSubmit={handleCreateGroup} className="space-y-12 relative z-10">
            <div className="space-y-4">
              <label className="flex items-center gap-4 bg-on-surface text-surface-bg px-6 py-2 text-xl font-black uppercase tracking-widest italic w-fit">
                <Users2 className="w-6 h-6" /> Tribe Name
              </label>
              <input 
                type="text" 
                required
                value={newGroup.name}
                onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                className="w-full bg-surface-bg border-8 border-on-surface p-8 text-2xl font-black uppercase italic shadow-kinetic-sm focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
                placeholder="e.g. SAAS TROLLS NYC"
              />
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-4 bg-on-surface text-surface-bg px-6 py-2 text-xl font-black uppercase tracking-widest italic w-fit">
                <Sparkles className="w-6 h-6" /> The Vibe (Description)
              </label>
              <textarea 
                required
                value={newGroup.description}
                onChange={e => setNewGroup({...newGroup, description: e.target.value})}
                className="w-full bg-surface-bg border-8 border-on-surface p-8 text-2xl font-black uppercase italic shadow-kinetic-sm focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all min-h-[200px] resize-none"
                placeholder="What's the energy of this tribe?"
              />
            </div>
            <div className="flex justify-end gap-8 pt-12 border-t-[10px] border-on-surface">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-12 py-6 text-2xl font-black text-on-surface uppercase italic hover:bg-on-surface/5 transition-colors"
              >
                ABORT
              </button>
              <button 
                type="submit"
                className="kinetic-btn bg-on-surface text-surface-bg px-16 py-6 text-3xl"
              >
                SPAWN IT!
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
                "bg-surface-container border-[12px] border-on-surface shadow-kinetic flex flex-col h-full group relative overflow-hidden",
                index % 2 === 0 ? "rotate-1" : "-rotate-1"
              )}
            >
              <div className="absolute top-0 left-0 w-full h-6 bg-secondary border-b-4 border-on-surface"></div>
              
              <div className="p-10 pt-16 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-10">
                  <div className="w-24 h-24 bg-secondary border-8 border-on-surface shadow-kinetic-sm flex items-center justify-center shrink-0 -rotate-6 group-hover:rotate-6 transition-transform">
                    <Users2 className="w-12 h-12 text-white stroke-[3px]" />
                  </div>
                  <div className="flex flex-col items-end gap-4">
                    <span className="bg-secondary text-white border-4 border-on-surface px-6 py-2 font-black text-sm uppercase italic tracking-widest shadow-kinetic-thud flex items-center gap-3">
                      <Users className="w-5 h-5 stroke-[3px]" /> {group.members?.length || 0} TROLLS
                    </span>
                    {(group.members?.length || 0) > 5 && (
                      <span className="bg-primary text-black border-4 border-on-surface px-6 py-2 font-black text-xs uppercase italic tracking-widest shadow-kinetic-thud flex items-center gap-2">
                        <Sparkles className="w-4 h-4 stroke-[3px]" /> TRENDING
                      </span>
                    )}
                    {group.creatorId === user?.uid && (
                      <span className="bg-primary text-black border-4 border-on-surface px-6 py-2 font-black text-xs uppercase italic tracking-widest shadow-kinetic-thud">CHIEF TROLL</span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-8 line-clamp-1 group-hover:text-secondary transition-colors flex items-center gap-4">
                  {group.name}
                  <Sparkles className="w-8 h-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                </h3>
                <div className="bg-surface-bg border-8 border-on-surface p-8 mb-12 flex-1 relative shadow-kinetic-sm group-hover:bg-accent/5 transition-colors">
                  <div className="absolute -top-4 -left-4 bg-on-surface text-surface-bg px-4 py-1 text-xs font-black uppercase tracking-widest italic shadow-kinetic-thud">The Vibe</div>
                  <p className="text-on-surface font-black text-xl italic leading-tight">
                    "{group.description}"
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex gap-6">
                    <button 
                      onClick={() => toggleJoinGroup(group.id, group.members || [])}
                      className={cn(
                        "flex-1 border-8 border-on-surface px-8 py-5 font-black uppercase italic text-xl shadow-kinetic-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all",
                        group.members?.includes(user?.uid || '') 
                          ? 'bg-surface-bg text-on-surface' 
                          : 'bg-secondary text-white'
                      )}
                    >
                      {group.members?.includes(user?.uid || '') ? 'LEAVE TRIBE' : 'JOIN TRIBE'}
                    </button>
                    
                    {(group.creatorId === user?.uid || group.moderators?.includes(user?.uid || '')) && (
                      <button
                        onClick={() => {
                          setManagingGroupId(group.id);
                          setIsManaging(true);
                        }}
                        className="bg-accent border-8 border-on-surface p-5 shadow-kinetic-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                        title="Manage Tribe"
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
                      className="w-full bg-primary border-8 border-on-surface px-8 py-5 font-black uppercase italic text-xl shadow-kinetic-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-4"
                    >
                      <Calendar className="w-8 h-8 stroke-[3px]" /> BLAST AN EVENT
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-surface-bg border-[16px] border-on-surface shadow-kinetic-active w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-10 border-b-[12px] border-on-surface bg-secondary flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-5xl font-black uppercase italic tracking-tighter text-white drop-shadow-[4px_4px_0px_#000000]">Tribe Council</h3>
                  <p className="text-lg font-black uppercase tracking-widest text-surface-bg mt-4 bg-on-surface/80 px-4 py-1 inline-block border-4 border-on-surface">
                    {groups.find(g => g.id === managingGroupId)?.name}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsManaging(false);
                    setManagingGroupId(null);
                  }}
                  className="p-6 bg-surface-bg border-8 border-on-surface hover:bg-secondary transition-all shadow-kinetic-thud active:shadow-none active:translate-x-2 active:translate-y-2"
                >
                  <X className="w-10 h-10 stroke-[4px]" />
                </button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 space-y-8 bg-surface-bg">
                {groups.find(g => g.id === managingGroupId)?.members?.map(memberId => {
                  const profile = memberProfiles[memberId];
                  const group = groups.find(g => g.id === managingGroupId)!;
                  const isCreator = group.creatorId === memberId;
                  const isModerator = group.moderators?.includes(memberId);
                  const currentUserIsCreator = group.creatorId === user?.uid;
                  const currentUserIsModerator = group.moderators?.includes(user?.uid || '');

                  return (
                    <div key={memberId} className="bg-surface-container border-8 border-on-surface p-6 shadow-kinetic-sm flex items-center justify-between group/member hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 border-8 border-on-surface shadow-kinetic-thud overflow-hidden group-hover/member:-rotate-6 transition-transform">
                          <img 
                            src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}`} 
                            alt={profile?.displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-2xl font-black uppercase italic tracking-tight text-on-surface flex items-center gap-3">
                            {profile?.displayName}
                          </p>
                          <div className="flex gap-3 mt-2">
                            {isCreator && <span className="bg-on-surface text-surface-bg text-[10px] px-3 py-1 font-black uppercase tracking-widest italic">CHIEF</span>}
                            {isModerator && !isCreator && <span className="bg-accent text-black text-[10px] px-3 py-1 font-black uppercase tracking-widest italic border-2 border-black">MOD</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {currentUserIsCreator && !isCreator && (
                          <button
                            onClick={() => handleToggleModerator(group.id, memberId, !!isModerator)}
                            className={cn(
                              "p-4 border-4 border-on-surface transition-all shadow-kinetic-thud active:shadow-none active:translate-x-1 active:translate-y-1",
                              isModerator ? "bg-primary text-black" : "bg-surface-bg hover:bg-primary"
                            )}
                            title={isModerator ? "Remove Moderator" : "Appoint Moderator"}
                          >
                            <UserCheck className={cn("w-8 h-8 stroke-[3px]", isModerator ? "text-black" : "text-on-surface/40")} />
                          </button>
                        )}
                        
                        {((currentUserIsCreator && !isCreator) || (currentUserIsModerator && !isCreator && !isModerator)) && (
                          <button
                            onClick={() => handleRemoveMember(group.id, memberId)}
                            className="p-4 border-4 border-on-surface bg-surface-bg hover:bg-secondary transition-all shadow-kinetic-thud active:shadow-none active:translate-x-1 active:translate-y-1"
                            title="Banish Troll"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="bg-surface-bg border-[16px] border-on-surface shadow-kinetic-active w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-10 border-b-[12px] border-on-surface bg-primary flex items-center justify-between shrink-0">
                <h3 className="text-5xl font-black uppercase italic tracking-tighter text-black">Blast A Tribe Event</h3>
                <button 
                  onClick={() => {
                    setIsCreatingEvent(false);
                    setSelectedGroupId(null);
                  }}
                  className="p-6 bg-surface-bg border-8 border-on-surface hover:bg-secondary transition-all shadow-kinetic-thud active:shadow-none active:translate-x-2 active:translate-y-2"
                >
                  <X className="w-10 h-10 stroke-[4px]" />
                </button>
              </div>

              <div className="p-12 overflow-y-auto flex-1 bg-surface-bg">
                <form onSubmit={handleCreateEvent} className="space-y-12">
                  <div className="flex flex-col md:flex-row gap-12">
                    <div className="w-full md:w-1/3">
                      <label className="inline-block bg-on-surface text-surface-bg px-6 py-2 text-sm font-black uppercase tracking-widest italic mb-6">Event Visual</label>
                      <div 
                        onClick={() => document.getElementById('event-image-input')?.click()}
                        className="aspect-square bg-surface-bg border-8 border-dashed border-on-surface flex flex-col items-center justify-center cursor-pointer hover:bg-accent/10 transition-all overflow-hidden relative group shadow-kinetic-sm active:shadow-none active:translate-x-1 active:translate-y-1"
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
                            <Camera className="w-16 h-16 text-on-surface/20 mb-6 group-hover:text-secondary transition-all stroke-[3px]" />
                            <span className="text-sm font-black uppercase tracking-widest italic text-on-surface">Upload Visual</span>
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
                        <label className="inline-block bg-on-surface text-surface-bg px-6 py-2 text-sm font-black uppercase tracking-widest italic">Event Title</label>
                        <input 
                          type="text" 
                          required
                          value={newEvent.title}
                          onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                          className="w-full bg-surface-bg border-8 border-on-surface p-6 text-2xl font-black uppercase italic shadow-kinetic-sm focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
                          placeholder="e.g. MONTHLY MASTERMIND"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="inline-block bg-on-surface text-surface-bg px-6 py-2 text-sm font-black uppercase tracking-widest italic">Date & Time</label>
                          <input 
                            type="datetime-local" 
                            required
                            value={newEvent.date}
                            onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                            className="w-full bg-surface-bg border-8 border-on-surface p-6 text-2xl font-black uppercase italic shadow-kinetic-sm focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="inline-block bg-on-surface text-surface-bg px-6 py-2 text-sm font-black uppercase tracking-widest italic">Location / Cyber Link</label>
                          <input 
                            type="text" 
                            required
                            value={newEvent.location}
                            onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                            className="w-full bg-surface-bg border-8 border-on-surface p-6 text-2xl font-black uppercase italic shadow-kinetic-sm focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
                            placeholder="e.g. ZOOM OR CAVE"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="inline-block bg-on-surface text-surface-bg px-6 py-2 text-sm font-black uppercase tracking-widest italic">The Mission (Description)</label>
                    <textarea 
                      required
                      value={newEvent.description}
                      onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                      className="w-full bg-surface-bg border-8 border-on-surface p-8 text-2xl font-black uppercase italic shadow-kinetic-sm focus:outline-none focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all min-h-[180px] resize-none"
                      placeholder="What's the plan, troll?"
                    />
                  </div>
                  <div className="flex justify-end gap-8 pt-12 border-t-[12px] border-on-surface">
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsCreatingEvent(false);
                        setSelectedGroupId(null);
                      }}
                      className="px-12 py-6 text-2xl font-black text-on-surface uppercase italic hover:bg-on-surface/5 transition-colors"
                    >
                      ABORT
                    </button>
                    <button 
                      type="submit"
                      disabled={isUploading}
                      className="kinetic-btn bg-on-surface text-surface-bg px-16 py-6 text-3xl disabled:opacity-50"
                    >
                      {isUploading ? 'BLASTING...' : 'BLAST EVENT!'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filteredGroups.length === 0 && !isCreating && (
        <div className="bg-accent/10 border-[12px] border-dashed border-on-surface text-center py-40 shadow-kinetic rotate-1">
          <Users2 className="w-40 h-40 text-on-surface/10 mx-auto mb-10 stroke-[2px]" />
          <h3 className="text-5xl font-black uppercase italic tracking-tighter mb-6 text-on-surface">No Tribes Found</h3>
          <p className="text-2xl font-black uppercase tracking-[0.3em] text-on-surface/40 italic">Adjust your vibe search or spawn a new tribe.</p>
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
