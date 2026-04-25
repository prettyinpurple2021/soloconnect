import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Activity, Sparkles, MessageSquare, Briefcase, Zap, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'SYSTEM_BOOT: SUCCESS.',
    subtitle: 'Welcome to SoloConnect, the exclusive network for top-tier solo founders.',
    icon: Zap,
    color: 'text-primary',
    bg: 'bg-primary'
  },
  {
    id: 'feed',
    title: 'THE_FEED',
    subtitle: 'Broadcast your updates and intercept signals from other founders. Your primary hub for network activity.',
    icon: Activity,
    color: 'text-secondary',
    bg: 'bg-secondary'
  },
  {
    id: 'match',
    title: 'FOUNDER_MATCH',
    subtitle: 'Utilize our AI logic engines to find your exact complementary skillset in the void. Perfect for finding co-conspirators.',
    icon: Sparkles,
    color: 'text-tertiary',
    bg: 'bg-tertiary'
  },
  {
    id: 'messages',
    title: 'SECURE_COMMS',
    subtitle: 'Direct encrypted echoing. Connect intimately, share resources, and plot your next move in private.',
    icon: MessageSquare,
    color: 'text-primary',
    bg: 'bg-primary'
  },
  {
    id: 'stash',
    title: 'YOUR_STASH',
    subtitle: 'Your founder portfolio. Log your momentum, define your capabilities, and establish your dominance.',
    icon: Briefcase,
    color: 'text-secondary',
    bg: 'bg-secondary'
  }
];

export function OnboardingTour() {
  const { user, userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // If there's no user, or profile is missing, or they've already dismissed it, don't show.
  if (!user || !userProfile || userProfile.onboardingDismissed) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setIsFinishing(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        onboardingDismissed: true
      });
      toast.success('BOOT_SEQUENCE_COMPLETE.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      setIsFinishing(false);
    }
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      
      <motion.div 
        key={step.id}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.1, y: -20 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="w-full max-w-2xl bg-surface-container-lowest border-2 border-on-surface shadow-brutal-lg relative z-10 overflow-hidden"
      >
        {/* Top Glitch Bar */}
        <div className="absolute top-0 left-0 w-full h-2 liquid-gradient animate-pulse" />
        
        {/* Optional Skip Button */}
        <button 
          onClick={handleComplete}
          className="absolute top-6 right-6 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 text-[10px] uppercase font-black italic tracking-widest z-20"
        >
          SKIP_SEQ <X className="w-4 h-4" />
        </button>

        <div className="p-10 md:p-14">
          {/* Progress Indicators */}
          <div className="flex gap-2 mb-12">
            {TOUR_STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "h-1.5 flex-1 transition-all duration-300 shadow-brutal",
                  idx === currentStep ? "bg-primary border-2 border-on-surface" :
                  idx < currentStep ? "bg-on-surface border-2 border-on-surface" : 
                  "bg-outline/20"
                )}
              />
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
            <div className={cn(
              "w-32 h-32 shrink-0 border-2 border-on-surface shadow-brutal flex items-center justify-center rotate-3 relative",
              step.bg
            )}>
              <div className="absolute inset-0 bg-white/20" />
              <step.icon className="w-16 h-16 text-on-surface relative z-10" />
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-on-surface shadow-brutal animate-bounce" />
            </div>

            <div className="flex-1 space-y-4">
              <div className="inline-block bg-on-surface text-surface px-3 py-1 text-[10px] font-black uppercase italic tracking-[0.2em] shadow-brutal mb-2">
                MODULE 0{currentStep + 1}
              </div>
              <h2 className={cn(
                "text-4xl md:text-5xl font-headline font-black uppercase italic tracking-tighter leading-none text-on-surface drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]",
              )}>
                {step.title}
              </h2>
              <p className="text-xl md:text-2xl font-bold uppercase italic text-on-surface-variant tracking-tight leading-snug">
                "{step.subtitle}"
              </p>
            </div>
          </div>

          <div className="mt-16 flex justify-end">
            <button
              onClick={handleNext}
              disabled={isFinishing}
              className="liquid-btn text-lg px-8 py-4 flex items-center justify-center gap-3 w-full md:w-auto"
            >
              {currentStep < TOUR_STEPS.length - 1 ? (
                <>PROCEED <ChevronRight className="w-6 h-6 stroke-[3px]" /></>
              ) : (
                <>{isFinishing ? 'INITIALIZING...' : 'INITIATE_LINK'} <CheckCircle2 className="w-6 h-6 stroke-[3px]" /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
