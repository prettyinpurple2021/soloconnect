import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Send, Image as ImageIcon, UserPlus, UserCheck, X, Edit2, Check, Trash2, Sparkles, TrendingUp, Activity, Zap, Ghost, Star, Trophy, Flame, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toggleUserConnection } from '../lib/connections';
import { cn } from '../lib/utils';
import { Link } from 'react-router';
import { toast } from 'react-hot-toast';
import { PostComments } from '../components/PostComments';
import { ConfirmModal } from '../components/ConfirmModal';
import { RichTextEditor } from '../components/RichTextEditor';
import { generatePostContent, generateImage, analyzePulse } from '../services/geminiService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPulse = async () => {
      const stats = {
        activeNow: 1204,
        milestones: 42,
        collaborations: 18,
        velocity: '98%'
      };
      const insight = await analyzePulse(stats);
      setPulseInsight(insight);
    };
    fetchPulse();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, []);

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
      title: 'DELETE_POST',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_WIPE_THIS_DATA_STREAM_FROM_THE_FEED?',
      onConfirm: async () => {
        const toastId = toast.loading('Deleting post...');
        try {
          await deleteDoc(doc(db, 'posts', postId));
          toast.success('Post deleted.', { id: toastId });
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `posts/${postId}`);
          toast.error('Failed to delete post.', { id: toastId });
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

  const handleToggleConnection = async (authorId: string) => {
    if (!user) return;
    const isConnected = userProfile?.connections?.includes(authorId);
    try {
      await toggleUserConnection(user, authorId, !!isConnected);
      toast.success(isConnected ? 'Connection removed.' : 'Connection request sent.');
    } catch (error) {
      toast.error('Failed to update connection.');
    }
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
      {/* Kinetic Momentum Dashboard */}
      <motion.div 
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-secondary border-[6px] border-black p-8 lg:p-12 relative overflow-hidden shadow-kinetic"
      >
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <TrendingUp className="w-32 h-32 text-black" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
            <div>
              <h2 className="text-4xl lg:text-6xl font-black flex items-center gap-4 uppercase italic text-black tracking-[-2px] leading-none">
                PULSE_MONITOR <Activity className="w-10 h-10 text-primary" />
              </h2>
              <div className="mt-4 bg-surface-bg border-[4px] border-black p-4 shadow-kinetic-sm inline-block">
                <p className="text-primary font-mono text-sm uppercase italic leading-tight">
                  {">"} {pulseInsight}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-5xl font-black text-black flex items-center justify-end gap-2 tracking-tighter italic">
                  <Zap className="w-8 h-8 fill-current" /> 98%
                </div>
                <p className="text-black font-bold text-[10px] uppercase italic tracking-widest mt-1">MOMENTUM_STABLE</p>
              </div>
              <div className="bg-accent border-[6px] border-black p-3 shadow-kinetic-sm rotate-3">
                <Trophy className="w-8 h-8 text-black" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 h-40 w-full bg-surface-bg border-[6px] border-black shadow-kinetic-sm overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'Mon', value: 40 },
                  { name: 'Tue', value: 30 },
                  { name: 'Wed', value: 65 },
                  { name: 'Thu', value: 45 },
                  { name: 'Fri', value: 90 },
                  { name: 'Sat', value: 70 },
                  { name: 'Sun', value: 85 },
                ]}>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0D0D0D', border: '4px solid #E5E2E1', borderRadius: '0px', color: '#E5E2E1', fontFamily: 'monospace', fontWeight: '700' }}
                    itemStyle={{ color: '#39FF14' }}
                  />
                  <Area 
                    type="step" 
                    dataKey="value" 
                    stroke="#39FF14" 
                    strokeWidth={4}
                    fillOpacity={0.2} 
                    fill="#39FF14" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-surface-container border-[6px] border-on-surface p-4 shadow-kinetic-sm relative overflow-hidden group">
              <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform">
                <Star className="w-16 h-16 fill-current text-on-surface" />
              </div>
              <p className="text-[8px] font-bold uppercase italic tracking-widest mb-3 text-on-surface/60">TOP_NODE</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border-[4px] border-on-surface bg-accent shadow-kinetic-thud overflow-hidden">
                  <img src="https://picsum.photos/seed/founder/100/100" alt="Top Founder" className="w-full h-full object-cover grayscale" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase italic tracking-tight text-on-surface leading-none">@NEON_GLOW</p>
                  <p className="text-[8px] font-mono uppercase italic tracking-widest text-primary mt-1">LVL 42 // 1.2K XP</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-bg border-[4px] border-black p-4 shadow-kinetic-sm hover:bg-black transition-all cursor-pointer group">
              <p className="text-primary text-[8px] font-bold uppercase italic tracking-widest mb-1 group-hover:text-secondary">ACTIVE_NODES</p>
              <p className="text-2xl font-black uppercase italic tracking-tight leading-none text-on-surface">1,204</p>
            </div>
            <div className="bg-surface-bg border-[4px] border-black p-4 shadow-kinetic-sm hover:bg-black transition-all cursor-pointer group">
              <p className="text-primary text-[8px] font-bold uppercase italic tracking-widest mb-1 group-hover:text-secondary">MILESTONES</p>
              <p className="text-2xl font-black uppercase italic tracking-tight leading-none text-on-surface">42</p>
            </div>
            <div className="bg-surface-bg border-[4px] border-black p-4 shadow-kinetic-sm hover:bg-black transition-all cursor-pointer group">
              <p className="text-primary text-[8px] font-bold uppercase italic tracking-widest mb-1 group-hover:text-secondary">COLLABS</p>
              <p className="text-2xl font-black uppercase italic tracking-tight leading-none text-on-surface">18</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
        <div>
          <h1 className="text-6xl lg:text-8xl font-black text-on-surface uppercase italic tracking-[-4px] leading-none">THE_FEED</h1>
          <div className="mt-4 bg-primary border-[4px] border-black px-4 py-2 shadow-kinetic-sm inline-block">
            <p className="text-black font-bold uppercase italic tracking-widest text-xs">COMMUNITY_STREAM_V2.0</p>
          </div>
        </div>
      </div>

      {/* Create Post */}
      <div className="pulse-card">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-on-surface" />
        </div>
        <form onSubmit={handleCreatePost}>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0">
              <div className="relative group">
                <div className="w-20 h-20 border-[6px] border-on-surface shadow-kinetic-sm overflow-hidden group-hover:scale-105 transition-transform">
                  <img 
                    src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}`} 
                    alt="You" 
                    className="w-full h-full object-cover grayscale"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-secondary border-[4px] border-black p-1 shadow-kinetic-thud rotate-12">
                  <Star className="w-4 h-4 fill-black text-black" />
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
                      <div className="w-24 h-24 border-[4px] border-on-surface shadow-kinetic-sm overflow-hidden">
                        <img 
                          src={preview} 
                          alt={`Preview ${index}`} 
                          className="w-full h-full object-cover grayscale"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-black text-secondary p-1 border-2 border-secondary shadow-kinetic-thud hover:bg-secondary hover:text-black transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-on-surface uppercase italic tracking-widest flex items-center gap-2">
                    <Users className="w-3 h-3" /> TARGET_ZONE
                  </p>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-surface-bg border-[4px] border-on-surface p-3 text-[10px] font-bold uppercase italic tracking-widest focus:outline-none focus:border-primary"
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
                  <p className="text-[10px] font-bold text-on-surface uppercase italic tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> DATA_TAGS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePostTag(tag)}
                        className={cn(
                          "px-3 py-1 text-[8px] font-bold uppercase italic border-[3px] border-on-surface transition-all",
                          postTags.includes(tag)
                            ? "bg-primary text-black border-black shadow-kinetic-thud translate-x-1 translate-y-1"
                            : "bg-surface-bg text-on-surface hover:bg-accent hover:text-black hover:border-black"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-8 border-t-[6px] border-on-surface">
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
                    className="bg-surface-bg border-[4px] border-on-surface p-3 shadow-kinetic-thud hover:bg-accent hover:text-black hover:border-black transition-all"
                    title="ADD_IMAGE"
                  >
                    <ImageIcon className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={handleAIImageGenerate}
                    disabled={!newPost.trim() || isGeneratingImage || isSubmitting}
                    className="bg-surface-bg border-[4px] border-on-surface p-3 shadow-kinetic-thud hover:bg-secondary hover:text-black hover:border-black transition-all disabled:opacity-50"
                    title="AI_IMAGE_GEN"
                  >
                    <Sparkles className={cn("w-6 h-6", isGeneratingImage && "animate-spin")} />
                  </button>
                  <button
                    type="button"
                    onClick={handleAIAssist}
                    disabled={!newPost.trim() || isGenerating || isSubmitting}
                    className="bg-surface-bg border-[4px] border-on-surface p-3 shadow-kinetic-thud hover:bg-primary hover:text-black hover:border-black transition-all disabled:opacity-50"
                    title="AI_GHOSTWRITER"
                  >
                    <Zap className={cn("w-6 h-6", isGenerating && "animate-pulse")} />
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={(!newPost.trim() && selectedImages.length === 0) || isSubmitting}
                  className="kinetic-btn flex items-center justify-center gap-3 group"
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
          <p className="text-[10px] font-bold uppercase italic tracking-widest text-on-surface/60">// FILTER_STREAM</p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold uppercase italic tracking-widest">SORT:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-bg border-[4px] border-on-surface font-bold text-[10px] uppercase italic p-2 focus:outline-none focus:border-primary"
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
                "px-4 py-2 text-[10px] font-bold uppercase italic border-[4px] border-on-surface transition-all",
                filterTag === tag
                  ? "bg-primary text-black border-black shadow-kinetic-sm translate-x-1 translate-y-1"
                  : "bg-surface-bg text-on-surface hover:bg-secondary hover:text-black hover:border-black"
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
          {filteredPosts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="pulse-card group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-[4px] border-on-surface shadow-kinetic-sm overflow-hidden shrink-0">
                    <img 
                      src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`} 
                      alt={post.authorName} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link to={`/profile/${post.authorId}`} className="text-xl font-black text-on-surface uppercase italic tracking-tight hover:text-primary transition-colors leading-none">
                        {post.authorName}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="bg-accent border-2 border-black px-2 py-0.5 text-[8px] font-bold uppercase italic shadow-kinetic-thud">LVL {Math.floor(Math.random() * 50) + 1}</span>
                        {user && user.uid !== post.authorId && (
                          <button
                            onClick={() => handleToggleConnection(post.authorId)}
                            className={cn(
                              "border-2 border-black px-2 py-0.5 text-[8px] font-bold uppercase italic shadow-kinetic-thud transition-all",
                              userProfile?.connections?.includes(post.authorId)
                                ? "bg-primary text-black"
                                : "bg-surface-bg text-on-surface hover:bg-secondary hover:text-black hover:border-black"
                            )}
                          >
                            {userProfile?.connections?.includes(post.authorId) ? 'TRIBE' : '+ JOIN'}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[8px] font-mono uppercase italic tracking-widest text-on-surface/60 mt-2">
                      {post.createdAt?.toDate ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'JUST NOW'}
                      {post.groupId && groups[post.groupId] && (
                        <span className="ml-2">
                          // IN <span className="text-secondary">{(groups[post.groupId] as any).name}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="relative group/menu">
                  <button className="p-2 border-[4px] border-on-surface bg-surface-bg hover:bg-primary hover:text-black transition-colors shadow-kinetic-thud">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container border-[6px] border-on-surface shadow-kinetic-active opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20">
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
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase italic bg-surface-bg border-[3px] border-on-surface hover:bg-primary hover:text-black transition-colors flex items-center gap-2 shadow-kinetic-thud"
                            >
                              <Edit2 className="w-4 h-4" /> EDIT
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase italic bg-surface-bg border-[3px] border-on-surface hover:bg-secondary hover:text-black transition-colors flex items-center gap-2 shadow-kinetic-thud"
                            >
                              <Trash2 className="w-4 h-4" /> DELETE
                            </button>
                          )}
                          {!isAuthor && (
                            <button 
                              onClick={() => handleBlockUser(post.authorId)}
                              className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase italic bg-surface-bg border-[3px] border-on-surface hover:bg-black hover:text-white transition-colors shadow-kinetic-thud"
                            >
                              BLOCK
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
                      className="bg-surface-bg border-[4px] border-on-surface px-4 py-2 text-[10px] font-bold uppercase italic shadow-kinetic-thud hover:bg-secondary hover:text-black hover:border-black transition-all"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => handleUpdatePost(post.id)}
                      className="bg-primary text-black border-[4px] border-black px-4 py-2 text-[10px] font-bold uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                      SAVE
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <div 
                    className="text-on-surface font-bold text-xl italic leading-tight tracking-tight mb-6 prose prose-invert max-w-none prose-p:leading-tight prose-p:my-0"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {post.tags.map(tag => (
                        <span key={tag} className="bg-surface-bg border-[3px] border-on-surface px-2 py-0.5 text-[8px] font-bold uppercase italic shadow-kinetic-thud">
                          #{tag}
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
                    <div key={index} className="border-[6px] border-on-surface shadow-kinetic-sm overflow-hidden">
                      <img 
                        src={url} 
                        alt={`Post attachment ${index + 1}`}
                        className="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-8 pt-8 border-t-[6px] border-on-surface">
                <motion.button 
                  whileTap={{ scale: 0.8 }}
                  onClick={() => toggleLike(post.id, post.likes || [])}
                  className={cn(
                    "flex items-center gap-3 font-bold text-[10px] uppercase italic transition-all group",
                    post.likes?.includes(user?.uid || '') ? 'text-secondary' : 'text-on-surface hover:text-secondary'
                  )}
                >
                  <motion.div
                    animate={post.likes?.includes(user?.uid || '') ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Heart className={cn("w-5 h-5", post.likes?.includes(user?.uid || '') && "fill-current")} />
                  </motion.div>
                  {post.likes?.length || 0}
                </motion.button>
                <button 
                  onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                  className="flex items-center gap-3 font-bold text-[10px] uppercase italic text-on-surface hover:text-primary transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  {post.commentCount || 0}
                </button>
                <motion.button 
                  whileTap={{ scale: 0.8 }}
                  onClick={() => toggleSavePost(post.id)}
                  className={cn(
                    "flex items-center gap-3 font-bold text-[10px] uppercase italic transition-all group",
                    userProfile?.savedPosts?.includes(post.id) ? 'text-accent' : 'text-on-surface hover:text-accent'
                  )}
                  title={userProfile?.savedPosts?.includes(post.id) ? "UNSAVE_POST" : "SAVE_POST"}
                >
                  <motion.div
                    animate={userProfile?.savedPosts?.includes(post.id) ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Bookmark className={cn("w-5 h-5", userProfile?.savedPosts?.includes(post.id) && "fill-current")} />
                  </motion.div>
                  {userProfile?.savedPosts?.includes(post.id) ? 'SAVED' : 'SAVE'}
                </motion.button>
                <button className="flex items-center gap-3 font-bold text-[10px] uppercase italic text-on-surface hover:text-accent transition-all ml-auto">
                  <Share2 className="w-5 h-5" />
                  SHARE
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
                    <div className="pt-8 mt-8 border-t-[6px] border-on-surface">
                      <PostComments postId={post.id} postAuthorId={post.authorId} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPosts.length === 0 && (
          <div className="bg-accent border-[6px] border-black text-center py-24 relative overflow-hidden shadow-kinetic">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <Ghost className="w-64 h-64 text-black -rotate-12 -translate-x-24 -translate-y-24" />
            </div>
            <div className="relative z-10">
              <Ghost className="w-16 h-16 text-black mx-auto mb-8 animate-bounce" />
              <h3 className="text-4xl font-black text-black uppercase italic mb-4 tracking-tighter">GHOST_TOWN</h3>
              <div className="bg-surface-bg border-[4px] border-black px-4 py-2 shadow-kinetic-sm inline-block">
                <p className="text-on-surface font-bold uppercase italic tracking-widest text-[10px]">BE_THE_FIRST_TO_WAKE_UP_THE_TRIBE</p>
              </div>
            </div>
          </div>
        )}
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
