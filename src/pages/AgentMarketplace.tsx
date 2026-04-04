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
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-neon-pink p-10 border-[10px] border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] rotate-1">
        <div>
          <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic">Agent Marketplace</h1>
          <p className="text-black font-bold mt-2 text-xl bg-white/50 px-4 py-1 border-4 border-black inline-block">Share and discover SoloSuccess AI agent configurations.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-3 bg-neon-green text-black px-8 py-4 border-8 border-black font-black uppercase italic text-lg hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1"
        >
          <Plus className="w-6 h-6 stroke-[3px]" />
          Share Config
        </button>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="bg-white p-10 border-[10px] border-black shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] space-y-8"
        >
          <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter">Share your agent setup</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xl font-black text-black uppercase italic mb-3">Config Name</label>
              <input
                type="text"
                required
                value={newConfig.name}
                onChange={e => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white border-8 border-black p-5 font-bold text-xl focus:bg-neon-yellow/10 outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
              />
            </div>
            <div>
              <label className="block text-xl font-black text-black uppercase italic mb-3">Agent Type</label>
              <select
                value={newConfig.agentType}
                onChange={e => setNewConfig(prev => ({ ...prev, agentType: e.target.value }))}
                className="w-full bg-white border-8 border-black p-5 font-bold text-xl focus:bg-neon-blue/10 outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all appearance-none"
              >
                <option>Researcher</option>
                <option>Writer</option>
                <option>Analyst</option>
                <option>Strategist</option>
                <option>Developer</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xl font-black text-black uppercase italic mb-3">Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. SEO, Automation, SaaS"
                value={newConfig.tags}
                onChange={e => setNewConfig(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full bg-white border-8 border-black p-5 font-bold text-xl focus:bg-neon-pink/10 outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xl font-black text-black uppercase italic mb-3">Prompt/Description</label>
              <textarea
                required
                value={newConfig.description}
                onChange={e => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-white border-8 border-black p-5 font-bold text-xl min-h-[120px] focus:bg-neon-green/10 outline-none resize-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-6">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-8 py-4 bg-white border-4 border-black font-black uppercase italic text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neon-blue text-black px-10 py-4 border-8 border-black font-black uppercase italic text-xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all"
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
              "p-10 border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden",
              index % 2 === 0 ? "bg-white -rotate-1" : "bg-white rotate-1"
            )}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-white group-hover:bg-neon-pink transition-colors">
                  <Cpu className="w-8 h-8 stroke-[3px]" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-black uppercase italic tracking-tighter leading-none">{config.name}</h3>
                  <p className="text-sm text-black font-black uppercase italic tracking-widest bg-neon-yellow px-2 py-0.5 border-2 border-black mt-1 inline-block">{config.agentType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black text-neon-yellow px-3 py-1 border-2 border-black font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Star className="w-5 h-5 fill-current" />
                {config.rating}
              </div>
            </div>

            <p className="text-xl font-bold text-black/70 mb-8 line-clamp-3 leading-tight">
              {config.description}
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              {config.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-neon-blue/20 border-2 border-black text-black text-xs font-black uppercase italic tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t-4 border-black gap-6">
              <div className="flex items-center gap-3 bg-white border-2 border-black px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <img
                  src={config.creatorPhoto || `https://ui-avatars.com/api/?name=${config.creatorName}&background=random`}
                  alt={config.creatorName}
                  className="w-8 h-8 border-2 border-black"
                  referrerPolicy="no-referrer"
                />
                <span className="text-sm text-black font-black uppercase italic">{config.creatorName}</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center text-black hover:bg-neon-pink hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                  <Heart className="w-6 h-6 stroke-[3px]" />
                </button>
                <button className="w-12 h-12 bg-white border-4 border-black flex items-center justify-center text-black hover:bg-neon-blue hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">
                  <MessageSquare className="w-6 h-6 stroke-[3px]" />
                </button>
                <button className="bg-neon-green text-black px-6 py-3 border-4 border-black font-black uppercase italic text-lg flex items-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
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
