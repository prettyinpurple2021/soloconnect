import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import { Zap, Sparkles, Users, Activity, Globe, ArrowRight, Shield, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export function Landing() {
  const features = [
    {
      icon: Sparkles,
      title: "FOUNDER_DNA_MATCH",
      description: "Our kinetic algorithm syncs you with partners whose execution speed matches your own.",
      color: "bg-primary"
    },
    {
      icon: Users,
      title: "SQUAD_HUBS",
      description: "Mission-driven micro-communities. no noise. just building. shared vaults and trackers.",
      color: "bg-secondary"
    },
    {
      icon: Activity,
      title: "MOMENTUM_WAVE",
      description: "Visualize your building pace. proving your path through execution, not just talk.",
      color: "bg-tertiary"
    }
  ];

  const stats = [
    { label: "FOUNDERS_SYNCED", value: "1.2K+" },
    { label: "SQUAD_MISSIONS", value: "450+" },
    { label: "DATA_STREAMS", value: "24/7" },
  ];

  return (
    <div className="min-h-screen bg-surface-container-lowest selection:bg-primary selection:text-on-surface overflow-hidden">
      {/* Noise Overlay */}
      <div className="noise-overlay fixed inset-0 pointer-events-none opacity-5 z-50" />
      
      {/* Fluid Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[120px] rounded-full animate-liquid opacity-30" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-secondary/20 blur-[120px] rounded-full animate-liquid opacity-30" />
      </div>

      {/* Header */}
      <nav className="fixed top-0 left-0 w-full z-40 p-6 sm:p-10 flex items-center justify-between backdrop-blur-xl border-b-2 border-on-surface/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 liquid-gradient border-2 border-on-surface shadow-brutal rotate-3 flex items-center justify-center">
            <Zap className="w-6 h-6 text-on-surface fill-current" />
          </div>
          <span className="text-2xl font-headline font-black uppercase italic tracking-tighter text-on-surface">SOLOCONNECT</span>
        </div>
        <div className="hidden sm:flex items-center gap-8 text-[10px] font-black uppercase italic tracking-widest">
           <a href="#vision" className="hover:text-primary transition-colors">THE_VISION</a>
           <a href="#architecture" className="hover:text-secondary transition-colors">THE_ARCH</a>
           <Link to="/login" className="bg-on-surface text-surface px-6 py-2 shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
             ACCESS_CORE
           </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 sm:px-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block bg-accent text-on-accent border-2 border-on-surface px-4 py-1 text-[10px] font-black uppercase italic tracking-widest shadow-brutal-primary mb-8 rotate-[-1deg]">
              SYSTEM_PROTOCOL_V4.2_ONLINE
            </div>
            <h1 className="text-7xl sm:text-9xl font-headline font-black text-on-surface leading-[0.85] uppercase italic tracking-[-0.05em] mb-12">
              BUILDING_IS_<br />
              <span className="text-transparent bg-clip-text liquid-gradient">SOLO.</span><br />
              NOT_ALONE.
            </h1>
            <p className="text-xl sm:text-2xl text-on-surface-variant font-bold italic leading-relaxed max-w-xl mb-12">
              The hyper-kinetic social protocol for solo-founders and high-signal builders. Sync with squads, track momentum, and deploy missions.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <Link to="/login" className="liquid-btn text-center text-xl py-6 px-10 flex items-center justify-center gap-4 group">
                INFILTRATE_NOW <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link to="/login" className="text-[10px] font-black uppercase italic tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2">
                 EXISTING_NODE? ACCESS_CORE
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {/* Aesthetic Mockup Placeholder */}
            <div className="relative z-10 bg-surface border-4 border-on-surface shadow-brutal-lg p-4 rotate-2">
              <div className="w-full h-8 flex items-center gap-2 border-b-2 border-on-surface px-4 mb-4">
                 <div className="w-2 h-2 rounded-full bg-red-400" />
                 <div className="w-2 h-2 rounded-full bg-yellow-400" />
                 <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
              <div className="aspect-[4/5] bg-on-surface relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-secondary/40 animate-liquid" />
                 <div className="p-8 relative">
                    <div className="w-full h-4 bg-surface/20 rounded mb-4" />
                    <div className="w-[80%] h-4 bg-surface/20 rounded mb-12" />
                    <div className="grid grid-cols-2 gap-4">
                       <div className="h-32 bg-surface/10 border-2 border-surface/20 rounded" />
                       <div className="h-32 bg-surface/10 border-2 border-surface/20 rounded" />
                    </div>
                    <div className="mt-8 p-4 border-2 border-primary/40 bg-surface/5 backdrop-blur-md">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary/20" />
                          <div className="space-y-1">
                             <div className="w-24 h-2 bg-primary/40 rounded" />
                             <div className="w-16 h-2 bg-primary/20 rounded" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
            {/* Decor squares */}
            <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-accent/20 border-2 border-on-surface -z-10 rotate-12" />
            <div className="absolute bottom-[-20px] right-[-20px] w-32 h-32 bg-tertiary/20 border-2 border-on-surface -z-10 -rotate-12" />
          </motion.div>
        </div>
      </section>

      {/* Stats Ticker */}
      <section className="bg-on-surface py-12 relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex flex-wrap justify-between items-center gap-12">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-5xl font-headline font-black text-surface italic tracking-tighter uppercase mb-1">{stat.value}</p>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest italic">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 sm:px-10 max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-5xl sm:text-7xl font-headline font-black text-on-surface uppercase italic tracking-tighter mb-4 translate-x-[-20px]">
            SYSTEM_CAPABILITIES
          </h2>
          <div className="h-1 w-40 liquid-gradient mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10, rotate: 1 }}
              className="glass-panel border-2 border-on-surface p-10 shadow-brutal group relative h-full"
            >
              <div className={cn("inline-flex w-16 h-16 items-center justify-center border-2 border-on-surface mb-8 shadow-brutal rotate-3 group-hover:rotate-12 transition-transform", feature.color)}>
                <feature.icon className="w-8 h-8 text-on-surface" />
              </div>
              <h3 className="text-2xl font-headline font-black text-on-surface uppercase italic tracking-tight mb-4">{feature.title}</h3>
              <p className="text-lg text-on-surface-variant font-bold italic leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="py-32 bg-on-surface text-surface relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none opacity-[0.03]">
          <h2 className="text-[30rem] font-headline font-black italic select-none">BUILD</h2>
        </div>
        <div className="max-w-4xl mx-auto px-6 sm:px-10 text-center relative z-10">
          <div className="inline-flex w-20 h-20 items-center justify-center bg-tertiary border-2 border-surface shadow-brutal-primary mb-12 rotate-[-12deg]">
            <Shield className="w-10 h-10 text-on-surface" />
          </div>
          <h2 className="text-5xl sm:text-7xl font-headline font-black uppercase italic tracking-tighter mb-12">
            THE_NEO_BRUTALIST_ETHOS
          </h2>
          <p className="text-2xl font-bold italic leading-relaxed text-surface/80">
            Social networking is broken. It's built for consumption, not creation. SoloConnect is the response. 
            We strip away the noise and focus on the atoms of building: missions, squads, and momentum. 
            It's not about the profile, it's about the transmission.
          </p>
          <div className="mt-20">
            <Link to="/login" className="bg-primary text-on-surface text-2xl font-black uppercase italic px-12 py-6 border-2 border-surface shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all inline-block">
              JOIN_THE_MANIFESTO
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-20 px-6 sm:px-10 border-t-2 border-on-surface/10 bg-surface">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-8 h-8 text-primary fill-current" />
              <span className="text-3xl font-headline font-black uppercase italic tracking-tighter">SOLOCONNECT</span>
            </div>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest italic tracking-tighter">
              &copy; 2026_PROTOCOL_X. ALL_RIGHTS_RESERVED.
            </p>
          </div>
          <div className="flex flex-wrap gap-8 text-[10px] font-black uppercase italic tracking-widest">
            <Link to="/terms" className="hover:text-primary transition-colors">TERMS_OF_SERVICE</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">PRIVACY_PROTOCOL</Link>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">TWITTER_TRANSMISSION</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
