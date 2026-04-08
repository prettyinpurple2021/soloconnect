import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, arrayUnion, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MapPin, Link as LinkIcon, Edit2, Briefcase, Calendar, Mail, Check, X, UserPlus, UserCheck, Activity, Image as ImageIcon, ExternalLink, Camera, Globe, Twitter, Linkedin, Github, MessageSquare, Zap, Ghost, Star, Trophy, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toggleUserConnection } from '../lib/connections';
import { cn } from '../lib/utils';
import { UserActivity } from '../components/UserActivity';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router';

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  link?: string;
  imageUrl?: string;
  createdAt: number;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  coverURL?: string;
  bio: string;
  skills: string[];
  location: string;
  links: { [key: string]: string };
  portfolio: PortfolioItem[];
  connections: string[];
  blockedUsers?: string[];
  founderType?: 'Bootstrapper' | 'Visionary' | 'Builder' | 'Specialist';
  momentum?: number;
  isVerified?: boolean;
  createdAt: any;
  updatedAt?: any;
}

export function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, userProfile: currentUserProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'portfolio' | 'activity'>('portfolio');

  // Portfolio Modal State
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', link: '' });
  const [projectImage, setProjectImage] = useState<File | null>(null);
  const [projectImagePreview, setProjectImagePreview] = useState<string | null>(null);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  const isOwner = currentUser?.uid === userId;
  const isConnected = currentUserProfile?.connections?.includes(userId || '');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
          setEditForm(docSnap.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProjectImage(file);
      setProjectImagePreview(URL.createObjectURL(file));
    }
  };

  const handleProfileImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (isEditing) {
        setProfileImage(file);
        setProfileImagePreview(URL.createObjectURL(file));
      } else {
        if (!userId || !isOwner) return;
        const toastId = toast.loading('UPLOADING_NEW_FACE...');
        try {
          const imageRef = ref(storage, `profiles/${userId}/${Date.now()}_${file.name}`);
          await uploadBytes(imageRef, file);
          const photoURL = await getDownloadURL(imageRef);
          
          await updateDoc(doc(db, 'users', userId), {
            photoURL,
            updatedAt: serverTimestamp()
          });
          
          if (profile) {
            setProfile({ ...profile, photoURL });
          }
          toast.success('FACE_SWAP_COMPLETE!', { id: toastId });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
          toast.error('UPLOAD_FAILED_FOUNDER!', { id: toastId });
        }
      }
    }
  };

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !isOwner || !newProject.title.trim() || !newProject.description.trim()) return;

    setIsSubmittingProject(true);
    try {
      let imageUrl = '';
      if (projectImage) {
        const imageRef = ref(storage, `portfolio/${userId}/${Date.now()}_${projectImage.name}`);
        await uploadBytes(imageRef, projectImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const projectData: PortfolioItem = {
        id: Date.now().toString(),
        title: newProject.title.trim(),
        description: newProject.description.trim(),
        link: newProject.link.trim(),
        imageUrl,
        createdAt: Date.now(),
      };

      await updateDoc(doc(db, 'users', userId), {
        portfolio: arrayUnion(projectData)
      });

      if (profile) {
        setProfile({
          ...profile,
          portfolio: [...(profile.portfolio || []), projectData]
        });
      }

      setIsAddingProject(false);
      setNewProject({ title: '', description: '', link: '' });
      setProjectImage(null);
      if (projectImagePreview) URL.revokeObjectURL(projectImagePreview);
      setProjectImagePreview(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const navigate = useNavigate();

  const handleSaveProfile = async () => {
    if (!userId || !isOwner) return;
    const toastId = toast.loading('Saving profile...');
    try {
      let photoURL = profile?.photoURL || '';
      let coverURL = profile?.coverURL || '';
      
      if (profileImage) {
        const imageRef = ref(storage, `profiles/${userId}/${Date.now()}_${profileImage.name}`);
        await uploadBytes(imageRef, profileImage);
        photoURL = await getDownloadURL(imageRef);
      }

      if (coverImage) {
        const coverRef = ref(storage, `covers/${userId}/${Date.now()}_${coverImage.name}`);
        await uploadBytes(coverRef, coverImage);
        coverURL = await getDownloadURL(coverRef);
      }

      const updatedData = {
        bio: editForm.bio || '',
        location: editForm.location || '',
        displayName: editForm.displayName || profile?.displayName,
        skills: editForm.skills || [],
        links: editForm.links || {},
        founderType: editForm.founderType || 'Bootstrapper',
        photoURL,
        coverURL,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'users', userId), updatedData);
      
      setProfile({ ...profile, ...updatedData } as UserProfile);
      setIsEditing(false);
      setProfileImage(null);
      setCoverImage(null);
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
      if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
      setProfileImagePreview(null);
      setCoverImagePreview(null);
      toast.success('Profile saved.', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      toast.error('Failed to save profile.', { id: toastId });
    }
  };

  const handleToggleConnection = async () => {
    if (!currentUser || !userId) return;
    try {
      await toggleUserConnection(currentUser, userId, !!isConnected);
      // Optimistically update local profile state for immediate feedback
      if (profile) {
        setProfile({
          ...profile,
          connections: isConnected 
            ? (profile.connections || []).filter(id => id !== currentUser.uid)
            : [...(profile.connections || []), currentUser.uid]
        });
      }
      toast.success(isConnected ? 'Connection removed.' : 'Connection request sent.');
    } catch (error) {
      toast.error('Failed to update connection.');
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

  const handleStartChat = () => {
    if (userId) {
      navigate(`/messages?chat=${userId}`);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUser || !userId) return;
    setConfirmModal({
      isOpen: true,
      title: 'BLOCK_USER',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_SEVER_THIS_CONNECTION_AND_ERASE_THEIR_DATA_STREAM_FROM_YOUR_VIEW?',
      onConfirm: async () => {
        const toastId = toast.loading('Blocking user...');
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            blockedUsers: arrayUnion(userId)
          });
          // Also remove connection if exists
          if (isConnected) {
            await toggleUserConnection(currentUser, userId, true);
          }
          toast.success('User blocked.', { id: toastId });
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          navigate('/');
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
          toast.error('Failed to block user.', { id: toastId });
        }
      }
    });
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!userId || !isOwner || !profile) return;
    setConfirmModal({
      isOpen: true,
      title: 'DELETE_PROJECT',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_WIPE_THIS_ACHIEVEMENT_FROM_THE_STASH?',
      onConfirm: async () => {
        try {
          const updatedPortfolio = profile.portfolio.filter(p => p.id !== projectId);
          await updateDoc(doc(db, 'users', userId), {
            portfolio: updatedPortfolio
          });
          setProfile({ ...profile, portfolio: updatedPortfolio });
          toast.success('Project deleted.');
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
          toast.error('Failed to delete project.');
        }
      }
    });
  };

  const handleShareProfile = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Profile link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link.');
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-24 h-24 border-[12px] border-on-surface border-t-primary rounded-none animate-spin shadow-kinetic-sm"></div>
      </div>
    );
  }

  if (!profile || currentUserProfile?.blockedUsers?.includes(userId || '')) {
    return (
      <div className="bg-secondary border-[10px] border-on-surface text-center py-32 shadow-kinetic">
        <Ghost className="w-32 h-32 text-black mx-auto mb-10 animate-bounce" />
        <h3 className="text-5xl font-black text-black uppercase italic mb-4 drop-shadow-[4px_4px_0px_#fff]">FOUNDER_NOT_FOUND!</h3>
        <p className="text-black font-bold uppercase tracking-widest bg-surface-bg border-[4px] border-black px-6 py-3 inline-block shadow-kinetic-thud">THIS_FOUNDER_MIGHT_BE_HIDING_IN_A_CAVE.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20 font-sans">
      {/* Header / Cover */}
      <div className="relative h-80 bg-on-surface border-[10px] border-on-surface shadow-kinetic overflow-hidden group">
        {(coverImagePreview || profile.coverURL) ? (
          <img 
            src={coverImagePreview || profile.coverURL} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-secondary opacity-40 bg-[radial-gradient(circle_at_50%_120%,_#ff00ff_0%,_transparent_50%)]"></div>
        )}
        
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

        {isEditing && (
          <button 
            onClick={() => coverImageInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <div className="flex flex-col items-center gap-4 text-white">
              <Camera className="w-16 h-16" />
              <span className="font-black text-xl uppercase italic tracking-tighter bg-black border-[4px] border-white px-6 py-2">BLAST_NEW_COVER</span>
            </div>
          </button>
        )}
        <input 
          type="file" 
          ref={coverImageInputRef} 
          onChange={handleCoverImageSelect} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* Profile Info */}
      <div className="px-10 -mt-40 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
            <div className="relative group">
              <div className="w-56 h-56 border-[10px] border-on-surface shadow-kinetic-sm bg-surface-bg overflow-hidden relative rotate-[-2deg]">
                <img 
                  src={profileImagePreview || profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
                  alt={profile.displayName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {isOwner && (
                  <button 
                    onClick={() => profileImageInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Camera className="w-12 h-12" />
                      <span className="font-black text-xs uppercase italic tracking-tighter bg-black border-[2px] border-white px-3 py-1">REPLACE_FACE</span>
                    </div>
                  </button>
                )}
              </div>
              {isOwner && (
                <button 
                  onClick={() => profileImageInputRef.current?.click()}
                  className="absolute -top-4 -left-4 bg-primary border-[4px] border-on-surface p-3 shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all z-20"
                  title="Upload New Face"
                >
                  <Camera className="w-6 h-6" />
                </button>
              )}
              <div className="absolute -bottom-6 -right-6 bg-accent border-[4px] border-on-surface p-4 shadow-kinetic-thud rotate-[12deg]">
                <Star className="w-10 h-10 fill-secondary" />
              </div>
              <input 
                type="file" 
                ref={profileImageInputRef} 
                onChange={handleProfileImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            <div className="mb-6 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editForm.displayName || ''} 
                    onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                    className="bg-accent border-[4px] border-on-surface px-4 py-2 text-4xl font-black uppercase italic shadow-kinetic-thud focus:outline-none"
                  />
                ) : (
                  <h1 className="text-7xl font-black text-on-surface uppercase italic drop-shadow-[6px_6px_0px_#00FFFF] flex items-center gap-6 tracking-tighter leading-none">
                    {profile.displayName}
                    {profile.isVerified && (
                      <div className="bg-primary border-[4px] border-on-surface p-2 shadow-kinetic-thud" title="Verified Founder">
                        <Check className="w-6 h-6 stroke-[4px]" />
                      </div>
                    )}
                  </h1>
                )}
              </div>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                {isEditing ? (
                  <select 
                    value={editForm.founderType || 'Bootstrapper'}
                    onChange={e => setEditForm({...editForm, founderType: e.target.value as any})}
                    className="bg-surface-bg border-[4px] border-on-surface px-4 py-2 font-bold uppercase italic text-sm shadow-kinetic-thud focus:outline-none"
                  >
                    <option value="Bootstrapper">Bootstrapper</option>
                    <option value="Visionary">Visionary</option>
                    <option value="Builder">Builder</option>
                    <option value="Specialist">Specialist</option>
                  </select>
                ) : (
                  <span className="bg-secondary border-[4px] border-on-surface px-4 py-1 text-black font-bold text-sm uppercase italic shadow-kinetic-thud">{profile.founderType || 'Solo King'}</span>
                )}
                <span className="bg-primary border-[4px] border-on-surface px-4 py-1 text-black font-bold text-sm uppercase italic shadow-kinetic-thud">{profile.connections?.length || 0} TRIBE_MEMBERS</span>
                <span className="bg-accent border-[4px] border-on-surface px-4 py-1 text-black font-bold text-sm uppercase italic shadow-kinetic-thud">LVL {Math.floor(Math.random() * 50) + 1}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-6 mb-8">
            <button 
              onClick={handleShareProfile}
              className="bg-primary border-[4px] border-on-surface p-4 shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              title="Share Profile"
            >
              <Globe className="w-8 h-8" />
            </button>
            
            {isOwner && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="kinetic-btn bg-accent flex items-center gap-3"
              >
                <Edit2 className="w-6 h-6" /> EDIT
              </button>
            )}
            
            {isOwner && isEditing && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="bg-surface-bg border-[4px] border-on-surface px-8 py-4 font-black text-xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-3"
                >
                  <X className="w-6 h-6" /> CANCEL
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="kinetic-btn flex items-center gap-3"
                >
                  <Check className="w-6 h-6" /> SAVE
                </button>
              </div>
            )}
            
            {!isOwner && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleToggleConnection}
                  className={cn(
                    "kinetic-btn flex items-center gap-3",
                    isConnected 
                      ? "bg-primary" 
                      : "bg-secondary text-black"
                  )}
                >
                  {isConnected ? (
                    <><UserCheck className="w-6 h-6" /> TRIBE</>
                  ) : (
                    <><UserPlus className="w-6 h-6" /> JOIN</>
                  )}
                </button>
                <button
                  onClick={handleStartChat}
                  className="kinetic-btn bg-primary flex items-center gap-3"
                >
                  <MessageSquare className="w-6 h-6" /> PING
                </button>
                <button
                  onClick={handleBlockUser}
                  className="bg-on-surface text-surface-bg border-[4px] border-on-surface px-6 py-4 font-black text-sm uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  BLOCK
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 px-10">
        {/* Left Column - About & Details */}
        <div className="lg:col-span-1 space-y-16">
          <div className="bg-secondary border-[10px] border-on-surface p-8 shadow-kinetic relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <Zap className="w-48 h-48 fill-current" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-2xl uppercase italic tracking-tighter">FOUNDER_MOMENTUM</h3>
                <Zap className="w-10 h-10 text-accent fill-accent" />
              </div>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase italic mb-3">
                    <span>POWER_LEVEL</span>
                    <span className="text-primary drop-shadow-[2px_2px_0px_#000]">{profile.momentum || 85}%</span>
                  </div>
                  <div className="w-full h-10 bg-surface-bg border-[4px] border-on-surface shadow-kinetic-thud overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.momentum || 85}%` }}
                      className="h-full bg-secondary border-r-[4px] border-on-surface"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-primary border-[4px] border-on-surface p-4 shadow-kinetic-thud">
                    <p className="text-[8px] font-bold uppercase italic mb-1">ACTIVITY</p>
                    <p className="text-2xl font-black uppercase italic tracking-tighter">HIGH</p>
                  </div>
                  <div className="bg-accent border-[4px] border-on-surface p-4 shadow-kinetic-thud">
                    <p className="text-[8px] font-bold uppercase italic mb-1">IMPACT</p>
                    <p className="text-2xl font-black uppercase italic tracking-tighter">TOP_5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container border-[10px] border-on-surface p-10 shadow-kinetic rotate-[1deg]">
            <h3 className="font-black text-3xl uppercase italic mb-10 border-b-[8px] border-on-surface pb-4 tracking-tighter drop-shadow-[2px_2px_0px_#FF00FF]">ABOUT_THE_FOUNDER</h3>
            {isEditing ? (
              <textarea 
                value={editForm.bio || ''} 
                onChange={e => setEditForm({...editForm, bio: e.target.value})}
                placeholder="SPILL_THE_TEA_FOUNDER..."
                className="w-full bg-accent border-[4px] border-on-surface p-6 font-bold text-lg uppercase italic shadow-kinetic-thud focus:outline-none min-h-[250px] focus:bg-primary/10 transition-colors"
              />
            ) : (
              <p className="text-on-surface font-bold leading-relaxed text-xl italic tracking-tight">
                "{profile.bio || "THIS_FOUNDER_IS_A_MYSTERY..."}"
              </p>
            )}

            <div className="mt-12 space-y-8">
              <div className="flex items-center gap-8 text-lg font-black uppercase italic">
                <div className="p-3 bg-secondary border-[4px] border-on-surface shadow-kinetic-thud">
                  <MapPin className="w-8 h-8 text-black" />
                </div>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editForm.location || ''} 
                    onChange={e => setEditForm({...editForm, location: e.target.value})}
                    placeholder="CAVE_LOCATION"
                    className="flex-1 bg-surface-bg border-[4px] border-on-surface px-6 py-3 shadow-kinetic-thud focus:outline-none focus:bg-accent/10"
                  />
                ) : (
                  <span className="tracking-tighter">{profile.location || "UNKNOWN_CAVE"}</span>
                )}
              </div>
              <div className="flex items-center gap-8 text-lg font-black uppercase italic">
                <div className="p-3 bg-primary border-[4px] border-on-surface shadow-kinetic-thud">
                  <Mail className="w-8 h-8 text-black" />
                </div>
                <span className="lowercase tracking-tighter">{profile.email}</span>
              </div>
              <div className="flex items-center gap-8 text-lg font-black uppercase italic">
                <div className="p-3 bg-accent border-[4px] border-on-surface shadow-kinetic-thud">
                  <Calendar className="w-8 h-8 text-black" />
                </div>
                <span className="tracking-tighter">SPAWNED {profile.createdAt?.toDate ? format(profile.createdAt.toDate(), 'MMMM yyyy').toUpperCase() : 'RECENTLY'}</span>
              </div>
            </div>
          </div>

          <div className="bg-accent border-[10px] border-on-surface p-10 shadow-kinetic rotate-[-1deg]">
            <h3 className="font-black text-3xl uppercase italic mb-10 border-b-[8px] border-on-surface pb-4 tracking-tighter drop-shadow-[2px_2px_0px_#00FFFF]">SKILL_STASH</h3>
            {isEditing ? (
              <div className="space-y-8">
                <div className="flex flex-wrap gap-4 mb-4">
                  {editForm.skills?.map((skill, i) => (
                    <span key={i} className="bg-on-surface text-surface-bg border-[4px] border-on-surface px-6 py-2 flex items-center gap-4 font-bold text-sm uppercase italic shadow-kinetic-thud">
                      {skill}
                      <button 
                        onClick={() => setEditForm({
                          ...editForm,
                          skills: editForm.skills?.filter((_, idx) => idx !== i)
                        })}
                        className="hover:text-secondary transition-colors"
                      >
                        <X className="w-5 h-5 stroke-[4px]" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="ADD_A_SKILL + ENTER"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val && !editForm.skills?.includes(val)) {
                          setEditForm({
                            ...editForm,
                            skills: [...(editForm.skills || []), val]
                          });
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                    className="w-full bg-surface-bg border-[4px] border-on-surface px-6 py-4 font-bold text-lg uppercase italic shadow-kinetic-thud focus:outline-none focus:bg-primary/10 transition-colors"
                  />
                  <Plus className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-on-surface/20" />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-5">
                {profile.skills?.length > 0 ? (
                  profile.skills.map((skill, i) => (
                    <span key={i} className="bg-surface-bg border-[4px] border-on-surface px-6 py-2 text-on-surface font-bold text-lg uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all cursor-default">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-[10px] font-bold text-on-surface/40 uppercase italic tracking-widest">NO_SKILLS_IN_THE_STASH.</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-primary border-[10px] border-on-surface p-8 shadow-kinetic">
            <h3 className="font-black text-2xl uppercase italic mb-8 border-b-[8px] border-on-surface pb-3 tracking-tighter">CYBER_LINKS</h3>
            {isEditing ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Globe className="w-8 h-8 text-black" />
                  <input 
                    type="text"
                    placeholder="WEBSITE_URL"
                    value={editForm.links?.website || ''}
                    onChange={e => setEditForm({
                      ...editForm, 
                      links: { ...editForm.links, website: e.target.value }
                    })}
                    className="flex-1 bg-surface-bg border-[4px] border-on-surface px-4 py-2 font-bold text-sm uppercase italic shadow-kinetic-thud focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Twitter className="w-8 h-8 text-black" />
                  <input 
                    type="text"
                    placeholder="TWITTER_URL"
                    value={editForm.links?.twitter || ''}
                    onChange={e => setEditForm({
                      ...editForm, 
                      links: { ...editForm.links, twitter: e.target.value }
                    })}
                    className="flex-1 bg-surface-bg border-[4px] border-on-surface px-4 py-2 font-bold text-sm uppercase italic shadow-kinetic-thud focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Linkedin className="w-8 h-8 text-black" />
                  <input 
                    type="text"
                    placeholder="LINKEDIN_URL"
                    value={editForm.links?.linkedin || ''}
                    onChange={e => setEditForm({
                      ...editForm, 
                      links: { ...editForm.links, linkedin: e.target.value }
                    })}
                    className="flex-1 bg-surface-bg border-[4px] border-on-surface px-4 py-2 font-bold text-sm uppercase italic shadow-kinetic-thud focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Github className="w-8 h-8 text-black" />
                  <input 
                    type="text"
                    placeholder="GITHUB_URL"
                    value={editForm.links?.github || ''}
                    onChange={e => setEditForm({
                      ...editForm, 
                      links: { ...editForm.links, github: e.target.value }
                    })}
                    className="flex-1 bg-surface-bg border-[4px] border-on-surface px-4 py-2 font-bold text-sm uppercase italic shadow-kinetic-thud focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {profile.links && Object.entries(profile.links).some(([_, val]) => val) ? (
                  Object.entries(profile.links).map(([key, value]) => {
                    if (!value) return null;
                    const val = value as string;
                    const Icon = key === 'website' ? Globe : 
                                 key === 'twitter' ? Twitter : 
                                 key === 'linkedin' ? Linkedin : 
                                 key === 'github' ? Github : LinkIcon;
                    return (
                      <a 
                        key={key}
                        href={val.startsWith('http') ? val : `https://${val}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-6 text-sm font-bold uppercase italic text-black hover:text-secondary transition-colors group"
                      >
                        <Icon className="w-8 h-8" />
                        <span>{key}</span>
                        <ExternalLink className="w-6 h-6 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    );
                  })
                ) : (
                  <p className="text-[10px] font-bold text-on-surface/40 uppercase italic">NO_CYBER_LINKS_FOUND.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Portfolio & Activity */}
        <div className="lg:col-span-2 space-y-16">
          <div className="bg-surface-container border-[10px] border-on-surface p-10 shadow-kinetic">
            <div className="flex items-center gap-12 mb-16 border-b-[10px] border-on-surface">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={cn(
                  "flex items-center gap-4 pb-8 font-black text-xl uppercase italic tracking-tighter transition-all relative",
                  activeTab === 'portfolio' ? "text-on-surface" : "text-on-surface/40 hover:text-on-surface"
                )}
              >
                <Briefcase className="w-8 h-8" />
                THE_STASH
                {activeTab === 'portfolio' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-6 bg-accent -mb-3 z-[-1]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={cn(
                  "flex items-center gap-4 pb-8 font-black text-xl uppercase italic tracking-tighter transition-all relative",
                  activeTab === 'activity' ? "text-on-surface" : "text-on-surface/40 hover:text-on-surface"
                )}
              >
                <Activity className="w-8 h-8" />
                PULSE_LOG
                {activeTab === 'activity' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-6 bg-secondary -mb-3 z-[-1]" />
                )}
              </button>
            </div>

            {activeTab === 'portfolio' && (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <h3 className="text-5xl font-black uppercase italic flex items-center gap-6 tracking-tighter drop-shadow-[4px_4px_0px_#FFFF00]">
                    <Trophy className="w-16 h-16 text-accent drop-shadow-[2px_2px_0px_#000]" /> HALL_OF_FAME
                  </h3>
                  {isOwner && (
                    <button 
                      onClick={() => setIsAddingProject(true)}
                      className="kinetic-btn w-full md:w-auto flex items-center justify-center gap-4"
                    >
                      <Plus className="w-8 h-8" /> ADD_TO_STASH
                    </button>
                  )}
                </div>
                
                {profile.portfolio?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {profile.portfolio.map((item) => (
                      <div key={item.id} className="bg-surface-bg border-[8px] border-on-surface shadow-kinetic-sm group hover:bg-primary/5 transition-all hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-kinetic overflow-hidden flex flex-col">
                        {item.imageUrl && (
                          <div className="aspect-video w-full overflow-hidden border-b-[8px] border-on-surface bg-on-surface relative">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 left-4 bg-secondary border-[4px] border-on-surface px-3 py-1 font-black text-[10px] uppercase italic shadow-kinetic-thud">VISUAL_PROOF</div>
                          </div>
                        )}
                        <div className="p-10 flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-6 mb-8">
                            <h4 className="text-3xl font-black uppercase italic line-clamp-1 tracking-tighter drop-shadow-[2px_2px_0px_#00FFFF]">{item.title}</h4>
                            {isOwner && (
                              <button 
                                onClick={() => handleDeleteProject(item.id)}
                                className="p-4 border-4 border-on-surface bg-surface-bg hover:bg-secondary transition-all shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                              >
                                <Trash2 className="w-6 h-6" />
                              </button>
                            )}
                          </div>
                          <p className="text-lg font-black text-on-surface/80 mb-10 line-clamp-3 italic leading-relaxed flex-1">"{item.description}"</p>
                          
                          {item.link && (
                            <a 
                              href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-accent border-[6px] border-on-surface px-8 py-4 font-black text-lg uppercase italic shadow-kinetic-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all inline-flex items-center justify-center gap-4 w-full"
                            >
                              <ExternalLink className="w-6 h-6" /> VIEW PROJECT
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-primary/5 border-[10px] border-on-surface border-dashed text-center py-32 shadow-kinetic">
                    <Briefcase className="w-32 h-32 text-on-surface/10 mx-auto mb-10 animate-pulse" />
                    <h4 className="text-5xl font-black uppercase italic mb-6 tracking-tighter">EMPTY STASH</h4>
                    <p className="text-xl font-black uppercase italic text-on-surface/40 tracking-widest">ADD YOUR BEST WORK TO THE HALL OF FAME.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && userId && (
              <div className="space-y-12">
                <h3 className="text-4xl font-black uppercase italic flex items-center gap-4 tracking-tighter">
                  <Activity className="w-12 h-12 text-[#FF00FF]" /> PULSE LOG
                </h3>
                <UserActivity userId={userId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Project Modal */}
      <AnimatePresence>
        {isAddingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-surface-bg border-[12px] border-on-surface shadow-kinetic-active max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-8 border-b-[10px] border-on-surface bg-accent">
                <h3 className="text-4xl font-black uppercase italic text-black tracking-tighter">ADD TO STASH</h3>
                <button 
                  onClick={() => {
                    setIsAddingProject(false);
                    setNewProject({ title: '', description: '', link: '' });
                    setProjectImage(null);
                    if (projectImagePreview) URL.revokeObjectURL(projectImagePreview);
                    setProjectImagePreview(null);
                  }}
                  className="p-3 border-4 border-on-surface bg-surface-bg hover:bg-secondary transition-all shadow-kinetic-thud"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={handleAddProject} className="p-10 space-y-10">
                <div>
                  <label className="block text-sm font-black uppercase italic mb-3">PROJECT TITLE *</label>
                  <input
                    type="text"
                    required
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    className="w-full bg-surface-bg border-4 border-on-surface p-4 font-black text-lg uppercase italic shadow-kinetic-thud focus:outline-none"
                    placeholder="e.g., FOUNDER DESIGN SYSTEM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase italic mb-3">THE LOWDOWN *</label>
                  <textarea
                    required
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full bg-surface-bg border-4 border-on-surface p-4 font-black text-lg uppercase italic shadow-kinetic-thud focus:outline-none min-h-[160px] resize-none"
                    placeholder="WHAT DID YOU BUILD, FOUNDER?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase italic mb-3">CYBER LINK (OPTIONAL)</label>
                  <input
                    type="text"
                    value={newProject.link}
                    onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                    className="w-full bg-surface-bg border-4 border-on-surface p-4 font-black text-lg uppercase italic shadow-kinetic-thud focus:outline-none"
                    placeholder="HTTPS://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase italic mb-3">VISUAL PROOF (OPTIONAL)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-[6px] border-dashed border-on-surface bg-primary/5 p-16 text-center cursor-pointer hover:bg-primary/10 transition-all shadow-kinetic-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none group"
                  >
                    {projectImagePreview ? (
                      <div className="relative aspect-video w-full overflow-hidden border-[6px] border-on-surface shadow-kinetic-sm">
                        <img src={projectImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-white font-black text-2xl uppercase italic tracking-tighter bg-black border-4 border-white px-8 py-4">CHANGE VISUAL</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10">
                        <div className="p-8 bg-surface-bg border-4 border-on-surface shadow-kinetic-thud mb-8 group-hover:bg-secondary transition-colors rotate-[-3deg]">
                          <ImageIcon className="w-20 h-20 text-on-surface" />
                        </div>
                        <p className="text-3xl font-black uppercase italic tracking-tighter">UPLOAD VISUAL PROOF</p>
                        <p className="text-xs font-black uppercase italic text-on-surface/40 mt-4 tracking-widest">PNG, JPG, GIF UP TO 5MB</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageSelect} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                <div className="pt-6 flex justify-end gap-6">
                  <button
                    type="button"
                    onClick={() => setIsAddingProject(false)}
                    className="bg-surface-bg border-4 border-on-surface px-10 py-4 font-black text-xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                    ABORT
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProject || !newProject.title.trim() || !newProject.description.trim()}
                    className="bg-primary border-4 border-on-surface px-10 py-4 font-black text-xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingProject ? 'SAVING...' : 'STASH IT!'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
