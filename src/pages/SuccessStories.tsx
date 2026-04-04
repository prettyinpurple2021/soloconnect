import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, MessageSquare, Heart, Share2, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  createdAt: any;
}

interface SuccessStory {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  title: string;
  content: string;
  platform: 'SoloScribe' | 'Content Factory' | 'SoloSuccess AI' | 'Academy';
  likes: string[];
  comments?: Comment[];
  createdAt: any;
}

export function SuccessStories() {
  const { user } = useAuth();
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newStory, setNewStory] = useState({ title: '', content: '', platform: 'SoloScribe' });
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'success_stories'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SuccessStory[];
      setStories(storiesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'success_stories');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'success_stories'), {
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        ...newStory,
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewStory({ title: '', content: '', platform: 'SoloScribe' });
      toast.success('WIN BROADCASTED!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'success_stories');
      toast.error('FAILED TO BROADCAST WIN');
    }
  };

  const handleLike = async (storyId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      const storyRef = doc(db, 'success_stories', storyId);
      await updateDoc(storyRef, {
        likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `success_stories/${storyId}`);
    }
  };

  const handleAddComment = async (storyId: string) => {
    if (!user || !newComment.trim()) return;
    try {
      const storyRef = doc(db, 'success_stories', storyId);
      const comment: Comment = {
        id: Math.random().toString(36).substring(7),
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        userPhoto: user.photoURL || '',
        content: newComment.trim(),
        createdAt: new Date().toISOString()
      };
      await updateDoc(storyRef, {
        comments: arrayUnion(comment)
      });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `success_stories/${storyId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black text-black mb-2 uppercase italic tracking-tighter">THE WIN WALL</h1>
          <p className="text-black font-bold uppercase italic text-sm tracking-widest bg-[#00FF00] px-3 py-1 inline-block border-2 border-black">CELEBRATE WINS FROM THE TRIBE.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-[#FF00FF] border-4 border-black text-black px-8 py-4 font-black text-xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shrink-0"
        >
          <Plus className="w-6 h-6" /> SHARE WIN
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: 1 }}
            className="bg-white p-10 border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] mb-12"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black text-black uppercase italic tracking-tighter leading-none">BROADCAST YOUR WIN</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-black text-white border-2 border-black">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="block text-xs font-black uppercase italic tracking-widest text-black mb-3">MISSION TITLE</label>
                <input
                  type="text"
                  required
                  value={newStory.title}
                  onChange={e => setNewStory(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white border-4 border-black px-5 py-4 font-black uppercase italic text-lg focus:bg-[#00FFFF]/10 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none"
                  placeholder="WHAT DID YOU ACHIEVE?"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase italic tracking-widest text-black mb-3">CAVE PLATFORM</label>
                <select
                  value={newStory.platform}
                  onChange={e => setNewStory(prev => ({ ...prev, platform: e.target.value as any }))}
                  className="w-full bg-white border-4 border-black px-5 py-4 font-black uppercase italic text-lg focus:bg-[#00FFFF]/10 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none appearance-none"
                >
                  <option value="SoloScribe">TROLLSCRIBE (IDEATION/DOCS)</option>
                  <option value="Content Factory">CONTENT FACTORY (SOCIAL)</option>
                  <option value="SoloSuccess AI">TROLLSUCCESS AI (AGENTS)</option>
                  <option value="Academy">TROLL ACADEMY (LEARNING)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase italic tracking-widest text-black mb-3">THE INTEL</label>
                <textarea
                  required
                  value={newStory.content}
                  onChange={e => setNewStory(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full bg-white border-4 border-black px-5 py-4 font-black uppercase italic text-lg focus:bg-[#00FFFF]/10 transition-all min-h-[150px] resize-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none"
                  placeholder="TELL THE TRIBE ABOUT YOUR WIN..."
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 text-black font-black uppercase italic hover:text-[#FF00FF] transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="bg-[#00FF00] text-black px-10 py-4 border-4 border-black font-black uppercase italic text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:scale-95"
                >
                  POST WIN
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-10">
        {stories.map((story) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                  <img
                    src={story.userPhoto || `https://ui-avatars.com/api/?name=${story.userName}&background=random`}
                    alt={story.userName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-black text-2xl text-black uppercase italic tracking-tighter leading-none">{story.userName}</h3>
                  <p className="text-xs font-black uppercase italic text-black/40 mt-1">
                    {story.createdAt ? formatDistanceToNow(story.createdAt.toDate()) : 'JUST NOW'} AGO
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#FFFF00] border-4 border-black text-xs font-black uppercase italic tracking-wider text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Trophy className="w-4 h-4" />
                {story.platform}
              </div>
            </div>

            <h4 className="text-3xl font-black text-black mb-4 uppercase italic tracking-tighter leading-none">{story.title}</h4>
            <p className="text-black font-bold text-lg leading-relaxed mb-8 italic">{story.content}</p>

            <div className="flex items-center gap-8 pt-6 border-t-4 border-black">
              <button 
                onClick={() => handleLike(story.id, story.likes.includes(user?.uid || ''))}
                className={cn(
                  "flex items-center gap-3 transition-all hover:scale-110",
                  story.likes.includes(user?.uid || '') ? "text-[#FF0000]" : "text-black hover:text-[#FF0000]"
                )}
              >
                <Heart className={cn("w-7 h-7", story.likes.includes(user?.uid || '') && "fill-current")} />
                <span className="text-xl font-black italic">{story.likes.length}</span>
              </button>
              <button 
                onClick={() => setActiveComments(activeComments === story.id ? null : story.id)}
                className="flex items-center gap-3 text-black hover:text-[#00FFFF] transition-all hover:scale-110"
              >
                <MessageSquare className="w-7 h-7" />
                <span className="text-xl font-black italic">{story.comments?.length || 0}</span>
              </button>
              <button className="flex items-center gap-3 text-black hover:text-[#00FF00] transition-all hover:scale-110 ml-auto">
                <Share2 className="w-7 h-7" />
              </button>
            </div>

            <AnimatePresence>
              {activeComments === story.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-10 mt-10 border-t-4 border-black space-y-6">
                    {story.comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-10 h-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden shrink-0">
                          <img
                            src={comment.userPhoto || `https://ui-avatars.com/api/?name=${comment.userName}&background=random`}
                            alt={comment.userName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 bg-[#00FFFF]/10 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-black text-black uppercase italic">{comment.userName}</span>
                            <span className="text-[10px] font-black text-black/40 uppercase italic">
                              {formatDistanceToNow(new Date(comment.createdAt))} AGO
                            </span>
                          </div>
                          <p className="text-sm font-bold text-black italic">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex gap-4 pt-4">
                      <div className="w-10 h-10 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden shrink-0">
                        <img
                          src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=random`}
                          alt="Me"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 flex gap-3">
                        <input
                          type="text"
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(story.id)}
                          placeholder="ADD A COMMENT..."
                          className="flex-1 bg-white border-4 border-black px-4 py-2 font-black uppercase italic text-sm focus:bg-[#00FFFF]/10 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-none"
                        />
                        <button 
                          onClick={() => handleAddComment(story.id)}
                          className="bg-[#FF00FF] text-black px-6 py-2 border-4 border-black font-black uppercase italic text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                        >
                          SEND
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
