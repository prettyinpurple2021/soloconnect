import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import { Zap, Sparkles, Users, Activity, Globe, ArrowRight, Shield, Target, Cpu, Terminal, Share2, Search, Database, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

const GridBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
      <div className="absolute inset-0 bg-[#000]" />
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,172,228,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,172,228,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <motion.div 
        animate={{ 
          y: ['0%', '100%'],
          opacity: [0, 1, 0]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute top-0 left-0 w-full h-[200px] bg-gradient-to-b from-transparent via-primary/20 to-transparent z-10"
      />
      <div className="absolute inset-0 bg-gradient-radial from-transparent to-black pointer-events-none" />
    </div>
  );
};

const SystemStatus = () => {
  const [nodes, setNodes] = useState(0);
  const [uptime, setUptime] = useState(99.999);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(Math.floor(Math.random() * 50) + 900);
      setUptime(99.99 + Math.random() * 0.009);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 border-2 border-on-surface bg-on-surface text-surface shadow-brutal-lg rotate-1 font-mono text-[10px] space-y-4">
      <div className="flex justify-between items-center border-b border-surface/20 pb-2">
        <span className="flex items-center gap-2 text-primary">
          <Activity className="w-3 h-3" /> CORE_SYSTEM_STATUS
        </span>
        <span className="opacity-50">v4.2.0-STABLE</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="opacity-50 uppercase text-[8px]">Active_Nodes</p>
          <p className="text-xl font-black">{nodes}</p>
        </div>
        <div className="space-y-1">
          <p className="opacity-50 uppercase text-[8px]">Network_Latency</p>
          <p className="text-xl font-black">12ms</p>
        </div>
      </div>

      <div className="h-1 w-full bg-surface/10 overflow-hidden relative">
        <motion.div 
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 w-1/3 bg-secondary"
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center opacity-70">
          <span>IDENTITY_PULSE</span>
          <span className="text-primary">ENCRYPTED</span>
        </div>
        <div className="flex justify-between items-center opacity-70">
          <span>MISSION_RELIABILITY</span>
          <span className="text-secondary">{uptime.toFixed(3)}%</span>
        </div>
      </div>
      
      <div className="pt-2 border-t border-surface/20 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[8px] opacity-70">REALTIME_EXECUTION_STREAM_ACTIVE</span>
      </div>
    </div>
  );
};

export function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] selection:bg-primary selection:text-[#050505] text-[#FAFAFA] relative overflow-x-hidden">
      <GridBackground />
      <div className="noise-overlay" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-[100] p-6 lg:p-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-4 pointer-events-auto group cursor-crosshair">
          <div className="w-10 h-10 border-2 border-primary bg-primary/10 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-12">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <span className="text-2xl font-headline font-black uppercase italic tracking-tighter mix-blend-difference">SoloConnect</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-12 text-[10px] font-black uppercase italic tracking-[0.2em] pointer-events-auto">
          <a href="#vision" className="hover:text-primary transition-colors">Vision</a>
          <a href="#features" className="hover:text-secondary transition-colors">Protocol</a>
          <Link to="/login" className="px-8 py-3 bg-primary text-black shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
            Unlock_Core
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 lg:pt-0 min-h-screen flex flex-col justify-center px-6 lg:px-20 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-8 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-3 px-3 py-1 bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-mono mb-8 uppercase tracking-widest">
                <Terminal className="w-3 h-3" /> Initializing_Social_Protocol_v4
              </div>
              
              <h1 
                className="text-7xl md:text-[clamp(4rem,10vw,12rem)] font-headline font-black leading-[0.82] uppercase italic tracking-tighter"
                style={{ wordBreak: 'break-word' }}
              >
                <motion.span 
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="block relative glitch-effect"
                  data-text="Building."
                >
                  Building.
                </motion.span>
                <motion.span 
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary glitch-effect"
                  data-text="Unfiltered."
                >
                  Unfiltered.
                </motion.span>
                <motion.span 
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="block relative"
                >
                  Unstoppable.
                </motion.span>
              </h1>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col md:flex-row gap-10 items-start md:items-center"
            >
              <p className="max-w-md text-xl lg:text-2xl font-bold italic text-white/60 border-l-4 border-primary pl-8">
                The hyper-kinetic social protocol engineered for elite solo-founders. No noise. Just execution.
              </p>
              
              <div className="flex gap-4">
                <Link to="/login" className="p-8 bg-white text-black group relative overflow-hidden flex items-center gap-4 transition-all hover:bg-primary hover:text-black">
                  <span className="text-2xl font-headline font-black uppercase italic relative z-10 transition-transform group-hover:scale-95">GO_PRO</span>
                  <ArrowRight className="w-8 h-8 relative z-10 transform group-hover:translate-x-4 transition-all" />
                  <div className="absolute inset-0 bg-primary translate-x-[-101%] group-hover:translate-x-0 transition-transform duration-300" />
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-4 lg:block hidden">
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="relative"
            >
              <SystemStatus />
              
              {/* Decorative Tech Elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 border-2 border-dashed border-secondary/20 rounded-full animate-spin-slow" />
              <div className="absolute -bottom-20 -left-10 text-[180px] font-black text-white/5 pointer-events-none select-none z-[-1]">
                CORE
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Marquee Section */}
      <div className="py-20 border-y-2 border-white/10 overflow-hidden bg-[#0a0a0a] relative z-10">
        <div className="flex animate-marquee whitespace-nowrap gap-20">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-20 items-center text-4xl lg:text-6xl font-headline font-black italic uppercase tracking-tighter opacity-20">
              <span>Mission_First</span>
              <Cpu className="w-12 h-12 text-primary" />
              <span>Zero_Noise</span>
              <Zap className="w-12 h-12 text-secondary" />
              <span>High_Execution</span>
              <Activity className="w-12 h-12 text-tertiary" />
            </div>
          ))}
        </div>
      </div>

      {/* Features - Protocol Specs */}
      <section id="features" className="relative z-10 py-40 px-6 lg:px-20 max-w-[1800px] mx-auto bg-black">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div className="space-y-12">
            <h2 className="text-6xl lg:text-8xl font-headline font-black leading-tight uppercase italic tracking-tighter">
              PROTOCOL_<br/>ARCHITECTURE
            </h2>
            <p className="text-xl lg:text-2xl font-bold italic text-white/60">
              Stripped of consumer-grade fillers. SoloConnect implements a low-latency, mission-centric architectural layer for builders who don't have time for social fluff.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: Database, label: "SHARED_VAULTS", desc: "Decentralized knowledge hubs for your squad." },
              { icon: Lock, label: "ENCRYPTED_COMMS", desc: "Military-grade end-to-end mission briefing." },
              { icon: Share2, label: "DYNAMO_SYNC", desc: "Proprietary algorithm matching builder speed." },
              { icon: Search, label: "NODE_DISCOVERY", desc: "Zero-noise search across the founder sphere." },
            ].map((spec, i) => (
              <div key={i} className="p-10 border-2 border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all group flex flex-col justify-between h-80">
                <spec.icon className="w-12 h-12 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="space-y-4">
                  <h3 className="text-2xl font-headline font-black italic">{spec.label}</h3>
                  <p className="text-sm font-bold text-white/40">{spec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core manifesto */}
      <section id="vision" className="relative z-10 min-h-screen flex items-center justify-center bg-primary text-black px-6">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#050505] to-transparent z-0" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-20">
          <div className="inline-block p-10 border-4 border-black bg-white shadow-brutal-lg rotate-3 mb-10">
             <Shield className="w-20 h-20 text-black mx-auto" />
          </div>
          
          <h2 className="text-6xl md:text-9xl font-headline font-black leading-[0.82] uppercase italic tracking-tighter">
            Manifesto of the<br/>Execution_Class
          </h2>
          
          <p className="text-2xl md:text-4xl font-headline font-black leading-tight italic tracking-tight">
            "We build in silence while the crowd screams. SoloConnect is the transmission tower for the builders who reject the vanity mirror of social media."
          </p>
          
          <div className="pt-10">
            <Link to="/login" className="px-16 py-8 bg-black text-white text-2xl font-headline font-black uppercase italic shadow-brutal hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all">
              Join_the_Protocol
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 p-10 lg:p-20 border-t-2 border-white/5 font-mono text-[10px] bg-black">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-20">
          <div className="space-y-6 max-w-sm">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-primary" />
              <span className="text-3xl font-headline font-black italic">SoloConnect</span>
            </div>
            <p className="opacity-50 font-bold leading-relaxed">
              OPERATING_SYSTEM_FOR_THE_NEW_ECONOMY. 
              DESIGNED_BY_FOUNDERS_FOR_FOUNDERS.
              NO_ALGORITHMS. NO_ADS. NO_LIES.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-20">
            <div className="space-y-4">
              <p className="opacity-30 uppercase tracking-[0.2em]">Network</p>
              <ul className="space-y-2 font-bold uppercase transition-all">
                <li><a href="#" className="hover:text-primary transition-colors">Manifesto</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Architecture</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Protocol_Docs</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="opacity-30 uppercase tracking-[0.2em]">Social</p>
              <ul className="space-y-2 font-bold uppercase">
                <li><a href="#" className="hover:text-secondary transition-colors">Transmission_X</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">Discord_Server</a></li>
                <li><a href="#" className="hover:text-secondary transition-colors">GitHub_Logs</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-40 pt-10 border-t border-white/5 flex justify-between items-center opacity-30 font-bold uppercase tracking-widest">
           <span>© 2026_SOLOCONNECT_CORE</span>
           <span>EST_LOCAL_SYSTEM: 40.7128° N, 74.0060° W</span>
        </div>
      </footer>
    </div>
  );
}
