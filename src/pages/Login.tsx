import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, Cpu, GraduationCap, Factory, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

const ECOSYSTEM_APPS = [
  { id: 'connect', name: 'SOLOCONNECT', icon: Users, color: 'text-black', bg: 'bg-[#00FF00]', description: 'The social network for soloists.' },
  { id: 'scribe', name: 'SOLOSCRIBE', icon: FileText, color: 'text-black', bg: 'bg-[#FF00FF]', description: 'AI-powered ideation & docs.' },
  { id: 'ai', name: 'SOLOSUCCESS AI', icon: Cpu, color: 'text-black', bg: 'bg-[#00FFFF]', description: 'Your team of 10 expert agents.' },
  { id: 'academy', name: 'SOLO ACADEMY', icon: GraduationCap, color: 'text-black', bg: 'bg-[#FFFF00]', description: 'The business school for soloists.' },
  { id: 'factory', name: 'CONTENT FACTORY', icon: Factory, color: 'text-black', bg: 'bg-[#FF6B00]', description: 'Automated content marketing.' },
];

export function Login() {
  const navigate = useNavigate();
  const { user, loading, isAuthReady } = useAuth();
  const [error, setError] = useState('');

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FF00FF]">
        <div className="w-16 h-16 border-8 border-black border-t-white rounded-full animate-spin shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"></div>
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
      setError('FAILED TO SPAWN. TRY AGAIN, TROLL!');
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-mono">
      {/* Left side - Branding */}
      <div className="hidden lg:flex w-1/2 bg-[#00FF00] text-black p-12 flex-col justify-between relative overflow-hidden border-r-8 border-black">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF00FF] rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-14 h-14 bg-black rounded-none flex items-center justify-center rotate-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <span className="text-[#00FF00] font-black text-3xl leading-none">S</span>
            </div>
            <span className="text-4xl font-black tracking-tighter italic uppercase">SOLOCONNECT</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-7xl font-black leading-[0.9] tracking-tighter mb-12 uppercase italic">
              THE ULTIMATE<br />
              <span className="bg-black text-[#00FF00] px-4 py-2 inline-block -rotate-2 mt-4">ECOSYSTEM</span><br />
              FOR SOLO FOUNDERS.
            </h1>
            
            <div className="grid grid-cols-1 gap-6 mb-12">
              {ECOSYSTEM_APPS.map((app, i) => (
                <motion.div 
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  className="flex items-center gap-4 p-5 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  <div className={cn("p-3 border-2 border-black", app.bg, app.color)}>
                    <app.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-black text-lg uppercase italic">{app.name}</p>
                    <p className="text-sm font-bold text-black/60">{app.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col gap-4 text-lg font-black uppercase italic">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-black flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-[#00FF00]" />
                </div>
                <span>100% FREE FOR SOLOISTS</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-black flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-[#00FF00]" />
                </div>
                <span>AI-POWERED PRODUCTIVITY</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-sm font-black uppercase italic">
          © {new Date().getFullYear()} SOLOSUCCESS ECOSYSTEM // V.2026
        </div>
      </div>

      {/* Right side - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#FFFF00]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center gap-4 mb-12 justify-center">
            <div className="w-16 h-16 bg-black rounded-none flex items-center justify-center rotate-6 shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
              <span className="text-[#00FF00] font-black text-4xl leading-none">S</span>
            </div>
            <span className="text-4xl font-black tracking-tighter italic uppercase">SOLOCONNECT</span>
          </div>

          <div className="bg-white p-10 border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 text-black mb-8">
              <Sparkles className="w-8 h-8 text-[#FF00FF]" />
              <span className="text-xl font-black uppercase italic tracking-tighter">ENTER THE CAVE</span>
            </div>
            <h2 className="text-5xl font-black text-black mb-4 uppercase italic leading-none tracking-tighter">WELCOME BACK, SOLOIST</h2>
            <p className="text-black font-bold mb-10 text-lg">SIGN IN TO ACCESS YOUR ENTIRE SOLO EMPIRE.</p>

            {error && (
              <div className="bg-[#FF0000] text-white p-5 border-4 border-black font-black uppercase italic mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-4 bg-[#00FFFF] border-4 border-black text-black px-6 py-5 font-black text-xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
            >
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" />
              </svg>
              CONTINUE WITH GOOGLE
            </button>

            <div className="mt-12 text-center text-sm font-bold uppercase italic text-black/60">
              BY CONTINUING, YOU AGREE TO OUR CHAOTIC TERMS AND PRIVACY VOID.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
