import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, Image as ImageIcon, UserPlus, UserCheck, X, Edit2, Check, Trash2, Sparkles, TrendingUp, Activity, Zap, Ghost, Star, Trophy, Flame, Users, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toggleUserConnection } from '../lib/connections';
import { cn } from '../lib/utils';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';
import { logActivity } from '../lib/activities';
import { PostComments } from '../components/PostComments';
import { ConfirmModal } from '../components/ConfirmModal';
import { RichTextEditor } from '../components/RichTextEditor';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { BentoDashboard } from '../components/BentoDashboard';
import { generatePostContent, generateImage, analyzePulse } from '../services/geminiService';
import { addXP } from '../lib/reputation';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  images?: string[];
  tags?: string[];
  likes: string[];
  commentCount: number;
  groupId?: string;
  createdAt: any;
  updatedAt?: any;
}

interface Group {
  id: string;
  name: string;
  creatorId: string;
  members: string[];
  moderators?: string[];
}

const COMMON_TAGS = ['Showcase', 'Question', 'Milestone', 'Resource', 'Collaboration', 'Advice'];

export function Feed() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Record<string, Group>>({});
  const [newPost, setNewPost] = useState('');
  const [postTags, setPostTags] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filterTag, setFilterTag] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'liked' | 'commented'>('recent');
  const [pulseInsight, setPulseInsight] = useState<string>('Analyzing community momentum...');
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [stats, setStats] = useState({
    activeNodes: 0,
    milestones: 0,
    collabs: 0,
    velocity: '0%',
    chartData: [] as { name: string; value: number }[],
    topFounder: {
      name: 'NEON_GLOW',
      photo: 'https://picsum.photos/seed/founder/100/100',
      level: 42,
      label: 'COMMUNITY_PIONEER'
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastPostElementRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        setIsLoadingMore(true);
        setDisplayLimit(prev => prev + 10);
      }
    });
    if (node) observer.current.observe(node);
  }, [hasMore, isLoadingMore]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Real-time listeners for stats would be better but let's do a one-time fetch or simplified logic
        const postsRef = collection(db, 'posts');
        const usersRef = collection(db, 'users');
        
        // Use onSnapshot for live stats
        const unsubPosts = onSnapshot(query(postsRef, limit(100)), (snapshot) => {
          const postsList = snapshot.docs.map(d => d.data());
          
          // Generate chart data (last 7 days)
          const now = new Date();
          const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(now);
            d.setDate(d.getDate() - (6 - i));
            return {
              name: d.toLocaleDateString('en-US', { weekday: 'short' }),
              date: d.toDateString(),
              value: 0
            };
          });

          postsList.forEach(p => {
            const date = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
            const day = date.toDateString();
            const foundDay = last7Days.find(d => d.date === day);
            if (foundDay) foundDay.value++;
          });

          setStats(prev => ({
            ...prev,
            chartData: last7Days.map(({ name, value }) => ({ name: name.toUpperCase(), value })),
            velocity: `${Math.min(100, Math.floor((postsList.length / 50) * 100))}%`
          }));
        });

        const unsubUsers = onSnapshot(query(usersRef, limit(100)), (snapshot) => {
          const users = snapshot.docs.map(d => d.data());
          const topUser = users.sort((a, b) => (b.xp || 0) - (a.xp || 0))[0];

          setStats(prev => ({
            ...prev,
            activeNodes: snapshot.size,
            topFounder: topUser ? {
              name: topUser.displayName?.toUpperCase().replace(/\s+/g, '_') || 'ANON_NODE',
              photo: topUser.photoURL || 'https://picsum.photos/seed/founder/100/100',
              level: topUser.level || 1,
              label: topUser.xp && topUser.xp > 5000 ? 'LEGENDARY_BUILDER' : 'ACTIVE_NODE'
            } : prev.topFounder
          }));
        });

        return () => {
          unsubPosts();
          unsubUsers();
        };
      } catch (error) {
        console.error("Stats Error:", error);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchPulse = async () => {
      const insight = await analyzePulse(stats);
      setPulseInsight(insight);
    };
    if (stats.activeNodes > 0) {
      fetchPulse();
    }
  }, [stats.activeNodes]);

  useEffect(() => {
    let q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(displayLimit));
    
    // Note: Complex queries (where + orderBy) require indexes. 
    // We'll stick to a simpler approach for now to ensure it works without manual index creation,
    // but we'll use the limit for infinite scroll.
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setHasMore(snapshot.docs.length === displayLimit);
      setIsLoadingMore(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
      setIsLoadingMore(false);
    });

    return () => unsubscribe();
  }, [displayLimit]);

  useEffect(() => {
    // Reset limit when filters change significantly (optional, but good for UX)
    setDisplayLimit(10);
  }, [filterTag, sortBy]);

  useEffect(() => {
    const q = query(collection(db, 'groups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData: Record<string, Group> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        groupsData[doc.id] = {
          id: doc.id,
          name: data.name || 'Unnamed Group',
          creatorId: data.creatorId,
          members: data.members || [],
          moderators: data.moderators || []
        };
      });
      setGroups(groupsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
    });

    return () => unsubscribe();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      setSelectedImages((prev) => [...prev, ...filesArray]);
      
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPost.trim() && selectedImages.length === 0) || !user) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Publishing your post...');
    try {
      const imageUrls: string[] = [];
      
      for (const image of selectedImages) {
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${image.name}`);
        const snapshot = await uploadBytes(imageRef, image);
        const url = await getDownloadURL(snapshot.ref);
        imageUrls.push(url);
      }

        await addDoc(collection(db, 'posts'), {
          authorId: user.uid,
          authorName: user.displayName || 'Anonymous',
          authorPhoto: user.photoURL || '',
          content: newPost.trim(),
          images: imageUrls,
          tags: postTags,
          groupId: selectedGroupId || null,
          likes: [],
          commentCount: 0,
          createdAt: serverTimestamp(),
        });
        
        await addXP(user.uid, 'create_post');
      
      setNewPost('');
      setPostTags([]);
      setSelectedGroupId('');
      setSelectedImages([]);
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
      setImagePreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Post published successfully!', { id: toastId });

      // Log activity
      await logActivity({
        userId: user.uid,
        type: 'create_post',
        targetId: '', // No specific target ID for a general post
        targetName: 'a new transmission',
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#18181b', '#ffffff']
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
      toast.error('Failed to publish post.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async (postId: string, currentLikes: string[]) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    const isLiked = currentLikes.includes(user.uid);

    try {
      await updateDoc(postRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      if (!isLiked) {
        await logActivity({
          userId: user.uid,
          type: 'like_post',
          targetId: postId,
          targetName: 'a transmission',
        });
        await addXP(user.uid, 'like_post');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
      toast.error('Failed to update like.');
    }
  };

  const toggleSavePost = async (postId: string) => {
    if (!user || !userProfile) return;
    const userRef = doc(db, 'users', user.uid);
    const isSaved = userProfile.savedPosts?.includes(postId);

    try {
      await updateDoc(userRef, {
        savedPosts: isSaved ? arrayRemove(postId) : arrayUnion(postId)
      });
      toast.success(isSaved ? 'Post removed from bookmarks.' : 'Post bookmarked for later!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error('Failed to update bookmarks.');
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

  const handleDeletePost = async (postId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'PURGE_INTEL',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_WIPE_THIS_DATA_STREAM_FROM_THE_FEED?_THIS_ACTION_IS_IRREVERSIBLE!',
      onConfirm: async () => {
        const toastId = toast.loading('Purging post...');
        try {
          await deleteDoc(doc(db, 'posts', postId));
          toast.success('Post purged.', { id: toastId });
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
          toast.error('Failed to purge post.', { id: toastId });
        }
      }
    });
  };

  const handleUpdatePost = async (postId: string) => {
    if (!editContent.trim()) return;
    const toastId = toast.loading('Updating post...');
    try {
      await updateDoc(doc(db, 'posts', postId), {
        content: editContent.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingPostId(null);
      setEditContent('');
      toast.success('Post updated.', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
      toast.error('Failed to update post.', { id: toastId });
    }
  };

  const handleToggleConnection = async (authorId: string, state: string) => {
    if (!user) return;
    try {
      if (state === 'none' || state === 'incoming') {
        await toggleUserConnection(user, authorId, false); // Sends request
        toast.success('Connection request sent.');
      } else if (state === 'connected') {
        await toggleUserConnection(user, authorId, true); // Removes request
        toast.success('Connection removed.');
      } else if (state === 'pending') {
        await toggleUserConnection(user, authorId, true); // Allows un-requesting
        toast.success('Connection request withdrawn.');
      }
    } catch (error) {
      toast.error('Failed to update connection.');
    }
  };

  const getConnState = (authorId: string) => {
    if (userProfile?.connections?.includes(authorId)) return 'connected';
    if (userProfile?.sentRequests?.includes(authorId)) return 'pending';
    if (userProfile?.pendingConnections?.includes(authorId)) return 'incoming';
    return 'none';
  };

  const handleAIAssist = async () => {
    if (!newPost.trim()) {
      toast.error('Please enter a few words for AI to expand on.');
      return;
    }
    
    setIsGenerating(true);
    const toastId = toast.loading('AI is drafting your post...');
    try {
      const generated = await generatePostContent(newPost);
      setNewPost(generated);
      toast.success('AI draft ready!', { id: toastId });
    } catch (error) {
      toast.error('AI failed to generate content.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIImageGenerate = async () => {
    if (!newPost.trim()) {
      toast.error('Please enter some text so AI knows what to generate.');
      return;
    }

    setIsGeneratingImage(true);
    const toastId = toast.loading('AI is creating an image...');
    try {
      const base64Image = await generateImage(newPost);
      if (base64Image) {
        // Convert base64 to File object to reuse existing upload logic
        const res = await fetch(base64Image);
        const blob = await res.blob();
        const file = new File([blob], "ai-generated.png", { type: "image/png" });
        
        setSelectedImages(prev => [...prev, file]);
        setImagePreviews(prev => [...prev, base64Image]);
        toast.success('AI image generated!', { id: toastId });
      } else {
        toast.error('AI failed to generate image.', { id: toastId });
      }
    } catch (error) {
      console.error("AI Image Error:", error);
      toast.error('AI failed to generate image.', { id: toastId });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleBlockUser = async (authorId: string) => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: 'BLOCK_USER',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_SEVER_THIS_CONNECTION_AND_ERASE_THEIR_DATA_STREAM_FROM_YOUR_VIEW?',
      onConfirm: async () => {
        const toastId = toast.loading('Blocking user...');
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            blockedUsers: arrayUnion(authorId)
          });
          // Also remove connection if exists
          const isConnected = userProfile?.connections?.includes(authorId);
          if (isConnected) {
            await toggleUserConnection(user, authorId, true);
          }
          toast.success('User blocked.', { id: toastId });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
          toast.error('Failed to block user.', { id: toastId });
        }
      }
    });
  };

  const togglePostTag = (tag: string) => {
    setPostTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredPosts = posts
    .filter(post => !userProfile?.blockedUsers?.includes(post.authorId))
    .filter(post => {
      if (filterTag === 'All') return true;
      if (filterTag === 'Saved') return userProfile?.savedPosts?.includes(post.id);
      return post.tags?.includes(filterTag);
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
        return timeB - timeA;
      }
      if (sortBy === 'liked') {
        return (b.likes?.length || 0) - (a.likes?.length || 0);
      }
      if (sortBy === 'commented') {
        return (b.commentCount || 0) - (a.commentCount || 0);
      }
      return 0;
    });

  return (
    <div className="max-w-4xl mx-auto space-y-16 font-sans">
      {/* Onboarding Checklist */}
      <OnboardingChecklist />

      {/* Bento Kinetic Dashboard */}
      <BentoDashboard pulseInsight={pulseInsight} stats={stats} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div>
          <h1 className="text-6xl lg:text-8xl font-headline font-black text-on-surface uppercase italic tracking-[-0.04em] leading-[0.9]">THE_FEED</h1>
          <div className="mt-4 liquid-gradient border-2 border-on-surface px-4 py-2 shadow-brutal inline-block">
            <p className="text-on-surface font-bold uppercase italic tracking-widest text-xs">COMMUNITY_STREAM_V2.0</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Main Stream */}
        <div className="xl:col-span-8 space-y-12">
          {/* Create Post */}
          <div className="bg-surface-container-low border-2 border-outline/15 shadow-brutal relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 liquid-gradient" />
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-on-surface" />
        </div>
        <form onSubmit={handleCreatePost} className="p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="relative group">
                <div className="w-20 h-20 border-2 border-on-surface shadow-brutal overflow-hidden group-hover:scale-105 transition-transform">
                  <img 
                    src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}`} 
                    alt="You" 
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-secondary border-2 border-on-surface p-1 shadow-brutal rotate-12">
                  <Star className="w-4 h-4 fill-on-surface text-on-surface" />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-8">
              <RichTextEditor
                content={newPost}
                onChange={setNewPost}
                placeholder="TRANSMIT_DATA_HERE..."
              />
              
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="w-24 h-24 border-2 border-on-surface shadow-brutal overflow-hidden">
                        <img 
                          src={preview} 
                          alt={`Preview ${index}`} 
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-on-surface text-surface p-1 border-2 border-surface shadow-brutal hover:bg-secondary hover:text-on-surface transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase italic tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" /> TARGET_ZONE
                  </p>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-surface-container-lowest border-2 border-on-surface p-3 text-[10px] font-bold uppercase italic tracking-widest focus:outline-none focus:border-primary focus:shadow-brutal"
                  >
                    <option value="">PUBLIC_STREAM</option>
                    {Object.values(groups)
                      .filter(g => (g as any).members?.includes(user?.uid))
                      .map(group => (
                        <option key={group.id} value={group.id}>
                          { (group as any).name || 'UNNAMED_GROUP' }
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase italic tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> DATA_TAGS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePostTag(tag)}
                        className={cn(
                          "chip-pill border-2 border-transparent",
                          postTags.includes(tag) && "chip-pill-active border-on-surface"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-8 border-t-2 border-outline/15">
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-surface border-2 border-on-surface p-3 shadow-brutal hover:bg-secondary hover:shadow-brutal-lg transition-all"
                    title="ADD_IMAGE"
                  >
                    <ImageIcon className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handleAIImageGenerate}
                    disabled={!newPost.trim() || isGeneratingImage || isSubmitting}
                    className="bg-surface border-2 border-on-surface p-3 shadow-brutal hover:bg-primary hover:shadow-brutal-lg transition-all disabled:opacity-50"
                    title="AI_IMAGE_GEN"
                  >
                    <Sparkles className={cn("w-6 h-6", isGeneratingImage && "animate-spin")} />
                  </button>
                  <button
                    type="button"
                    onClick={handleAIAssist}
                    disabled={!newPost.trim() || isGenerating || isSubmitting}
                    className="bg-surface border-2 border-on-surface p-3 shadow-brutal hover:bg-tertiary hover:shadow-brutal-lg transition-all disabled:opacity-50"
                    title="AI_GHOSTWRITER"
                  >
                    <Zap className={cn("w-6 h-6", isGenerating && "animate-pulse")} />
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={(!newPost.trim() && selectedImages.length === 0) || isSubmitting}
                  className="liquid-btn flex items-center justify-center gap-3 group"
                >
                  {isSubmitting ? 'TRANSMITTING...' : 'BLAST_IT'}
                  <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Filters & Sorting */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-[10px] font-bold uppercase italic tracking-widest text-on-surface-variant">// FILTER_STREAM</p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase italic tracking-widest">SORT:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface border-2 border-on-surface font-bold text-[10px] uppercase italic p-2 focus:outline-none focus:border-primary focus:shadow-brutal"
            >
              <option value="recent">RECENT</option>
              <option value="liked">HOTTEST</option>
              <option value="commented">CHATTIEST</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {['All', 'Saved', ...COMMON_TAGS].map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={cn(
                "chip-pill border-2 border-transparent",
                filterTag === tag && "chip-pill-active border-on-surface"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-12">
        <AnimatePresence>
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              ref={index === filteredPosts.length - 1 ? lastPostElementRef : null}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-surface-container-low border-2 border-outline/15 shadow-brutal p-8 group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 liquid-gradient opacity-30" />
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <Link to={`/feed/profile/${post.authorId}`} className="w-16 h-16 border-2 border-on-surface shadow-brutal overflow-hidden shrink-0 block hover:scale-105 transition-transform">
                    <img 
                      src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`} 
                      alt={post.authorName} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                    />
                  </Link>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link to={`/feed/profile/${post.authorId}`} className="text-xl font-headline font-black text-on-surface uppercase italic tracking-tight hover:text-primary transition-colors leading-tight">
                        {post.authorName}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="bg-secondary border-2 border-on-surface px-2 py-0.5 text-[8px] font-bold uppercase italic shadow-brutal">LVL {Math.floor(Math.random() * 50) + 1}</span>
                        {user && user.uid !== post.authorId && (() => {
                          const cState = getConnState(post.authorId);
                          return (
                          <button
                            onClick={() => handleToggleConnection(post.authorId, cState)}
                            disabled={cState === 'pending'}
                            className={cn(
                              "border-2 border-on-surface px-2 py-0.5 text-[8px] font-bold uppercase italic shadow-brutal transition-all",
                              cState === 'connected' ? "bg-primary text-on-surface" :
                              cState === 'pending' ? "bg-on-surface text-surface opacity-50 cursor-not-allowed" : 
                              "bg-surface text-on-surface hover:bg-secondary hover:shadow-brutal-lg"
                            )}
                          >
                            {cState === 'connected' ? 'COMMUNITY' : cState === 'pending' ? 'PENDING' : cState === 'incoming' ? 'ACCEPT REQUEST' : '+ JOIN'}
                          </button>
                          );
                        })()}
                      </div>
                    </div>
                    <p className="text-[8px] font-mono uppercase italic tracking-widest text-on-surface-variant mt-2">
                      {post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'JUST NOW'}
                      {post.updatedAt && (
                        <span className="ml-2 text-primary">
                          // EDITED {post.updatedAt?.toDate ? formatDistanceToNow(post.updatedAt.toDate(), { addSuffix: true }) : 'JUST NOW'}
                        </span>
                      )}
                      {post.groupId && groups[post.groupId] && (
                        <span className="ml-2">
                          // IN <Link to={`/feed/groups/${post.groupId}`} className="text-secondary hover:text-primary transition-colors">{(groups[post.groupId] as any).name}</Link>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="relative group/menu">
                  <button className="p-2 border-2 border-on-surface bg-surface hover:bg-primary hover:shadow-brutal transition-all">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border-2 border-on-surface shadow-brutal opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
                    {(() => {
                      const isAuthor = user?.uid === post.authorId;
                      const group = post.groupId ? groups[post.groupId] : null;
                      const isGroupCreator = group?.creatorId === user?.uid;
                      const isGroupModerator = group?.moderators?.includes(user?.uid || '');
                      const canDelete = isAuthor || isGroupCreator || isGroupModerator;

                      return (
                        <div className="p-2 space-y-2">
                          {isAuthor && (
                            <button 
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditContent(post.content);
                              }}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase italic bg-surface border-2 border-on-surface hover:bg-primary transition-colors flex items-center gap-2 shadow-brutal"
                            >
                              <Edit2 className="w-4 h-4" /> EDIT
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase italic bg-surface border-2 border-on-surface hover:bg-tertiary transition-colors flex items-center gap-2 shadow-brutal"
                            >
                              <Trash2 className="w-4 h-4" /> PURGE
                            </button>
                          )}
                          {!isAuthor && (
                            <button 
                              onClick={() => navigate(`/messages?chat=${post.authorId}`)}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase italic bg-surface border-2 border-on-surface hover:bg-secondary transition-colors flex items-center gap-2 shadow-brutal"
                            >
                              <MessageSquare className="w-4 h-4" /> MESSAGE
                            </button>
                          )}
                          {!isAuthor && (
                            <button 
                              onClick={() => handleBlockUser(post.authorId)}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase italic bg-surface border-2 border-on-surface hover:bg-on-surface hover:text-surface transition-colors shadow-brutal"
                            >
                              <Ghost className="w-4 h-4" /> SEVER_LINK
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {editingPostId === post.id ? (
                <div className="mb-8">
                  <RichTextEditor
                    content={editContent}
                    onChange={setEditContent}
                    className="text-lg min-h-[120px]"
                  />
                  <div className="flex justify-end gap-4 mt-4">
                    <button
                      onClick={() => {
                        setEditingPostId(null);
                        setEditContent('');
                      }}
                      className="bg-surface border-2 border-on-surface px-4 py-2 text-[10px] font-bold uppercase italic shadow-brutal hover:bg-surface-container-low transition-all"
                    >
                      ABORT
                    </button>
                    <button
                      onClick={() => handleUpdatePost(post.id)}
                      className="liquid-btn px-4 py-2 text-[10px]"
                    >
                      SYNC_CHANGES
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <div 
                    className="text-on-surface font-bold text-xl italic leading-tight tracking-tight mb-6 prose prose-invert max-w-none prose-p:leading-tight prose-p:my-0 uppercase"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="chip-pill text-[8px] px-2 py-0.5 border-2 border-on-surface/10">
                          #{tag.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {post.images && post.images.length > 0 && (
                <div className={cn(
                  "grid gap-4 mb-8",
                  post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                  {post.images.map((url, index) => (
                    <div key={index} className="border-2 border-on-surface shadow-brutal overflow-hidden relative group/img">
                      <img 
                        src={url} 
                        alt={`Post attachment ${index + 1}`}
                        className="w-full h-64 object-cover grayscale group-hover/img:grayscale-0 transition-all group-hover/img:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-8 pt-8 border-t-2 border-outline/15">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleLike(post.id, post.likes || [])}
                  className={cn(
                    "flex items-center gap-3 font-bold text-[10px] uppercase italic transition-all group/btn",
                    post.likes?.includes(user?.uid || '') ? 'text-secondary' : 'text-on-surface-variant hover:text-secondary'
                  )}
                >
                  <motion.div 
                    key={post.likes?.includes(user?.uid || '') ? 'liked' : 'unliked'}
                    initial={false}
                    animate={post.likes?.includes(user?.uid || '') ? { scale: [1, 1.4, 1], rotate: [0, 15, -15, 0] } : { scale: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn(
                      "p-3 border-2 border-on-surface shadow-brutal group-hover/btn:shadow-brutal-lg group-hover/btn:-translate-y-0.5 transition-all",
                      post.likes?.includes(user?.uid || '') ? "bg-secondary text-on-secondary" : "bg-surface"
                    )}
                  >
                    <Heart className={cn("w-5 h-5", post.likes?.includes(user?.uid || '') && "fill-current")} />
                  </motion.div>
                  <span className="text-xs font-black italic">{post.likes?.length || 0}</span>
                </motion.button>
                <button 
                  onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                  className="flex items-center gap-3 font-bold text-[10px] uppercase italic text-on-surface-variant hover:text-primary transition-all group/btn"
                >
                  <div className="p-3 bg-surface border-2 border-on-surface shadow-brutal group-hover/btn:shadow-brutal-lg group-hover/btn:-translate-y-0.5 transition-all">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black italic">{post.commentCount || 0}</span>
                </button>
                <motion.button 
                  whileTap={{ scale: 0.8 }}
                  onClick={() => toggleSavePost(post.id)}
                  className={cn(
                    "flex items-center gap-3 font-bold text-[10px] uppercase italic transition-all group/btn",
                    userProfile?.savedPosts?.includes(post.id) ? 'text-tertiary' : 'text-on-surface-variant hover:text-tertiary'
                  )}
                  title={userProfile?.savedPosts?.includes(post.id) ? "UNSAVE_POST" : "SAVE_POST"}
                >
                  <div className={cn(
                    "p-3 border-2 border-on-surface shadow-brutal group-hover/btn:shadow-brutal-lg group-hover/btn:-translate-y-0.5 transition-all",
                    userProfile?.savedPosts?.includes(post.id) ? "bg-tertiary text-on-surface" : "bg-surface"
                  )}>
                    <Bookmark className={cn("w-5 h-5", userProfile?.savedPosts?.includes(post.id) && "fill-current")} />
                  </div>
                  <span className="text-xs font-black italic">{userProfile?.savedPosts?.includes(post.id) ? 'SAVED' : 'SAVE'}</span>
                </motion.button>
                <button className="flex items-center gap-3 font-bold text-[10px] uppercase italic text-on-surface-variant hover:text-secondary transition-all ml-auto group/btn">
                  <div className="p-3 bg-surface border-2 border-on-surface shadow-brutal group-hover/btn:shadow-brutal-lg group-hover/btn:-translate-y-0.5 transition-all">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black italic">SHARE</span>
                </button>
              </div>

              <AnimatePresence>
                {expandedComments[post.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-8 mt-8 border-t-2 border-outline/15">
                      <PostComments postId={post.id} postAuthorId={post.authorId} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading State / End of Feed */}
        <div className="py-10 text-center">
          {isLoadingMore && hasMore ? (
            <div className="flex justify-center">
              <div className="w-12 h-12 border-4 border-on-surface border-t-primary animate-spin shadow-brutal"></div>
            </div>
          ) : !hasMore && filteredPosts.length > 0 ? (
            <div className="bg-surface-container-low border-2 border-outline/15 p-6 shadow-brutal inline-block rotate-1">
              <p className="text-on-surface font-headline font-black uppercase italic tracking-widest text-xs">
                // END_OF_TRANSMISSIONS // YOU_ARE_UP_TO_DATE
              </p>
            </div>
          ) : null}
        </div>

        {filteredPosts.length === 0 && !isLoadingMore && (
          <div className="bg-surface-container-low border-2 border-outline/15 text-center py-24 relative overflow-hidden shadow-brutal">
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
              <Ghost className="w-64 h-64 text-on-surface -rotate-12 -translate-x-24 -translate-y-24" />
            </div>
            <div className="relative z-10">
              <Ghost className="w-16 h-16 text-primary mx-auto mb-8 animate-bounce" />
              <h3 className="text-4xl font-headline font-black text-on-surface uppercase italic mb-4 tracking-tighter">GHOST_TOWN</h3>
              <div className="bg-surface-container-lowest border-2 border-outline/15 px-4 py-2 shadow-brutal inline-block">
                <p className="text-on-surface-variant font-bold uppercase italic tracking-widest text-[10px]">BE_THE_FIRST_TO_WAKE_UP_THE_COMMUNITY</p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

        {/* Bento Sidebar */}
        <div className="xl:col-span-4 space-y-8">
          {/* Trending Missions Bento Card */}
          <div className="glass-panel border-2 border-on-surface p-6 shadow-brutal relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
              <TrendingUp className="w-24 h-24 text-on-surface" />
            </div>
            <h3 className="text-xl font-headline font-black uppercase italic tracking-tighter text-on-surface mb-6 flex items-center gap-3">
              TRENDING_MISSIONS <Zap className="w-5 h-5 text-primary" />
            </h3>
            <div className="space-y-4">
              {['Launch 1.0', '100 True Fans', 'Build in Public', 'Protocol Alpha'].map((mission, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface-container-lowest border-2 border-on-surface shadow-brutal hover:bg-primary/10 cursor-pointer transition-all">
                  <span className="text-[10px] font-black uppercase italic tracking-widest">{mission}</span>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-secondary" />
                    <span className="text-[8px] font-black">{Math.floor(Math.random() * 50) + 10} BUILDS</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 bg-on-surface text-surface text-[10px] font-black uppercase italic hover:bg-primary hover:text-on-surface transition-all">
              EXPLORE_ALL_MISSIONS
            </button>
          </div>

          {/* Quick Connect Bento Card */}
          <div className="bg-secondary p-6 shadow-brutal border-2 border-on-surface relative overflow-hidden group">
            <div className="absolute -left-4 -bottom-4 opacity-10 group-hover:-rotate-12 transition-transform">
               <Users className="w-32 h-32 text-on-surface" />
            </div>
            <h3 className="text-xl font-headline font-black uppercase italic tracking-tighter text-on-surface mb-4">FOUNDER_SYNC</h3>
            <p className="text-[10px] font-black uppercase italic tracking-widest text-on-surface/60 mb-6">NODES_IN_YOUR_ORBIT</p>
            <div className="flex -space-x-4 mb-6">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="w-12 h-12 border-2 border-on-surface shadow-brutal overflow-hidden">
                   <img src={`https://picsum.photos/seed/${i+100}/100/100`} className="w-full h-full object-cover grayscale" alt="user" />
                 </div>
               ))}
            </div>
            <Link to="/feed/founder-match" className="block text-center py-3 bg-on-surface text-surface text-[10px] font-black uppercase italic shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
               RUN_MATCH_PROTOCOL
            </Link>
          </div>

          {/* Hall of Trust Bento Card */}
          <div className="bg-primary/20 p-6 shadow-brutal border-2 border-on-surface relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform">
               <Star className="w-32 h-32 text-on-surface" />
            </div>
            <h3 className="text-xl font-headline font-black uppercase italic tracking-tighter text-on-surface mb-2">HALL_OF_TRUST</h3>
            <p className="text-[10px] font-black uppercase italic tracking-widest text-on-surface/60 mb-6">MOST_VOUCHED_FOUNDERS</p>
            <div className="space-y-3">
               {[
                 { name: 'Founder Zero', vouches: 128, avatar: '1' },
                 { name: 'Cyber Nomad', vouches: 94, avatar: '2' },
                 { name: 'Protocol Lead', vouches: 82, avatar: '3' }
               ].map((founder, i) => (
                 <div key={i} className="flex items-center gap-3 p-2 bg-surface-container-lowest border-2 border-on-surface shadow-brutal">
                    <img src={`https://picsum.photos/seed/${founder.avatar}/50/50`} className="w-8 h-8 border-2 border-on-surface grayscale" />
                    <div className="flex-1 min-w-0">
                       <p className="text-[8px] font-black uppercase italic truncate">{founder.name}</p>
                       <div className="flex items-center gap-1">
                          <Star className="w-2 h-2 text-primary fill-primary" />
                          <span className="text-[10px] font-black">{founder.vouches}</span>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Community Pings Bento Case */}
          <div className="glass-panel border-2 border-on-surface p-6 shadow-brutal">
             <h3 className="text-xl font-headline font-black uppercase italic tracking-tighter text-on-surface mb-6 flex items-center gap-3">
                GLOBAL_PINGS <Activity className="w-5 h-5 text-accent" />
             </h3>
             <div className="space-y-6">
                {[
                  { text: "@PROTO_X manifested a new ARTIFACT", time: "2m ago" },
                  { text: "MISSION_HUB: 'SAAS_WARS' just spiked", time: "15m ago" },
                  { text: "@NEON reached LEVEL 50", time: "1h ago" }
                ].map((ping, i) => (
                  <div key={i} className="border-l-2 border-on-surface/20 pl-4 relative">
                    <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-accent rotate-45" />
                    <p className="text-[10px] font-black uppercase italic text-on-surface leading-tight mb-1">{ping.text}</p>
                    <span className="text-[8px] font-bold text-on-surface-variant uppercase">{ping.time}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

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
