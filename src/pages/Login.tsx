import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, Cpu, GraduationCap, Factory, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const SOLOCONNECT_FEATURES = [
  { id: 'network', name: 'SOCIAL NETWORK', icon: Users, color: 'text-on-surface', bg: 'bg-primary', description: 'Connect with solo founders worldwide.' },
  { id: 'match', name: 'FOUNDER MATCH', icon: Sparkles, color: 'text-on-surface', bg: 'bg-secondary', description: 'AI-powered matchmaking for collaborators.' },
  { id: 'groups', name: 'NICHE GROUPS', icon: Users, color: 'text-on-surface', bg: 'bg-tertiary', description: 'Join specialized communities for your industry.' },
  { id: 'events', name: 'LIVE EVENTS', icon: Sparkles, color: 'text-on-surface', bg: 'bg-primary', description: 'Weekly networking and masterclasses.' },
];

export function Login() {
  const navigate = useNavigate();
  const { user, loading, isAuthReady } = useAuth();
  const [error, setError] = useState('');

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-on-surface border-t-primary animate-spin shadow-brutal"></div>
      </div>
    );
  }

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      setError('FAILED TO SPAWN. TRY AGAIN, FOUNDER!');
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-primary selection:text-on-surface overflow-x-hidden relative">
      {/* Iridescent Background Container */}
      <div className="fixed inset-0 liquid-iridescent-bg pointer-events-none z-0" />
      
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(#2c2f31_1px,transparent_1px)] [background-size:40px_40px]"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Navigation / Logo */}
        <header className="flex items-center justify-between mb-24">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 liquid-gradient flex items-center justify-center rotate-3 shadow-brutal border-2 border-on-surface">
              <span className="text-on-surface font-black text-2xl leading-none">S</span>
            </div>
            <span className="text-3xl font-headline font-black tracking-tighter italic uppercase">SOLOCONNECT</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 italic">PROTOCOL_V.2026</span>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 xl:gap-24 items-start">
          {/* Hero Section */}
          <div className="lg:col-span-7 space-y-12 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-[10vw] lg:text-[7vw] xl:text-[6.5vw] font-headline font-black leading-[0.8] tracking-tighter uppercase italic text-on-surface mb-8">
                SCALE<br />
                <span className="relative inline-block">
                  SOLO
                  <div className="absolute -bottom-2 left-0 w-full h-4 liquid-gradient -z-10 opacity-60"></div>
                </span><br />
                <span className="text-primary drop-shadow-[4px_4px_0px_#2c2f31]">TOGETHER.</span>
              </h1>
              <p className="text-xl lg:text-2xl xl:text-3xl font-bold italic text-on-surface-variant max-w-xl lg:max-w-lg xl:max-w-2xl leading-tight uppercase tracking-tight">
                "THE_ONLY_NETWORK_BUILT_EXCLUSIVELY_FOR_THE_TOP_1%_OF_SOLO_FOUNDERS."
              </p>
            </motion.div>

            {/* Bento Grid Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12">
              {SOLOCONNECT_FEATURES.map((feature, i) => (
                <motion.div 
                  key={feature.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className={cn(
                    "p-8 border-2 border-outline/15 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-1 transition-all group relative overflow-hidden",
                    i === 0 ? "bg-surface-container-low md:col-span-2" : "bg-surface-container-lowest"
                  )}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className={cn("p-4 border-2 border-on-surface shadow-brutal transition-transform group-hover:rotate-12", feature.bg, feature.color)}>
                      <feature.icon className="w-8 h-8" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-on-surface-variant/20 group-hover:text-primary transition-colors" />
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-2xl font-headline font-black uppercase italic tracking-tighter text-on-surface mb-2">{feature.name}</h3>
                    <p className="text-on-surface-variant font-medium text-lg leading-snug">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Login Card Section */}
          <div className="lg:col-span-5 lg:sticky lg:top-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="bg-surface-container-lowest p-12 border-2 border-on-surface shadow-brutal-lg relative overflow-hidden rotate-1"
            >
              <div className="absolute top-0 left-0 w-full h-2 liquid-gradient"></div>
              
              <div className="space-y-10 relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] italic">ACCESS_PORTAL_ACTIVE</span>
                  </div>
                  <h2 className="text-5xl font-headline font-black text-on-surface uppercase italic leading-none tracking-tighter">
                    INITIATE<br />LINK.
                  </h2>
                  <p className="text-on-surface-variant font-bold italic uppercase tracking-tight">
                    "ESTABLISH_YOUR_PRESENCE_IN_THE_SOLO_ECOSYSTEM."
                  </p>
                </div>

                {error && (
                  <div className="bg-tertiary/10 text-on-surface p-6 border-2 border-tertiary font-black uppercase italic shadow-brutal animate-shake">
                    {error}
                  </div>
                )}

                <div className="space-y-6">
                  <button
                    onClick={handleGoogleLogin}
                    className="liquid-btn w-full flex items-center justify-center gap-6 py-6 text-xl group"
                  >
                    <svg className="w-8 h-8 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
                    </svg>
                    CONTINUE_WITH_GOOGLE
                  </button>
                  
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase italic text-on-surface-variant/40 tracking-widest">
                    <div className="flex-1 h-[1px] bg-outline/15"></div>
                    <span>SECURE_ENCRYPTION_ENABLED</span>
                    <div className="flex-1 h-[1px] bg-outline/15"></div>
                  </div>
                </div>

                <div className="pt-8 border-t-2 border-outline/15">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase italic tracking-widest text-on-surface-variant/60">
                    <span>© 2026 SOLOCONNECT</span>
                    <div className="flex gap-4">
                      <a href="/terms" className="hover:text-primary transition-colors">TERMS</a>
                      <a href="/privacy" className="hover:text-primary transition-colors">PRIVACY</a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Stats / Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-12 bg-on-surface text-surface p-6 border-2 border-on-surface shadow-brutal -rotate-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-headline font-black italic leading-none">100%</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">FOUNDER_FOCUSED</p>
                </div>
                <div className="w-[1px] h-10 bg-surface/20"></div>
                <div>
                  <p className="text-3xl font-headline font-black italic leading-none">AI</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">MATCHMAKING</p>
                </div>
                <div className="w-[1px] h-10 bg-surface/20"></div>
                <div className="text-right">
                  <p className="text-3xl font-headline font-black italic leading-none">LIVE</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">COMMUNITIES</p>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Footer Marquee */}
        <div className="mt-32 border-y-2 border-on-surface py-6 overflow-hidden relative">
          <div className="flex whitespace-nowrap animate-marquee">
            {[...Array(10)].map((_, i) => (
              <span key={i} className="text-4xl lg:text-6xl font-headline font-black uppercase italic tracking-tighter text-on-surface/10 mx-12">
                SCALE_SOLO_TOGETHER // CONNECT_WITH_THE_1% // BUILD_THE_FUTURE // 
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
