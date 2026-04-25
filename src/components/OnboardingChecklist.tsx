import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, doc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, Circle, Sparkles, User, MessageSquare, Users, Target, FileText, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import { cn } from '../lib/utils';

interface Task {
  id: string;
  label: string;
  description: string;
  icon: any;
  path: string;
  isCompleted: boolean;
}

export function OnboardingChecklist() {
  const { user, userProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const checkTasks = async () => {
      if (!user || !userProfile) return;

      try {
        // 1. Profile Completeness
        const profileComplete = !!(userProfile.bio && userProfile.skills?.length > 0 && userProfile.photoURL);

        // 2. First Post
        const postsQuery = query(collection(db, 'posts'), where('authorId', '==', user.uid), limit(1));
        const postsSnap = await getDocs(postsQuery);
        const hasPost = !postsSnap.empty;

        // 3. Join a Group
        const hasGroup = (userProfile as any).groups?.length > 0 || (userProfile.connections?.length > 0); // Simplified check

        // 4. Set a Goal
        const hasGoal = (userProfile as any).goals?.length > 0;

        const onboardingTasks: Task[] = [
          {
            id: 'profile',
            label: 'IDENTITY_ESTABLISHED',
            description: 'Complete your founder profile with bio and skills.',
            icon: User,
            path: `/profile/${user.uid}`,
            isCompleted: profileComplete
          },
          {
            id: 'post',
            label: 'FIRST_TRANSMISSION',
            description: 'Share your first update or thought on the feed.',
            icon: MessageSquare,
            path: '/',
            isCompleted: hasPost
          },
          {
            id: 'goal',
            label: 'GOAL_LOCKED',
            description: 'Set your first "Build in Public" milestone.',
            icon: Target,
            path: `/profile/${user.uid}`,
            isCompleted: hasGoal
          },
          {
            id: 'network',
            label: 'NETWORK_EXPANDED',
            description: 'Connect with at least 3 other founders in the ecosystem.',
            icon: Users,
            path: '/founder-match',
            isCompleted: (userProfile.connections?.length || 0) >= 3
          }
        ];

        setTasks(onboardingTasks);
      } catch (error) {
        console.error('Error checking onboarding tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    checkTasks();
  }, [user, userProfile]);

  const handleDismiss = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        onboardingDismissed: true
      });
    } catch (error) {
      console.error('Error dismissing onboarding:', error);
    }
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progress = (completedCount / tasks.length) * 100;

  if (loading || userProfile?.onboardingDismissed || completedCount === tasks.length) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-accent border-[8px] border-on-surface shadow-kinetic overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-24 h-24 text-black" />
      </div>

      <div className="p-6 border-b-[6px] border-on-surface flex items-center justify-between bg-white/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-on-surface text-surface-bg shadow-kinetic-thud rotate-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">FOUNDER_ONBOARDING</h3>
            <p className="text-[10px] font-bold uppercase italic tracking-widest mt-1">ESTABLISH_YOUR_PRESENCE_IN_THE_ECOSYSTEM</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xl font-black italic leading-none">{Math.round(progress)}%</p>
            <p className="text-[8px] font-bold uppercase italic tracking-widest">COMPLETE</p>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 border-4 border-on-surface bg-surface-bg hover:bg-secondary transition-all shadow-kinetic-thud"
          >
            <ChevronRight className={cn("w-6 h-6 transition-transform", isExpanded && "rotate-90")} />
          </button>
          <button 
            onClick={handleDismiss}
            className="p-2 border-4 border-on-surface bg-surface-bg hover:bg-secondary transition-all shadow-kinetic-thud"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="h-4 bg-on-surface/10 relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-primary border-r-[4px] border-on-surface"
        />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <Link 
                  key={task.id}
                  to={task.path}
                  className={cn(
                    "p-4 border-[4px] border-on-surface flex items-center gap-4 transition-all group",
                    task.isCompleted 
                      ? "bg-primary/20 opacity-60 grayscale" 
                      : "bg-surface-bg hover:bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-kinetic-thud"
                  )}
                >
                  <div className={cn(
                    "p-3 border-[3px] border-on-surface shadow-kinetic-thud transition-colors",
                    task.isCompleted ? "bg-primary" : "bg-accent group-hover:bg-primary"
                  )}>
                    <task.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black uppercase italic tracking-tighter truncate">{task.label}</h4>
                      {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[10px] font-bold uppercase italic text-on-surface/60 truncate">{task.description}</p>
                  </div>
                  {!task.isCompleted && <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
