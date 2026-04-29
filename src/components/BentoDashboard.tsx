import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Zap, Trophy, Star, Users, Calendar, Sparkles, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { Link } from 'react-router';

interface BentoDashboardProps {
  pulseInsight: string;
  stats: {
    activeNodes: number;
    milestones: number;
    collabs: number;
    velocity: string;
    chartData: { name: string; value: number }[];
    topFounder?: {
      name: string;
      photo: string;
      level: number;
      label: string;
    }
  };
}

export function BentoDashboard({ pulseInsight, stats }: BentoDashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 font-sans">
      
      {/* 1. Main Pulse Monitor (Large) */}
      <div className="md:col-span-4 lg:col-span-4 glass-panel border-2 border-on-surface p-8 shadow-brutal relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 liquid-gradient" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-3xl font-headline font-black uppercase italic tracking-tighter text-on-surface flex items-center gap-3">
              PULSE_MONITOR <Activity className="w-8 h-8 text-primary animate-pulse" />
            </h3>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-1 italic">SYSTEM_VELOCITY_{stats.velocity}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-4xl font-headline font-black text-on-surface tracking-tighter">{stats.velocity}</span>
              <p className="text-[8px] font-black text-primary uppercase tracking-widest">MOMENTUM_MAX</p>
            </div>
            <div className="bg-primary border-2 border-on-surface p-2 shadow-brutal -rotate-3">
              <TrendingUp className="w-6 h-6 text-on-surface" />
            </div>
          </div>
        </div>
        
        <div className="h-48 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface)', 
                  border: '2px solid var(--color-on-surface)', 
                  borderRadius: '1px',
                  fontFamily: 'monospace',
                  fontWeight: '900',
                  textTransform: 'uppercase'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="var(--color-primary)" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. AI Insight (Small) */}
      <div className="md:col-span-2 lg:col-span-2 bg-on-surface p-8 shadow-brutal border-2 border-on-surface flex flex-col justify-between relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
          <Sparkles className="w-32 h-32 text-surface" />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 bg-primary animate-ping" />
            <span className="text-[10px] font-black text-surface/60 uppercase tracking-widest italic">AI_ECHO_LIVE</span>
          </div>
          <p className="text-xl font-black text-surface italic leading-tight tracking-tight">
            "{pulseInsight}"
          </p>
        </div>
        <div className="mt-8 flex items-center justify-between border-t-2 border-surface/10 pt-4">
          <span className="text-[10px] font-black text-surface/40 uppercase italic tracking-widest">SENTIENCE_LVL_3</span>
          <ArrowUpRight className="w-6 h-6 text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
      </div>

      {/* 3. Stats Trio (Horizontal / Medium) */}
      <div className="md:col-span-4 lg:col-span-3 grid grid-cols-3 gap-6">
        {[
          { icon: Users, label: 'NODES_UP', val: stats.activeNodes.toString().padStart(2, '0'), color: 'text-primary' },
          { icon: Zap, label: 'MILESTONES', val: stats.milestones.toString().padStart(2, '0'), color: 'text-secondary' },
          { icon: Trophy, label: 'COLLABS', val: stats.collabs.toString().padStart(2, '0'), color: 'text-tertiary' }
        ].map((item, i) => (
          <div key={i} className="glass-panel border-2 border-on-surface p-4 shadow-brutal flex flex-col items-center justify-center gap-2 group hover:-translate-y-1 transition-all">
            <item.icon className={cn("w-6 h-6 mb-1", item.color)} />
            <span className="text-2xl font-headline font-black text-on-surface tracking-tighter leading-none">{item.val}</span>
            <span className="text-[8px] font-black text-on-surface-variant uppercase italic tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>

      {/* 4. Top Founder spotlight (Medium) */}
      <div className="md:col-span-2 lg:col-span-3 glass-panel border-2 border-on-surface p-6 shadow-brutal overflow-hidden relative group">
         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-150 transition-all duration-1000">
            <Star className="w-24 h-24 text-on-surface" />
         </div>
         <div className="flex items-center gap-6 relative z-10">
            <div className="w-20 h-20 border-2 border-on-surface shadow-brutal overflow-hidden bg-surface-container-low shrink-0 group-hover:rotate-6 transition-transform">
              <img src={stats.topFounder?.photo || "https://picsum.photos/seed/neo/200/200"} alt="Top Founder" className="w-full h-full object-cover grayscale" />
            </div>
            <div className="flex-1 min-w-0">
               <span className="text-[8px] font-black text-primary uppercase tracking-widest italic mb-1 block">NODE_ALPHA_DETECTED</span>
               <h4 className="text-2xl font-headline font-black uppercase italic tracking-tighter text-on-surface truncate">@{stats.topFounder?.name || 'INITIALIZING'}</h4>
               <div className="flex items-center gap-2 mt-2">
                 <span className="bg-on-surface text-surface text-[8px] px-2 py-0.5 font-black uppercase italic tracking-widest">LVL {stats.topFounder?.level || 0}</span>
                 <span className="text-[8px] font-black text-on-surface-variant uppercase italic tracking-widest">{stats.topFounder?.label || 'COMMUNITY_PIONEER'}</span>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
}
