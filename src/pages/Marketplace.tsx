import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Briefcase, Plus, Filter, Search, Tag, MessageSquare, Trash2, Clock, Globe, Zap, Target, DollarSign, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router';

interface Opportunity {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  title: string;
  description: string;
  type: 'hiring' | 'selling' | 'buying' | 'collaboration';
  tags: string[];
  budget: string;
  status: 'open' | 'closed';
  createdAt: any;
}

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<Opportunity['type'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newOpp, setNewOpp] = useState({
    title: '',
    description: '',
    type: 'collaboration' as Opportunity['type'],
    tags: '',
    budget: ''
  });

  useEffect(() => {
    const q = query(
      collection(db, 'opportunities'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOpportunities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Opportunity)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'opportunities');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newOpp.title.trim() || !newOpp.description.trim()) return;

    const toastId = toast.loading('TRANSMITTING_OPPORTUNITY...');
    try {
      await addDoc(collection(db, 'opportunities'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous Founder',
        userPhoto: user.photoURL || '',
        title: newOpp.title.trim(),
        description: newOpp.description.trim(),
        type: newOpp.type,
        tags: newOpp.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t),
        budget: newOpp.budget.trim(),
        status: 'open',
        createdAt: serverTimestamp()
      });

      setNewOpp({ title: '', description: '', type: 'collaboration', tags: '', budget: '' });
      setIsAdding(false);
      toast.success('OPPORTUNITY_LOCKED_IN_THE_STREAM.', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'opportunities');
      toast.error('STREAM_FAILURE.', { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ERASE_THIS_DATA_POINT?')) return;
    try {
      await deleteDoc(doc(db, 'opportunities', id));
      toast.success('Opportunity redacted.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `opportunities/${id}`);
    }
  };

  const filteredOpps = opportunities.filter(opp => {
    const matchesFilter = filter === 'all' || opp.type === filter;
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          opp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          opp.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const typeStyles = {
    hiring: 'bg-primary/20 text-primary border-primary',
    selling: 'bg-secondary/20 text-secondary border-secondary',
    buying: 'bg-tertiary/20 text-tertiary border-tertiary',
    collaboration: 'bg-accent/20 text-accent border-accent'
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-24 h-24 border-2 border-on-surface border-t-primary animate-spin shadow-brutal"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Header */}
      <div className="relative glass-panel p-12 border-4 border-on-surface shadow-kinetic-active overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 liquid-gradient" />
        <div className="absolute -right-20 -bottom-20 opacity-5 pointer-events-none">
          <Briefcase className="w-96 h-96" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-primary italic mb-4">FOUNDER_EXCHANGE_PROTOCOL</p>
              <h1 className="text-6xl md:text-8xl font-headline font-black text-on-surface uppercase italic tracking-tighter leading-none mb-6 drop-shadow-[4px_4px_0px_rgba(var(--color-primary),0.3)]">
                OPPORTUNITY_STREAM
              </h1>
              <p className="text-xl font-bold uppercase italic text-on-surface-variant tracking-tight max-w-2xl">
                The high-fidelity marketplace where solo founders trade code, equity, vision, and gigs. 
                <span className="text-primary"> LinkedIn structure with Facebook speed.</span>
              </p>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="liquid-btn py-6 px-10 flex items-center gap-4 text-xl group"
            >
              <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform" /> BROADCAST_NEED
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* Left Sidebar - Filters */}
        <div className="xl:col-span-3 space-y-8">
          <div className="glass-panel p-6 border-2 border-on-surface shadow-brutal sticky top-28">
            <h3 className="text-lg font-black uppercase italic tracking-tighter mb-6 flex items-center gap-3">
              <Filter className="w-5 h-5 text-primary" /> STREAM_FILTERS
            </h3>
            
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="SCAN_KEYWORDS..."
                  className="w-full bg-surface-container-lowest border-2 border-on-surface px-4 py-3 pl-10 text-[10px] font-black uppercase italic outline-none focus:bg-primary/5 transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40" />
              </div>

              <div className="space-y-2 pt-4">
                {(['all', 'hiring', 'selling', 'buying', 'collaboration'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center justify-between border-2 font-black uppercase italic text-[10px] transition-all",
                      filter === t 
                        ? "bg-on-surface text-surface border-on-surface translate-x-1 translate-y-1 shadow-none" 
                        : "bg-surface border-on-surface/20 text-on-surface-variant hover:border-on-surface hover:text-on-surface shadow-brutal hover:shadow-none"
                    )}
                  >
                    <span>{t}</span>
                    {filter === t && <Zap className="w-3 h-3 text-primary animate-pulse" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-12 p-4 bg-primary/10 border-2 border-dashed border-primary/30">
               <p className="text-[8px] font-bold uppercase text-primary italic leading-relaxed">
                 NOTICE: ALL_TRANSACTIONS_IN_THE_STREAM_ARE_P2P. USE_VERIFIED_VOUCH_NODES_FOR_TRUST.
               </p>
            </div>
          </div>
        </div>

        {/* Main Feed */}
        <div className="xl:col-span-9 space-y-8">
          <AnimatePresence>
            {isAdding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleSubmit} className="bg-surface border-4 border-on-surface p-10 shadow-kinetic relative mb-12">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Target className="w-32 h-32" />
                  </div>
                  
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-4">
                    NEW_OPPORTUNITY_PACKET <Zap className="w-6 h-6 text-primary" />
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">OPPORTUNITY_TITLE</label>
                        <input 
                          type="text" 
                          required
                          value={newOpp.title}
                          onChange={e => setNewOpp({...newOpp, title: e.target.value})}
                          placeholder="e.g. Seeking Rust Dev for high-freq protocol"
                          className="w-full bg-surface-container-low border-2 border-on-surface px-4 py-3 font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">TYPE_CLASSIFICATION</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['hiring', 'selling', 'buying', 'collaboration'] as const).map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setNewOpp({...newOpp, type: t})}
                              className={cn(
                                "py-2 text-[8px] font-black uppercase italic border-2 transition-all",
                                newOpp.type === t ? "bg-primary border-on-surface text-on-surface" : "bg-surface border-on-surface/10 text-on-surface-variant"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">BUDGET_/_EQUITY_INFO</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={newOpp.budget}
                            onChange={e => setNewOpp({...newOpp, budget: e.target.value})}
                            placeholder="e.g. $5k - $10k / 2% Equity"
                            className="w-full bg-surface-container-low border-2 border-on-surface px-4 py-3 font-bold text-sm pl-10"
                          />
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">TAGS_CSV</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={newOpp.tags}
                            onChange={e => setNewOpp({...newOpp, tags: e.target.value})}
                            placeholder="react, web3, scaling, go"
                            className="w-full bg-surface-container-low border-2 border-on-surface px-4 py-3 font-bold text-sm pl-10"
                          />
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface/40" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-10">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">DETAILED_INTEL</label>
                    <textarea 
                      required
                      value={newOpp.description}
                      onChange={e => setNewOpp({...newOpp, description: e.target.value})}
                      placeholder="Describe the mission, requirements, and stack..."
                      className="w-full h-32 bg-surface-container-low border-2 border-on-surface px-4 py-3 font-bold text-sm"
                    />
                  </div>

                  <div className="flex gap-6">
                    <button type="submit" className="liquid-btn flex-1 py-4 text-xl">EXECUTE_BROADCAST</button>
                    <button 
                      type="button" 
                      onClick={() => setIsAdding(false)}
                      className="bg-surface border-2 border-on-surface px-10 py-4 font-black uppercase italic text-sm shadow-brutal hover:bg-surface-container-low"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-8">
            {filteredOpps.length === 0 ? (
              <div className="p-20 text-center glass-panel border-4 border-dashed border-on-surface/10 opacity-50">
                <Target className="w-24 h-24 mx-auto mb-6 text-on-surface/20" />
                <p className="text-xl font-black uppercase italic tracking-widest text-on-surface/40">NO_DATA_POINTS_MATCH_YOUR_SCAN</p>
              </div>
            ) : (
              filteredOpps.map((opp, idx) => (
                <motion.div
                  key={opp.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-surface-container-lowest border-2 border-on-surface shadow-brutal relative overflow-hidden group hover:shadow-kinetic transition-all"
                >
                  <div className={cn("absolute top-0 left-0 w-2 h-full opacity-50 transition-opacity", opp.type === 'hiring' ? 'bg-primary' : opp.type === 'selling' ? 'bg-secondary' : opp.type === 'buying' ? 'bg-tertiary' : 'bg-accent')} />
                  
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="shrink-0 flex flex-col items-center gap-4">
                        <div className="w-20 h-20 border-2 border-on-surface shadow-brutal overflow-hidden cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate(`/feed/profile/${opp.userId}`)}>
                          <img 
                            src={opp.userPhoto || `https://ui-avatars.com/api/?name=${opp.userName}`} 
                            alt={opp.userName} 
                            className="w-full h-full object-cover grayscale" 
                          />
                        </div>
                        <span className={cn("text-[8px] font-black uppercase italic px-2 py-1 border-2 border-on-surface shadow-brutal", typeStyles[opp.type])}>
                          {opp.type}
                        </span>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-on-surface mb-2 group-hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/feed/profile/${opp.userId}`)}>
                              {opp.title}
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-on-surface-variant uppercase italic">
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {opp.userName}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(opp.createdAt?.toDate ? opp.createdAt.toDate() : new Date(), { addSuffix: true })}</span>
                            </div>
                          </div>
                          {opp.budget && (
                            <div className="bg-surface-container-low border-2 border-on-surface p-3 shadow-brutal flex items-center gap-3">
                              <DollarSign className="w-5 h-5 text-secondary" />
                              <span className="text-sm font-black uppercase italic tracking-tight">{opp.budget}</span>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-on-surface leading-relaxed max-w-3xl font-medium">
                          {opp.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-4">
                          <div className="flex flex-wrap gap-2">
                            {opp.tags.map(tag => (
                              <span key={tag} className="text-[10px] font-bold uppercase italic px-3 py-1 bg-surface-container-low border-2 border-on-surface/10 hover:border-on-surface hover:text-primary transition-all cursor-pointer">
                                #{tag}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex items-center gap-3 ml-auto">
                            {user?.uid === opp.userId ? (
                              <button 
                                onClick={() => handleDelete(opp.id)}
                                className="p-3 text-on-surface-variant hover:text-accent transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => navigate(`/feed/messages?chat=${opp.userId}`)}
                                className="liquid-btn-secondary px-6 py-2 flex items-center gap-2 text-[10px]"
                              >
                                <MessageSquare className="w-4 h-4" /> TRANSMIT_PITCH
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aesthetic Corner Element */}
                  <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
                     <div className="absolute top-4 right-4 w-12 h-[1px] bg-on-surface/5 rotate-45" />
                     <div className="absolute top-8 right-8 w-12 h-[1px] bg-on-surface/5 rotate-45" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
