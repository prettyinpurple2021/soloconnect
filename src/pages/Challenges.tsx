import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Target, Users, Calendar, Trophy, ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

interface Challenge {
  id: string;
  title: string;
  description: string;
  participants: number;
  endDate: any;
  reward: string;
  category: 'Networking' | 'Growth' | 'Learning' | 'Content';
}

interface UserChallenge {
  challengeId: string;
  progress: number;
  status: 'active' | 'completed';
}

export function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Record<string, UserChallenge>>({});
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    // Mock challenges for now as they are community-wide
    const mockChallenges: Challenge[] = [
      {
        id: '1',
        title: 'Networking Sprint',
        description: 'Connect with 10 new solo founders this week and share one insight from each conversation.',
        participants: 124,
        endDate: new Date(Date.now() + 86400000 * 5),
        reward: 'Networking Pro Badge',
        category: 'Networking'
      },
      {
        id: '2',
        title: 'Content Factory Blitz',
        description: 'Create and schedule 30 days of content in 48 hours using the Content Factory tools.',
        participants: 89,
        endDate: new Date(Date.now() + 86400000 * 2),
        reward: 'Content Master Badge',
        category: 'Content'
      },
      {
        id: '3',
        title: 'Academy Deep Dive',
        description: 'Complete any one full course in SoloSuccess Academy and post your certificate.',
        participants: 256,
        endDate: new Date(Date.now() + 86400000 * 14),
        reward: 'Scholar Badge',
        category: 'Learning'
      }
    ];
    setChallenges(mockChallenges);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'user_challenges'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Record<string, UserChallenge> = {};
      snapshot.docs.forEach(doc => {
        const d = doc.data();
        data[d.challengeId] = {
          challengeId: d.challengeId,
          progress: d.progress,
          status: d.status
        };
      });
      setUserChallenges(data);
    });
    return () => unsubscribe();
  }, [user]);

  const handleJoin = async (challengeId: string) => {
    if (!user) return;
    setLoading(challengeId);
    try {
      await addDoc(collection(db, 'user_challenges'), {
        userId: user.uid,
        challengeId,
        progress: 0,
        status: 'active',
        joinedAt: serverTimestamp()
      });
      toast.success('CHALLENGE JOINED! GOOD LUCK, FOUNDER!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'user_challenges');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-32 pb-32 font-sans">
      {/* Hero Section */}
      <div className="bg-secondary border-[16px] border-on-surface p-12 lg:p-32 relative overflow-hidden shadow-kinetic -rotate-1">
        <div className="absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_#00ffff_0%,_transparent_70%)]"></div>
          <div className="grid grid-cols-8 gap-8 rotate-12 translate-x-32 translate-y-16">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className="aspect-square bg-primary/30 border-4 border-on-surface shadow-kinetic-thud" />
            ))}
          </div>
        </div>
        <div className="relative z-10 space-y-12">
          <div className="inline-block bg-accent border-8 border-on-surface px-8 py-4 shadow-kinetic-thud rotate-3">
            <span className="text-2xl font-black uppercase italic tracking-widest text-black flex items-center gap-4">
              <Sparkles className="w-8 h-8 stroke-[3px]" /> LIMITED TIME TRIALS
            </span>
          </div>
          <h1 className="text-8xl lg:text-[12rem] font-black text-white uppercase italic leading-[0.8] tracking-tighter drop-shadow-[12px_12px_0px_#000000]">THE FOUNDER TRIALS</h1>
          <p className="text-3xl lg:text-5xl font-black uppercase italic tracking-tighter text-white drop-shadow-[4px_4px_0px_#000000] leading-none max-w-4xl">LEVEL UP YOUR SOLO BUSINESS WITH LEGENDARY GROWTH SPRINTS.</p>
        </div>
      </div>

      {/* Challenges Grid */}
      <div className="grid gap-24">
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ y: -15, rotate: index % 2 === 0 ? 1 : -1 }}
            className="bg-surface-bg border-[12px] border-on-surface p-12 lg:p-20 group relative overflow-hidden shadow-kinetic hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 border-l-[12px] border-b-[12px] border-on-surface -mr-48 -mt-48 group-hover:bg-accent/20 transition-colors rotate-12" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-center gap-20">
              <div className="w-32 h-32 bg-on-surface border-8 border-on-surface shadow-kinetic-thud flex items-center justify-center text-surface-bg shrink-0 rotate-6 group-hover:rotate-0 transition-transform">
                <Target className="w-16 h-16 text-secondary stroke-[3px]" />
              </div>

              <div className="flex-1 space-y-10">
                <div className="flex flex-wrap items-center gap-8">
                  <span className="bg-primary border-8 border-on-surface px-8 py-4 text-lg font-black uppercase italic shadow-kinetic-thud">
                    {challenge.category}
                  </span>
                  <div className="flex items-center gap-4 text-on-surface font-black uppercase italic text-xl tracking-widest">
                    <Calendar className="w-8 h-8 text-secondary stroke-[3px]" />
                    ENDS IN {Math.ceil((challenge.endDate.getTime() - Date.now()) / 86400000)} DAYS
                  </div>
                </div>
                <h3 className="text-5xl lg:text-7xl font-black text-on-surface uppercase italic tracking-tighter leading-none drop-shadow-[6px_6px_0px_#00ffff]">{challenge.title}</h3>
                <p className="text-on-surface font-bold italic leading-tight text-3xl max-w-4xl">"{challenge.description}"</p>
              </div>

              <div className="flex flex-col items-center gap-12 shrink-0">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-4 text-6xl font-black uppercase italic text-on-surface tracking-tighter">
                    <Users className="w-12 h-12 text-secondary stroke-[3px]" />
                    {challenge.participants + (userChallenges[challenge.id] ? 1 : 0)}
                  </div>
                  <p className="text-sm text-on-surface/40 font-black uppercase italic tracking-widest mt-4">JOINED THE TRIBE</p>
                </div>
                
                {userChallenges[challenge.id] ? (
                  <div className="w-full space-y-10">
                    <div className="flex items-center justify-between text-lg font-black uppercase italic tracking-widest text-on-surface">
                      <span>PROGRESS</span>
                      <span>{userChallenges[challenge.id].progress}%</span>
                    </div>
                    <div className="w-72 h-10 bg-surface-bg border-8 border-on-surface shadow-kinetic-thud overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${userChallenges[challenge.id].progress}%` }}
                        className="h-full bg-primary border-r-8 border-on-surface"
                      />
                    </div>
                    {userChallenges[challenge.id].status === 'completed' && (
                      <div className="flex items-center gap-4 text-primary font-black uppercase italic text-xl tracking-widest drop-shadow-[2px_2px_0px_#000000]">
                        <CheckCircle2 className="w-8 h-8 stroke-[3px]" />
                        TRIAL COMPLETED
                      </div>
                    )}
                  </div>
                ) : (
                  <button 
                    disabled={loading === challenge.id}
                    onClick={() => handleJoin(challenge.id)}
                    className="bg-on-surface border-8 border-on-surface text-surface-bg px-12 py-8 font-black text-3xl uppercase italic shadow-kinetic-active hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all flex items-center gap-6 disabled:opacity-50"
                  >
                    {loading === challenge.id ? (
                      <Loader2 className="w-12 h-12 animate-spin stroke-[4px]" />
                    ) : (
                      <>
                        JOIN THE TRIAL
                        <ArrowRight className="w-12 h-12 stroke-[4px]" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-20 pt-12 border-t-[10px] border-on-surface flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="flex items-center gap-6 text-on-surface font-black uppercase italic tracking-widest">
                <Trophy className="w-12 h-12 text-accent stroke-[3px]" />
                <span className="text-3xl">REWARD: <span className="text-secondary drop-shadow-[4px_4px_0px_#000000]">{challenge.reward}</span></span>
              </div>
              <div className="flex -space-x-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-20 h-20 border-8 border-on-surface shadow-kinetic-thud overflow-hidden rounded-none rotate-3 hover:rotate-0 transition-transform">
                    <img
                      src={`https://i.pravatar.cc/150?u=${challenge.id}${i}`}
                      alt="Participant"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                <div className="w-20 h-20 bg-accent border-8 border-on-surface shadow-kinetic-thud flex items-center justify-center text-lg font-black text-black italic -rotate-3">
                  +{challenge.participants - 5}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Hall of Fame Section */}
      <div className="pt-32">
        <div className="inline-block bg-primary border-8 border-on-surface px-12 py-6 shadow-kinetic-thud -rotate-2 mb-16">
          <h2 className="text-6xl font-black text-black uppercase italic flex items-center gap-8 tracking-tighter leading-none">
            <Trophy className="w-16 h-16 text-black stroke-[3px]" />
            HALL OF FAME
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {[1, 2, 3].map(i => (
            <div key={i} className={cn(
              "bg-surface-bg border-[10px] border-on-surface p-10 flex items-center gap-10 shadow-kinetic hover:translate-x-2 hover:translate-y-2 hover:shadow-none transition-all cursor-pointer group",
              i % 2 === 0 ? "rotate-1" : "-rotate-1"
            )}>
              <div className="w-24 h-24 border-8 border-on-surface shadow-kinetic-thud overflow-hidden rounded-none shrink-0 rotate-3 group-hover:rotate-0 transition-transform">
                <img
                  src={`https://i.pravatar.cc/150?u=winner${i}`}
                  alt="Winner"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-3xl font-black text-on-surface uppercase italic tracking-tighter leading-none group-hover:text-secondary transition-colors drop-shadow-[1px_1px_0px_#00ffff]">ALEX RIVERS</p>
                <p className="text-sm font-black uppercase italic tracking-widest text-on-surface/40 mt-4">COMPLETED CONTENT BLITZ</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
