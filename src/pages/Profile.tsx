import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, arrayUnion, serverTimestamp, setDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { MapPin, Link as LinkIcon, Edit2, Briefcase, Calendar, Mail, Check, X, UserPlus, UserCheck, Activity, Image as ImageIcon, ExternalLink, Camera, Globe, Twitter, Linkedin, Github, MessageSquare, Zap, Ghost, Star, Trophy, Plus, Trash2, Target } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toggleUserConnection, getConnectionState } from '../lib/connections';
import { cn } from '../lib/utils';
import { ActivityFeed } from '../components/ActivityFeed';
import { VouchSystem } from '../components/VouchSystem';
import { MomentumWave } from '../components/MomentumWave';
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
  goals?: { id: string; title: string; status: 'pending' | 'completed'; createdAt: number }[];
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
  const [activities, setActivities] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [activeTab, setActiveTab] = useState<'portfolio' | 'activity' | 'goals' | 'vouches'>('portfolio');

  // Portfolio Modal State
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioItem | null>(null);
  const [newProject, setNewProject] = useState({ title: '', description: '', link: '' });
  const [projectImage, setProjectImage] = useState<File | null>(null);
  const [projectImagePreview, setProjectImagePreview] = useState<string | null>(null);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  
  // Goals State
  const [newGoal, setNewGoal] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);

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

        // Fetch activities for momentum wave
        const actQuery = query(
          collection(db, 'activities'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const actSnap = await getDocs(actQuery);
        setActivities(actSnap.docs.map(doc => doc.data()));
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

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleConfirmProfileImage = async () => {
    if (!userId || !isOwner || !profileImage) return;
    const toastId = toast.loading('UPLOADING_NEW_FACE...');
    try {
      const imageRef = ref(storage, `profiles/${userId}/${Date.now()}_${profileImage.name}`);
      await uploadBytes(imageRef, profileImage);
      const photoURL = await getDownloadURL(imageRef);
      
      await updateDoc(doc(db, 'users', userId), {
        photoURL,
        updatedAt: serverTimestamp()
      });
      
      if (profile) {
        setProfile({ ...profile, photoURL });
      }
      
      setProfileImage(null);
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
      setProfileImagePreview(null);
      
      toast.success('FACE_SWAP_COMPLETE!', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      toast.error('UPLOAD_FAILED_FOUNDER!', { id: toastId });
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
      setEditingProject(null);
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

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !isOwner || !editingProject || !newProject.title.trim() || !newProject.description.trim()) return;

    setIsSubmittingProject(true);
    try {
      let imageUrl = editingProject.imageUrl || '';
      if (projectImage) {
        const imageRef = ref(storage, `portfolio/${userId}/${Date.now()}_${projectImage.name}`);
        await uploadBytes(imageRef, projectImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const updatedProject: PortfolioItem = {
        ...editingProject,
        title: newProject.title.trim(),
        description: newProject.description.trim(),
        link: newProject.link.trim(),
        imageUrl,
      };

      const updatedPortfolio = profile?.portfolio.map(p => 
        p.id === editingProject.id ? updatedProject : p
      ) || [];

      await updateDoc(doc(db, 'users', userId), {
        portfolio: updatedPortfolio
      });

      if (profile) {
        setProfile({
          ...profile,
          portfolio: updatedPortfolio
        });
      }

      setEditingProject(null);
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

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !isOwner || !newGoal.trim() || !profile) return;

    const goalData = {
      id: Date.now().toString(),
      title: newGoal.trim(),
      status: 'pending' as const,
      createdAt: Date.now()
    };

    try {
      const updatedGoals = [...(profile.goals || []), goalData];
      await updateDoc(doc(db, 'users', userId), {
        goals: updatedGoals
      });
      setProfile({ ...profile, goals: updatedGoals });
      setNewGoal('');
      setIsAddingGoal(false);
      toast.success('GOAL_LOCKED_IN!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleToggleGoal = async (goalId: string) => {
    if (!userId || !isOwner || !profile) return;
    try {
      const updatedGoals = profile.goals?.map(g => 
        g.id === goalId ? { ...g, status: (g.status === 'completed' ? 'pending' : 'completed') as 'pending' | 'completed' } : g
      ) || [];
      await updateDoc(doc(db, 'users', userId), {
        goals: updatedGoals
      });
      setProfile({ ...profile, goals: updatedGoals });
      toast.success('GOAL_STATUS_UPDATED!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!userId || !isOwner || !profile) return;
    try {
      const updatedGoals = profile.goals?.filter(g => g.id !== goalId);
      await updateDoc(doc(db, 'users', userId), {
        goals: updatedGoals
      });
      setProfile({ ...profile, goals: updatedGoals });
      toast.success('GOAL_ERASED.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

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
    const cState = getConnectionState(currentUserProfile, userId);
    try {
      if (cState === 'none' || cState === 'incoming') {
        await toggleUserConnection(currentUser, userId, false);
        toast.success('Connection request sent.');
      } else if (cState === 'connected') {
        await toggleUserConnection(currentUser, userId, true);
        toast.success('Connection removed.');
      } else if (cState === 'pending') {
        await toggleUserConnection(currentUser, userId, true);
        toast.success('Connection request withdrawn.');
      }
      
      // We don't optimistically update here since the state relies on currentUserProfile arrays updating
      
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
        <div className="w-24 h-24 border-2 border-on-surface border-t-primary animate-spin shadow-brutal"></div>
      </div>
    );
  }

  if (!profile || currentUserProfile?.blockedUsers?.includes(userId || '')) {
    return (
      <div className="border-2 border-outline/15 text-center py-32 shadow-brutal m-10">
        <Ghost className="w-32 h-32 text-primary mx-auto mb-10 animate-bounce" />
        <h3 className="text-5xl font-headline font-black text-on-surface uppercase italic mb-4 tracking-tighter">FOUNDER_NOT_FOUND!</h3>
        <p className="text-on-surface-variant font-bold uppercase tracking-widest bg-surface-container-lowest border-2 border-outline/15 px-6 py-3 inline-block shadow-brutal">THIS_FOUNDER_MIGHT_BE_HIDING_IN_A_CAVE.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-20 font-sans">
      {/* Header / Cover */}
      <div className="relative h-80 glass-panel overflow-hidden group shadow-brutal">
        {(coverImagePreview || profile.coverURL) ? (
          <img 
            src={coverImagePreview || profile.coverURL} 
            alt="Cover" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 liquid-gradient opacity-20 blur-[120px]"></div>
        )}
        
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-1 liquid-gradient z-10" />

        {isEditing && (
          <button 
            onClick={() => coverImageInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <div className="flex flex-col items-center gap-4 text-white">
              <Camera className="w-16 h-16" />
              <span className="font-black text-xl uppercase italic tracking-tighter bg-on-surface text-surface border-2 border-surface px-6 py-2 shadow-brutal">BLAST_NEW_COVER</span>
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
      <div className="px-6 lg:px-10 -mt-40 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8 lg:gap-10 min-w-0">
            <div className="relative group shrink-0">
              <div className="w-56 h-56 border-2 border-on-surface shadow-brutal bg-surface overflow-hidden relative rotate-[-2deg]">
                {profileImagePreview && !isEditing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 p-4 gap-4">
                    <p className="text-white font-black text-[10px] uppercase italic text-center leading-none">CONFIRM_NEW_IDENTITY?</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleConfirmProfileImage}
                        className="bg-primary border-2 border-on-surface p-2 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
                        title="Confirm Upload"
                      >
                        <Check className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => {
                          setProfileImage(null);
                          if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
                          setProfileImagePreview(null);
                        }}
                        className="bg-secondary border-2 border-on-surface p-2 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
                        title="Cancel"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                )}
                <img 
                  src={profileImagePreview || profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} 
                  alt={profile.displayName} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                  referrerPolicy="no-referrer"
                />
                {isOwner && (
                  <button 
                    onClick={() => profileImageInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Camera className="w-12 h-12" />
                      <span className="font-black text-xs uppercase italic tracking-tighter bg-on-surface text-surface border-2 border-surface px-3 py-1">REPLACE_FACE</span>
                    </div>
                  </button>
                )}
              </div>
              {isOwner && (
                <button 
                  onClick={() => profileImageInputRef.current?.click()}
                  className="absolute -top-4 -left-4 bg-primary border-2 border-on-surface p-3 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all z-20"
                  title="Upload New Face"
                >
                  <Camera className="w-6 h-6" />
                </button>
              )}
              <div className="absolute -bottom-6 -right-6 bg-tertiary border-2 border-on-surface p-4 shadow-brutal rotate-[12deg]">
                <Star className="w-10 h-10 fill-on-surface text-on-surface" />
              </div>
              <input 
                type="file" 
                ref={profileImageInputRef} 
                onChange={handleProfileImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            <div className="mb-6 text-center md:text-left min-w-0">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editForm.displayName || ''} 
                    onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                    className="w-full bg-surface-container-lowest border-2 border-on-surface px-4 py-2 text-3xl md:text-4xl font-headline font-black uppercase italic shadow-brutal focus:outline-none leading-tight"
                  />
                ) : (
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-black text-on-surface uppercase italic flex flex-wrap items-center gap-x-6 gap-y-2 tracking-tighter leading-[0.9] break-words">
                    {profile.displayName}
                    {profile.isVerified && (
                      <div className="bg-primary border-2 border-on-surface p-2 shadow-brutal shrink-0" title="Verified Founder">
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
                    className="bg-surface border-2 border-on-surface px-4 py-2 font-bold uppercase italic text-sm shadow-brutal focus:outline-none"
                  >
                    <option value="Bootstrapper">Bootstrapper</option>
                    <option value="Visionary">Visionary</option>
                    <option value="Builder">Builder</option>
                    <option value="Specialist">Specialist</option>
                  </select>
                ) : (
                  <span className="bg-secondary border-2 border-on-surface px-4 py-1 text-on-surface font-bold text-sm uppercase italic shadow-brutal">{profile.founderType || 'Solo King'}</span>
                )}
                <span className="bg-primary border-2 border-on-surface px-4 py-1 text-on-surface font-bold text-sm uppercase italic shadow-brutal">{profile.connections?.length || 0} COMMUNITY_MEMBERS</span>
                <span className="bg-tertiary border-2 border-on-surface px-4 py-1 text-on-surface font-bold text-sm uppercase italic shadow-brutal">LVL {Math.floor(Math.random() * 50) + 1}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center lg:justify-end items-center gap-4 lg:gap-6 mb-8 shrink-0">
            <button 
              onClick={handleShareProfile}
              className="bg-surface border-2 border-on-surface p-4 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
              title="Share Profile"
            >
              <Globe className="w-8 h-8" />
            </button>
            
            {isOwner && !isEditing && (
              <button 
                onClick={() => {
                  setIsEditing(true);
                  setEditForm(profile || {});
                }}
                className="liquid-btn flex items-center gap-3"
              >
                <Edit2 className="w-6 h-6" /> EDIT_PROFILE
              </button>
            )}
            
            {isOwner && isEditing && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setProfileImage(null);
                    setCoverImage(null);
                    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview);
                    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview);
                    setProfileImagePreview(null);
                    setCoverImagePreview(null);
                  }}
                  className="bg-surface border-2 border-on-surface px-8 py-4 font-black text-xl uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all flex items-center gap-3"
                >
                  <X className="w-6 h-6" /> ABORT
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="liquid-btn flex items-center gap-3"
                >
                  <Check className="w-6 h-6" /> SYNC_PROFILE
                </button>
              </div>
            )}
            
            {!isOwner && (() => {
              const cState = userId ? getConnectionState(currentUserProfile, userId) : 'none';
              return (
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleToggleConnection}
                  disabled={cState === 'pending'}
                  className={cn(
                    "liquid-btn flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed",
                    cState === 'connected' ? "bg-primary" : "bg-secondary"
                  )}
                >
                  {cState === 'connected' ? (
                    <><UserCheck className="w-6 h-6" /> COMMUNITY</>
                  ) : cState === 'pending' ? (
                    <><UserPlus className="w-6 h-6" /> PENDING</>
                  ) : cState === 'incoming' ? (
                    <><UserCheck className="w-6 h-6" /> ACCEPT REQUEST</>
                  ) : (
                    <><UserPlus className="w-6 h-6" /> JOIN_TRIBE</>
                  )}
                </button>
                <button
                  onClick={handleStartChat}
                  className="liquid-btn flex items-center gap-3"
                >
                  <MessageSquare className="w-6 h-6" /> PING_FOUNDER
                </button>
                <button
                  onClick={handleBlockUser}
                  className="bg-on-surface text-surface border-2 border-on-surface px-6 py-4 font-black text-sm uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
                >
                  SEVER_LINK
                </button>
              </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 px-6 lg:px-10">
        {/* Left Column - About & Details */}
        <div className="lg:col-span-4 space-y-16">
          <div className="glass-panel p-8 shadow-brutal relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <Zap className="w-48 h-48 fill-current" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-headline font-black text-2xl uppercase italic tracking-tighter text-on-surface">FOUNDER_MOMENTUM</h3>
                <Zap className="w-10 h-10 text-secondary fill-secondary" />
              </div>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase italic mb-3 text-on-surface">
                    <span>POWER_LEVEL</span>
                    <span className="text-secondary">{profile.momentum || 85}%</span>
                  </div>
                  <div className="w-full h-10 bg-surface border-2 border-on-surface shadow-brutal overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.momentum || 85}%` }}
                      className="h-full bg-secondary border-r-2 border-on-surface"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-surface border-2 border-on-surface p-4 shadow-brutal">
                    <p className="text-[8px] font-bold uppercase italic mb-1 text-on-surface-variant">ACTIVITY</p>
                    <p className="text-2xl font-headline font-black uppercase italic tracking-tighter text-on-surface">HIGH</p>
                  </div>
                  <div className="bg-surface border-2 border-on-surface p-4 shadow-brutal">
                    <p className="text-[8px] font-bold uppercase italic mb-1 text-on-surface-variant">IMPACT</p>
                    <p className="text-2xl font-headline font-black uppercase italic tracking-tighter text-on-surface">TOP_5%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-10 shadow-brutal rotate-[1deg]">
            <h3 className="font-headline font-black text-3xl uppercase italic mb-10 border-b-2 border-outline/15 pb-4 tracking-tighter text-on-surface">ABOUT_THE_FOUNDER</h3>
            {isEditing ? (
              <textarea 
                value={editForm.bio || ''} 
                onChange={e => setEditForm({...editForm, bio: e.target.value})}
                placeholder="SPILL_THE_TEA_FOUNDER..."
                className="w-full bg-surface-container-lowest border-2 border-on-surface p-6 font-bold text-lg uppercase italic shadow-brutal focus:outline-none min-h-[250px] transition-colors"
              />
            ) : (
              <p className="text-on-surface font-bold leading-relaxed text-xl italic tracking-tight uppercase">
                "{profile.bio || "THIS_FOUNDER_IS_A_MYSTERY..."}"
              </p>
            )}

            <div className="mt-12 space-y-8">
              <div className="flex flex-col space-y-2">
                <div className="flex items-start gap-8 text-lg font-black uppercase italic text-on-surface">
                  <div className="p-3 bg-secondary border-2 border-on-surface shadow-brutal shrink-0">
                    <MapPin className="w-8 h-8 text-on-surface" />
                  </div>
                  {isEditing ? (
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">LOCATION</label>
                      <input 
                        type="text" 
                        value={editForm.location || ''} 
                        onChange={e => setEditForm({...editForm, location: e.target.value})}
                        placeholder="CAVE_LOCATION"
                        maxLength={100}
                        className="w-full bg-surface-container-lowest border-2 border-on-surface px-6 py-3 shadow-brutal focus:outline-none"
                      />
                      <div className="text-[8px] font-bold text-right text-on-surface-variant">
                        {(editForm.location?.length || 0)}/100
                      </div>
                    </div>
                  ) : (
                    <span className="tracking-tighter pt-3">{profile.location || "UNKNOWN_CAVE"}</span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-8 text-lg font-black uppercase italic text-on-surface">
                <div className="p-3 bg-primary border-2 border-on-surface shadow-brutal shrink-0">
                  <Mail className="w-8 h-8 text-on-surface" />
                </div>
                <span className="lowercase tracking-tighter pt-3 break-all">{profile.email}</span>
              </div>
              <div className="flex items-start gap-8 text-lg font-black uppercase italic text-on-surface">
                <div className="p-3 bg-tertiary border-2 border-on-surface shadow-brutal shrink-0">
                  <Calendar className="w-8 h-8 text-on-surface" />
                </div>
                <span className="tracking-tighter pt-3">SPAWNED {profile.createdAt?.toDate ? format(profile.createdAt.toDate(), 'MMMM yyyy').toUpperCase() : 'RECENTLY'}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-10 shadow-brutal rotate-[-1deg]">
            <h3 className="font-headline font-black text-3xl uppercase italic mb-10 border-b-2 border-outline/15 pb-4 tracking-tighter text-on-surface">SKILL_STASH</h3>
            {isEditing ? (
              <div className="space-y-8">
                <div className="flex flex-wrap gap-4 mb-4">
                  {editForm.skills?.map((skill, i) => (
                    <span key={i} className="chip-pill-active border-on-surface px-6 py-2 flex items-center gap-4 font-bold text-sm uppercase italic">
                      {skill}
                      <button 
                        onClick={() => setEditForm({
                          ...editForm,
                          skills: editForm.skills?.filter((_, idx) => idx !== i)
                        })}
                        className="hover:text-tertiary transition-colors"
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
                    className="w-full bg-surface-container-lowest border-2 border-on-surface px-6 py-4 font-bold text-lg uppercase italic shadow-brutal focus:outline-none transition-colors"
                  />
                  <Plus className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-on-surface-variant/20" />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-5">
                {profile.skills?.length > 0 ? (
                  profile.skills.map((skill, i) => (
                    <span key={i} className="chip-pill text-on-surface font-bold text-lg uppercase italic border-outline/15">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase italic tracking-widest">NO_SKILLS_IN_THE_STASH.</p>
                )}
              </div>
            )}
          </div>

          <div className="glass-panel p-8 shadow-brutal">
            <h3 className="font-headline font-black text-2xl uppercase italic mb-8 border-b-2 border-outline/15 pb-3 tracking-tighter text-on-surface">CYBER_LINKS</h3>
            {isEditing ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Globe className="w-8 h-8 text-on-surface" />
                  <input 
                    type="text"
                    placeholder="WEBSITE_URL"
                    value={editForm.links?.website || ''}
                    onChange={e => setEditForm({
                      ...editForm, 
                      links: { ...editForm.links, website: e.target.value }
                    })}
                    className="flex-1 bg-surface-container-lowest border-2 border-on-surface px-4 py-2 font-bold uppercase italic text-sm shadow-brutal focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Twitter className="w-8 h-8 text-on-surface" />
                  <input 
                    type="text"
                    placeholder="TWITTER_URL"
                    value={editForm.links?.twitter || ''}
                    onChange={e => setEditForm({
                      ...editForm, 
                      links: { ...editForm.links, twitter: e.target.value }
                    })}
                    className="flex-1 bg-surface-container-lowest border-2 border-on-surface px-4 py-2 font-bold uppercase italic text-sm shadow-brutal focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Linkedin className="w-8 h-8 text-on-surface" />
                  <input 
                    type="text"
                    placeholder="LINKEDIN_URL"
                    value={editForm.links?.linkedin || ''}
                    onChange={e => setEditForm({
                      ...editForm, 
                      links: { ...editForm.links, linkedin: e.target.value }
                    })}
                    className="flex-1 bg-surface-container-lowest border-2 border-on-surface px-4 py-2 font-bold uppercase italic text-sm shadow-brutal focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Github className="w-8 h-8 text-on-surface" />
                  <input 
                    type="text"
                    placeholder="GITHUB_URL"
                    value={editForm.links?.github || ''}
                    onChange={e => setEditForm({
                      ...editForm, 
                      links: { ...editForm.links, github: e.target.value }
                    })}
                    className="flex-1 bg-surface-container-lowest border-2 border-on-surface px-4 py-2 font-bold uppercase italic text-sm shadow-brutal focus:outline-none"
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
                        className="flex items-center gap-6 text-sm font-bold uppercase italic text-on-surface hover:text-secondary transition-colors group"
                      >
                        <div className="p-2 border-2 border-on-surface shadow-brutal bg-surface group-hover:bg-secondary transition-colors">
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="tracking-widest">{key.toUpperCase()}</span>
                        <ExternalLink className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    );
                  })
                ) : (
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase italic">NO_CYBER_LINKS_FOUND.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Portfolio & Activity */}
        <div className="lg:col-span-8 space-y-16">
          <div className="glass-panel p-10 shadow-brutal">
            <MomentumWave activities={activities} />
            
            <div className="flex items-center gap-12 mb-16 border-b-2 border-outline/15 overflow-x-auto scroller-none">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={cn(
                  "flex items-center gap-4 pb-8 font-headline font-black text-xl uppercase italic tracking-tighter transition-all relative shrink-0",
                  activeTab === 'portfolio' ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Briefcase className="w-8 h-8" />
                THE_STASH
                {activeTab === 'portfolio' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-2 bg-tertiary -mb-[1px] z-10" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={cn(
                  "flex items-center gap-4 pb-8 font-headline font-black text-xl uppercase italic tracking-tighter transition-all relative shrink-0",
                  activeTab === 'activity' ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Activity className="w-8 h-8" />
                PULSE_LOG
                {activeTab === 'activity' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-2 bg-secondary -mb-[1px] z-10" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('vouches')}
                className={cn(
                  "flex items-center gap-4 pb-8 font-headline font-black text-xl uppercase italic tracking-tighter transition-all relative shrink-0",
                  activeTab === 'vouches' ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Star className="w-8 h-8" />
                PEER_VOUCHES
                {activeTab === 'vouches' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-2 bg-accent -mb-[1px] z-10" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('goals')}
                className={cn(
                  "flex items-center gap-4 pb-8 font-headline font-black text-xl uppercase italic tracking-tighter transition-all relative shrink-0",
                  activeTab === 'goals' ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Target className="w-8 h-8" />
                GOAL_TRACKER
                {activeTab === 'goals' && (
                  <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-2 bg-primary -mb-[1px] z-10" />
                )}
              </button>
            </div>

            {activeTab === 'portfolio' && (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <h3 className="text-5xl font-headline font-black uppercase italic flex items-center gap-6 tracking-tighter text-on-surface">
                    <Trophy className="w-16 h-16 text-tertiary" /> HALL_OF_FAME
                  </h3>
                  {isOwner && (
                    <button 
                      onClick={() => setIsAddingProject(true)}
                      className="liquid-btn w-full md:w-auto flex items-center justify-center gap-4"
                    >
                      <Plus className="w-8 h-8" /> ADD_TO_STASH
                    </button>
                  )}
                </div>
                
                {profile.portfolio?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {profile.portfolio.map((item) => (
                      <div key={item.id} className="brutal-card group bg-surface-container-lowest overflow-hidden flex flex-col">
                        {item.imageUrl && (
                          <div className="aspect-video w-full overflow-hidden border-b-2 border-on-surface bg-on-surface relative">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title} 
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-90 group-hover:opacity-100 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 left-4 bg-secondary border-2 border-on-surface px-3 py-1 font-black text-[10px] uppercase italic shadow-brutal">VISUAL_PROOF</div>
                          </div>
                        )}
                        <div className="p-10 flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-6 mb-8">
                            <h4 className="text-3xl font-headline font-black uppercase italic line-clamp-1 tracking-tighter text-on-surface">{item.title}</h4>
                            {isOwner && (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingProject(item);
                                    setNewProject({
                                      title: item.title,
                                      description: item.description,
                                      link: item.link || ''
                                    });
                                    setProjectImagePreview(item.imageUrl || null);
                                  }}
                                  className="p-4 border-2 border-on-surface bg-surface hover:bg-primary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                                  title="Edit Project"
                                >
                                  <Edit2 className="w-6 h-6" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProject(item.id)}
                                  className="p-4 border-2 border-on-surface bg-surface hover:bg-tertiary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                                  title="Delete Project"
                                >
                                  <Trash2 className="w-6 h-6" />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-lg font-bold text-on-surface-variant mb-10 line-clamp-3 italic leading-relaxed flex-1">"{item.description}"</p>
                          
                          {item.link && (
                            <a 
                              href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-surface border-2 border-on-surface px-8 py-4 font-black text-lg uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all inline-flex items-center justify-center gap-4 w-full text-on-surface"
                            >
                              <ExternalLink className="w-6 h-6" /> VIEW PROJECT
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel border-2 border-outline/15 border-dashed text-center py-32 shadow-brutal">
                    <Briefcase className="w-32 h-32 text-on-surface-variant/10 mx-auto mb-10 animate-pulse" />
                    <h4 className="text-5xl font-headline font-black uppercase italic mb-6 tracking-tighter text-on-surface">EMPTY STASH</h4>
                    <p className="text-xl font-black uppercase italic text-on-surface-variant tracking-widest">ADD YOUR BEST WORK TO THE HALL OF FAME.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && profile && (
              <div className="space-y-12">
                <h3 className="text-4xl font-black uppercase italic flex items-center gap-4 tracking-tighter">
                  <Activity className="w-12 h-12 text-[#FF00FF]" /> PULSE LOG
                </h3>
                <ActivityFeed userId={profile.uid} />
              </div>
            )}

            {activeTab === 'vouches' && profile && (
              <VouchSystem userId={profile.uid} userName={profile.displayName} />
            )}

            {activeTab === 'goals' && (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <h3 className="text-5xl font-headline font-black uppercase italic flex items-center gap-6 tracking-tighter text-on-surface">
                    <Target className="w-16 h-16 text-primary" /> BUILD_IN_PUBLIC
                  </h3>
                  {isOwner && (
                    <button 
                      onClick={() => setIsAddingGoal(true)}
                      className="liquid-btn w-full md:w-auto flex items-center justify-center gap-4"
                    >
                      <Plus className="w-8 h-8" /> NEW_GOAL
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {isAddingGoal && (
                    <motion.form 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      onSubmit={handleAddGoal}
                      className="bg-primary/10 p-8 border-2 border-on-surface shadow-brutal flex flex-col sm:flex-row gap-6"
                    >
                      <input 
                        type="text"
                        required
                        autoFocus
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        placeholder="ENTER_YOUR_NEXT_MILESTONE..."
                        className="flex-1 bg-surface border-2 border-on-surface p-4 font-bold text-xl uppercase italic shadow-brutal focus:outline-none"
                      />
                      <div className="flex gap-4">
                        <button 
                          type="button"
                          onClick={() => setIsAddingGoal(false)}
                          className="bg-surface border-2 border-on-surface px-6 font-black uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
                        >
                          CANCEL
                        </button>
                        <button 
                          type="submit"
                          className="bg-primary border-2 border-on-surface px-8 font-black uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
                        >
                          LOCK_IN
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 gap-6">
                  {profile.goals && profile.goals.length > 0 ? (
                    profile.goals.map((goal) => (
                      <motion.div
                        key={goal.id}
                        layout
                        className={cn(
                          "p-8 border-2 border-on-surface shadow-brutal flex items-center justify-between gap-6 transition-all",
                          goal.status === 'completed' ? "bg-primary/5 opacity-60" : "bg-surface"
                        )}
                      >
                        <div className="flex items-center gap-6 flex-1 min-w-0">
                          <button
                            onClick={() => isOwner && handleToggleGoal(goal.id)}
                            disabled={!isOwner}
                            className={cn(
                              "w-12 h-12 border-2 border-on-surface flex items-center justify-center transition-all",
                              goal.status === 'completed' ? "bg-primary" : "bg-surface hover:bg-primary/10"
                            )}
                          >
                            {goal.status === 'completed' && <Check className="w-8 h-8 text-on-surface stroke-[4px]" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <h4 className={cn(
                              "text-2xl font-headline font-black uppercase italic tracking-tighter truncate text-on-surface",
                              goal.status === 'completed' && "line-through text-on-surface-variant"
                            )}>
                              {goal.title}
                            </h4>
                            <p className="text-[10px] font-bold uppercase italic text-on-surface-variant">
                              LOCKED_IN: {format(goal.createdAt, 'MMM d, yyyy').toUpperCase()}
                            </p>
                          </div>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-3 border-2 border-on-surface bg-surface hover:bg-secondary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                          >
                            <Trash2 className="w-6 h-6" />
                          </button>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <div className="glass-panel border-2 border-outline/15 border-dashed text-center py-32 shadow-brutal">
                      <Target className="w-32 h-32 text-on-surface-variant/10 mx-auto mb-10 animate-pulse" />
                      <h4 className="text-5xl font-headline font-black uppercase italic mb-6 tracking-tighter text-on-surface">NO_GOALS_SET</h4>
                      <p className="text-xl font-black uppercase italic text-on-surface-variant tracking-widest">WHAT_ARE_YOU_BUILDING_FOUNDER?</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Project Modal */}
      <AnimatePresence>
        {(isAddingProject || editingProject) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-surface/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-surface border-2 border-on-surface shadow-brutal max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            >
              <div className="flex items-center justify-between p-8 border-b-2 border-on-surface glass-panel sticky top-0 z-20">
                <h3 className="text-4xl font-headline font-black uppercase italic text-on-surface tracking-tighter">
                  {editingProject ? 'EDIT_STASH_ITEM' : 'ADD_TO_STASH'}
                </h3>
                <button 
                  onClick={() => {
                    setIsAddingProject(false);
                    setEditingProject(null);
                    setNewProject({ title: '', description: '', link: '' });
                    setProjectImage(null);
                    if (projectImagePreview) URL.revokeObjectURL(projectImagePreview);
                    setProjectImagePreview(null);
                  }}
                  className="p-3 border-2 border-on-surface bg-surface hover:bg-secondary transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <form onSubmit={editingProject ? handleEditProject : handleAddProject} className="p-10 space-y-10">
                <div>
                  <label className="block text-xs font-black uppercase italic mb-3 text-on-surface-variant">PROJECT_TITLE *</label>
                  <input
                    type="text"
                    required
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    className="w-full bg-surface-container-lowest border-2 border-on-surface p-4 font-bold text-lg uppercase italic shadow-brutal focus:outline-none"
                    placeholder="E.G., FOUNDER_DESIGN_SYSTEM"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase italic mb-3 text-on-surface-variant">THE_LOWDOWN *</label>
                  <textarea
                    required
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full bg-surface-container-lowest border-2 border-on-surface p-4 font-bold text-lg uppercase italic shadow-brutal focus:outline-none min-h-[160px] resize-none"
                    placeholder="WHAT_DID_YOU_BUILD_FOUNDER?"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase italic mb-3 text-on-surface-variant">CYBER_LINK (OPTIONAL)</label>
                  <input
                    type="text"
                    value={newProject.link}
                    onChange={(e) => setNewProject({ ...newProject, link: e.target.value })}
                    className="w-full bg-surface-container-lowest border-2 border-on-surface p-4 font-bold text-lg uppercase italic shadow-brutal focus:outline-none"
                    placeholder="HTTPS://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase italic mb-3 text-on-surface-variant">VISUAL_PROOF (OPTIONAL)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-outline/30 bg-surface-container-low p-16 text-center cursor-pointer hover:bg-surface-container-lowest transition-all shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 group"
                  >
                    {projectImagePreview ? (
                      <div className="relative aspect-video w-full overflow-hidden border-2 border-on-surface shadow-brutal">
                        <img src={projectImagePreview} alt="Preview" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                        <div className="absolute inset-0 bg-surface/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-on-surface font-black text-2xl uppercase italic tracking-tighter bg-surface border-2 border-on-surface px-8 py-4 shadow-brutal">CHANGE_VISUAL</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10">
                        <div className="p-8 bg-surface border-2 border-on-surface shadow-brutal mb-8 group-hover:bg-secondary transition-colors rotate-[-3deg]">
                          <ImageIcon className="w-20 h-20 text-on-surface" />
                        </div>
                        <p className="text-3xl font-headline font-black uppercase italic tracking-tighter text-on-surface">UPLOAD_VISUAL_PROOF</p>
                        <p className="text-[10px] font-bold uppercase italic text-on-surface-variant mt-4 tracking-widest">PNG, JPG, GIF UP TO 5MB</p>
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
                    className="bg-surface border-2 border-on-surface px-10 py-4 font-black text-xl uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all text-on-surface"
                  >
                    ABORT
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProject || !newProject.title.trim() || !newProject.description.trim()}
                    className="bg-primary border-2 border-on-surface px-10 py-4 font-black text-xl uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-on-surface"
                  >
                    {isSubmittingProject ? 'SAVING...' : (editingProject ? 'SYNC_STASH' : 'STASH_IT!')}
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
