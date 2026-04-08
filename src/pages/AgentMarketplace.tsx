import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Cpu, Star, Plus, ExternalLink, MessageSquare, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  agentType: string;
  creatorName: string;
  creatorPhoto: string;
  rating: number;
  reviews: number;
  tags: string[];
  createdAt: any;
}

export function AgentMarketplace() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newConfig, setNewConfig] = useState({ name: '', description: '', agentType: 'Researcher', tags: '' });

  useEffect(() => {
    const q = query(collection(db, 'agent_configs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const configsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AgentConfig[];
      setConfigs(configsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'agent_configs');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'agent_configs'), {
        ...newConfig,
        tags: newConfig.tags.split(',').map(t => t.trim()),
        creatorName: user.displayName,
        creatorPhoto: user.photoURL,
        rating: 5,
        reviews: 0,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewConfig({ name: '', description: '', agentType: 'Researcher', tags: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'agent_configs');
    }
  };

  return (
    <div className="space-y-12 font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-secondary p-10 border-[10px] border-on-surface shadow-kinetic rotate-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 -rotate-45 translate-x-12 -translate-y-12"></div>
        <div className="relative z-10">
          <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic drop-shadow-[4px_4px_0px_#00ffff]">Agent Marketplace</h1>
          <p className="text-black font-bold mt-2 text-xl bg-white/50 px-4 py-1 border-4 border-black inline-block italic">"Share and discover SoloSuccess AI agent configurations."</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-3 bg-accent text-black px-8 py-4 border-8 border-on-surface font-black uppercase italic text-lg hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all shadow-kinetic-active active:translate-x-1 active:translate-y-1 relative z-10"
        >
          <Plus className="w-6 h-6 stroke-[3px]" />
          Share Config
        </button>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="bg-surface-bg p-10 border-[10px] border-on-surface shadow-kinetic space-y-8"
        >
          <h2 className="text-4xl font-black text-on-surface uppercase italic tracking-tighter drop-shadow-[4px_4px_0px_#ff00ff]">Share your agent setup</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xl font-black text-on-surface uppercase italic mb-3 tracking-tight">Config Name</label>
              <input
                type="text"
                required
                value={newConfig.name}
                onChange={e => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-surface-bg border-8 border-on-surface p-5 font-black text-xl focus:bg-primary/10 outline-none shadow-kinetic-thud focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all uppercase italic tracking-widest placeholder:text-on-surface/30"
              />
            </div>
            <div>
              <label className="block text-xl font-black text-on-surface uppercase italic mb-3 tracking-tight">Agent Type</label>
              <select
                value={newConfig.agentType}
                onChange={e => setNewConfig(prev => ({ ...prev, agentType: e.target.value }))}
                className="w-full bg-surface-bg border-8 border-on-surface p-5 font-black text-xl focus:bg-accent/10 outline-none shadow-kinetic-thud focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all appearance-none uppercase italic tracking-widest"
              >
                <option>Researcher</option>
                <option>Writer</option>
                <option>Analyst</option>
                <option>Strategist</option>
                <option>Developer</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xl font-black text-on-surface uppercase italic mb-3 tracking-tight">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="E.G. SEO, AUTOMATION, SAAS"
                value={newConfig.tags}
                onChange={e => setNewConfig(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full bg-surface-bg border-8 border-on-surface p-5 font-black text-xl focus:bg-secondary/10 outline-none shadow-kinetic-thud focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all uppercase italic tracking-widest placeholder:text-on-surface/30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xl font-black text-on-surface uppercase italic mb-3 tracking-tight">Prompt/Description</label>
              <textarea
                required
                value={newConfig.description}
                onChange={e => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-surface-bg border-8 border-on-surface p-5 font-black text-xl min-h-[120px] focus:bg-primary/10 outline-none resize-none shadow-kinetic-thud focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all uppercase italic tracking-widest placeholder:text-on-surface/30"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-6">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-8 py-4 bg-surface-bg border-4 border-on-surface font-black uppercase italic text-lg shadow-kinetic-thud hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary text-black px-10 py-4 border-8 border-on-surface font-black uppercase italic text-xl shadow-kinetic-active hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all"
              >
                Publish Config
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {configs.map((config, index) => (
          <motion.div
            key={config.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "p-10 border-8 border-on-surface shadow-kinetic transition-all group relative overflow-hidden",
              index % 2 === 0 ? "bg-surface-bg -rotate-1" : "bg-surface-bg rotate-1"
            )}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-on-surface border-4 border-on-surface shadow-kinetic-thud flex items-center justify-center text-surface-bg group-hover:bg-secondary transition-colors">
                  <Cpu className="w-8 h-8 stroke-[3px]" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-on-surface uppercase italic tracking-tighter leading-none drop-shadow-[2px_2px_0px_#00ffff]">{config.name}</h3>
                  <p className="text-sm text-black font-black uppercase italic tracking-widest bg-accent px-2 py-0.5 border-2 border-on-surface mt-1 inline-block">{config.agentType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-on-surface text-accent px-3 py-1 border-2 border-on-surface font-black text-lg shadow-kinetic-thud">
                <Star className="w-5 h-5 fill-current" />
                {config.rating}
              </div>
            </div>

            <p className="text-xl font-bold text-on-surface/70 mb-8 line-clamp-3 leading-tight italic">
              "{config.description}"
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              {config.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-primary/20 border-2 border-on-surface text-on-surface text-xs font-black uppercase italic tracking-wider shadow-kinetic-thud">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t-4 border-on-surface gap-6">
              <div className="flex items-center gap-3 bg-surface-bg border-2 border-on-surface px-3 py-1 shadow-kinetic-thud">
                <img
                  src={config.creatorPhoto || `https://ui-avatars.com/api/?name=${config.creatorName}&background=random`}
                  alt={config.creatorName}
                  className="w-8 h-8 border-2 border-on-surface"
                  referrerPolicy="no-referrer"
                />
                <span className="text-sm text-on-surface font-black uppercase italic">{config.creatorName}</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="w-12 h-12 bg-surface-bg border-4 border-on-surface flex items-center justify-center text-on-surface hover:bg-secondary hover:text-black transition-all shadow-kinetic-thud hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                  <Heart className="w-6 h-6 stroke-[3px]" />
                </button>
                <button className="w-12 h-12 bg-surface-bg border-4 border-on-surface flex items-center justify-center text-on-surface hover:bg-primary hover:text-black transition-all shadow-kinetic-thud hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                  <MessageSquare className="w-6 h-6 stroke-[3px]" />
                </button>
                <button className="bg-accent text-black px-6 py-3 border-4 border-on-surface font-black uppercase italic text-lg flex items-center gap-2 shadow-kinetic-thud hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                  <ExternalLink className="w-5 h-5 stroke-[3px]" />
                  Import
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
