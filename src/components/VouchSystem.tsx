import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Star, ShieldCheck, Zap, Target, Trash2, Plus, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { logActivity } from '../lib/activities';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Vouch {
  id: string;
  toUserId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string;
  content: string;
  category: 'technical' | 'equity' | 'vision' | 'execution';
  createdAt: any;
}

interface VouchSystemProps {
  userId: string;
  userName: string;
}

export function VouchSystem({ userId, userName }: VouchSystemProps) {
  const { user } = useAuth();
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newVouch, setNewVouch] = useState({
    content: '',
    category: 'technical' as Vouch['category']
  });

  const isOwner = user?.uid === userId;

  useEffect(() => {
    const q = query(
      collection(db, 'vouches'),
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVouches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vouch)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vouches');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newVouch.content.trim()) return;

    const toastId = toast.loading('Sending vouch...');
    try {
      await addDoc(collection(db, 'vouches'), {
        toUserId: userId,
        fromUserId: user.uid,
        fromUserName: user.displayName || 'Anonymous',
        fromUserPhoto: user.photoURL || '',
        content: newVouch.content.trim(),
        category: newVouch.category,
        createdAt: serverTimestamp()
      });

      await logActivity({
        userId: user.uid,
        type: 'vouch_user',
        targetId: userId,
        targetName: userName
      });

      setNewVouch({ content: '', category: 'technical' });
      setIsAdding(false);
      toast.success('Vouch deployed.', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vouches');
      toast.error('Failed to vouch.', { id: toastId });
    }
  };

  const handleDelete = async (vouchId: string) => {
    try {
      await deleteDoc(doc(db, 'vouches', vouchId));
      toast.success('Vouch redacted.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vouches/${vouchId}`);
    }
  };

  const categoryIcons = {
    technical: ShieldCheck,
    equity: Zap,
    vision: Star,
    execution: Target
  };

  const categoryColors = {
    technical: 'text-primary',
    equity: 'text-secondary',
    vision: 'text-tertiary',
    execution: 'text-accent'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-headline font-black uppercase italic tracking-tight text-on-surface flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" /> PEER_VOUCHES
        </h3>
        {!isOwner && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="liquid-btn text-[10px] px-4 py-2 flex items-center gap-2"
          >
            <Plus className="w-3 h-3" /> VOUCH_FOUNDER
          </button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            onSubmit={handleSubmit}
            className="bg-surface border-2 border-on-surface p-6 shadow-brutal space-y-4"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">SIGNAL_CATEGORY</label>
              <div className="flex gap-2">
                {(['technical', 'equity', 'vision', 'execution'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewVouch(prev => ({ ...prev, category: cat }))}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-bold uppercase border-2 shadow-brutal transition-all",
                      newVouch.category === cat 
                        ? "bg-primary border-on-surface text-on-surface translate-x-[2px] translate-y-[2px] shadow-none" 
                        : "bg-surface border-on-surface text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">TRANSMISSION_CONTENT</label>
              <textarea
                value={newVouch.content}
                onChange={(e) => setNewVouch(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What makes this founder elite?"
                className="w-full h-24 text-sm"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="liquid-btn flex-1 py-3"
              >
                DEPLOY_VOUCH
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="bg-surface text-on-surface border-2 border-on-surface px-6 py-3 font-bold uppercase text-xs shadow-brutal hover:bg-surface-container-low"
              >
                ABORT
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {vouches.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-outline/15 shadow-brutal bg-surface-container-lowest/30">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant italic">
              NO_SIGNALS_DETECTED.
            </p>
          </div>
        ) : (
          vouches.map((vouch, idx) => {
            const Icon = categoryIcons[vouch.category];
            return (
              <motion.div
                key={vouch.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-surface-container-lowest border-2 border-on-surface p-6 shadow-brutal relative group"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-12 h-12 border-2 border-on-surface shadow-brutal">
                    <img src={vouch.fromUserPhoto || `https://ui-avatars.com/api/?name=${vouch.fromUserName}`} alt={vouch.fromUserName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-headline font-black uppercase text-on-surface italic">{vouch.fromUserName}</span>
                        <span className="text-[8px] font-mono text-on-surface-variant">// VOUCHED</span>
                        <div className={cn("flex items-center gap-1 border-2 border-on-surface px-2 py-0.5 rounded-full shadow-brutal font-bold uppercase text-[8px]", categoryColors[vouch.category])}>
                          <Icon className="w-2 h-2" /> {vouch.category}
                        </div>
                      </div>
                      <span className="text-[8px] font-mono text-on-surface-variant">
                        {vouch.createdAt?.toDate ? formatDistanceToNow(vouch.createdAt.toDate(), { addSuffix: true }) : 'RECENT'}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface leading-relaxed italic">
                      "{vouch.content}"
                    </p>
                  </div>
                </div>

                {(isOwner || user?.uid === vouch.fromUserId) && (
                  <button
                    onClick={() => handleDelete(vouch.id)}
                    className="absolute top-2 right-2 p-1 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity hover:text-accent"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
