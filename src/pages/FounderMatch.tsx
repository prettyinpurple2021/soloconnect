import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { Users, Sparkles, UserPlus, ArrowRight, Ghost, Zap, Star, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { suggestMatches } from '../services/geminiService';
import { Link } from 'react-router';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { toggleUserConnection } from '../lib/connections';

interface Match {
  uid: string;
  reason: string;
  synergyScore: number;
  profile?: any;
}

export function FounderMatch() {
  const { user, userProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchMatches = async () => {
    if (!user || !userProfile) return;
    
    setIsGenerating(true);
    try {
      // Fetch some other users to compare
      const usersQuery = query(
        collection(db, 'users'),
        where('uid', '!=', user.uid),
        limit(20)
      );
      const usersSnap = await getDocs(usersQuery);
      const otherUsers = usersSnap.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName,
        skills: doc.data().skills,
        bio: doc.data().bio,
        founderType: doc.data().founderType
      }));

      const result = await suggestMatches(userProfile, otherUsers);
      const cleanedResult = result.replace(/```json|```/g, '').trim();
      const matchData = JSON.parse(cleanedResult) as Match[];

      // Attach profile data to matches
      const finalMatches = matchData.map(match => {
        const fullProfile = usersSnap.docs.find(d => d.id === match.uid)?.data();
        return { ...match, profile: fullProfile };
      }).filter(m => m.profile);

      setMatches(finalMatches);
    } catch (error) {
      console.error("Matchmaking Error:", error);
      toast.error("AI_MATCHMAKING_FAILED. RETRYING_LATER.");
    } finally {
      setIsGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [user, userProfile]);

  const handleConnect = async (targetId: string) => {
    if (!user) return;
    try {
      await toggleUserConnection(user, targetId, false);
      toast.success("CONNECTION_REQUEST_TRANSMITTED.");
    } catch (error) {
      toast.error("TRANSMISSION_FAILED.");
    }
  };

  return (
    <div className="space-y-12 font-sans">
      <div className="brutal-card p-10 relative overflow-hidden bg-surface-container-low">
        <div className="absolute top-0 right-0 w-64 h-64 liquid-gradient opacity-20 blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <h1 className="text-6xl font-headline font-black text-on-surface tracking-[-0.04em] uppercase italic">FOUNDER_MATCH</h1>
          <div className="mt-4 liquid-gradient border-2 border-on-surface px-4 py-1 shadow-brutal inline-block">
            <p className="text-on-surface font-bold text-xl italic uppercase tracking-tight">"AI-POWERED COLLABORATION ENGINE."</p>
          </div>
        </div>
        <div className="absolute bottom-4 right-10 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">AI_ACTIVE</span>
        </div>
      </div>

      {isGenerating ? (
        <div className="text-center py-32 brutal-card bg-surface-container-low">
          <div className="w-24 h-24 border-4 border-on-surface border-t-primary animate-spin shadow-brutal mx-auto mb-10"></div>
          <h3 className="text-4xl font-headline font-black uppercase italic tracking-tighter animate-pulse text-on-surface">SCANNING_FOUNDER_DATABASE...</h3>
          <p className="text-xl font-bold text-on-surface-variant uppercase italic mt-4 tracking-widest">ANALYZING_SYNERGIES_AND_SKILL_GAPS.</p>
        </div>
      ) : matches.length > 0 ? (
        <div className="grid grid-cols-1 gap-12">
          <AnimatePresence>
            {matches.map((match, index) => (
              <motion.div
                key={match.uid}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "brutal-card flex flex-col lg:flex-row overflow-hidden group bg-surface-container-low",
                  index % 2 === 0 ? "rotate-1" : "-rotate-1"
                )}
              >
                <div className="lg:w-1/3 bg-on-surface p-10 flex flex-col items-center justify-center text-center relative">
                  <div className="absolute top-4 left-4">
                    <Star className="w-8 h-8 text-primary fill-primary" />
                  </div>
                  <div className="w-40 h-40 border-4 border-surface shadow-brutal overflow-hidden mb-6 group-hover:scale-110 transition-transform duration-500">
                    <img 
                      src={match.profile.photoURL || `https://ui-avatars.com/api/?name=${match.profile.displayName}`} 
                      alt={match.profile.displayName} 
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                  <h3 className="text-3xl font-headline font-black text-surface uppercase italic tracking-tighter mb-2">{match.profile.displayName}</h3>
                  <span className="bg-primary text-on-surface px-4 py-1 font-black text-xs uppercase italic border-2 border-on-surface mb-6">{match.profile.founderType || 'SOLO_FOUNDER'}</span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {match.profile.skills?.slice(0, 3).map((skill: string) => (
                      <span key={skill} className="chip-pill text-[8px] px-2 py-0.5 border-surface/20 text-surface/60">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-10 flex flex-col justify-between bg-surface-container-lowest">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-secondary border-2 border-on-surface shadow-brutal">
                          <ShieldCheck className="w-8 h-8 text-on-surface" />
                        </div>
                        <h4 className="text-2xl font-headline font-black uppercase italic tracking-tighter text-on-surface">AI_MATCH_REASON</h4>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase italic text-on-surface-variant">SYNERGY_SCORE</span>
                        <span className={cn(
                          "text-3xl font-black italic tracking-tighter",
                          match.synergyScore > 80 ? "text-primary" : match.synergyScore > 60 ? "text-secondary" : "text-tertiary"
                        )}>
                          {match.synergyScore}%
                        </span>
                      </div>
                    </div>
                    <p className="text-2xl font-black text-on-surface italic leading-tight tracking-tight">
                      "{match.reason}"
                    </p>
                    <div className="bg-surface-container-low border-2 border-outline/15 border-dashed p-6">
                      <p className="text-sm font-bold text-on-surface-variant italic">
                        {match.profile.bio || "THIS_FOUNDER_HAS_NOT_YET_TRANSMITTED_A_BIO."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-12 flex flex-col sm:flex-row gap-6">
                    <Link 
                      to={`/profile/${match.uid}`}
                      className="flex-1 bg-surface border-2 border-on-surface px-8 py-4 font-black text-xl uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-4 text-on-surface"
                    >
                      VIEW_PROFILE <ArrowRight className="w-6 h-6" />
                    </Link>
                    <button 
                      onClick={() => handleConnect(match.uid)}
                      className="flex-1 liquid-btn px-8 py-4 font-black text-xl uppercase italic flex items-center justify-center gap-4"
                    >
                      <UserPlus className="w-6 h-6" /> CONNECT
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <div className="text-center pt-12">
            <button 
              onClick={fetchMatches}
              className="bg-on-surface text-surface px-12 py-6 border-2 border-on-surface font-black uppercase italic text-2xl shadow-brutal hover:shadow-brutal-lg hover:-translate-y-1 transition-all"
            >
              REFRESH_MATCHES
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-32 brutal-card border-dashed bg-surface-container-low rotate-1">
          <Ghost className="w-24 h-24 text-on-surface-variant/20 mx-auto mb-6 stroke-[3px]" />
          <h3 className="text-4xl font-headline font-black text-on-surface mb-4 uppercase italic">NO_MATCHES_FOUND</h3>
          <p className="text-xl font-bold text-on-surface-variant italic">"THE_VOID_IS_QUIET._TRY_UPDATING_YOUR_PROFILE_TO_ATTRACT_SYNERGIES."</p>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-surface-container-low p-8 border-2 border-outline/15 shadow-brutal relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
          <Zap className="w-10 h-10 text-secondary mb-4" />
          <h4 className="text-xl font-headline font-black uppercase italic mb-2 text-on-surface">SYNERGY_SCORE</h4>
          <p className="text-4xl font-black text-on-surface">--%</p>
        </div>
        <div className="bg-surface-container-low p-8 border-2 border-outline/15 shadow-brutal relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <Users className="w-10 h-10 text-primary mb-4" />
          <h4 className="text-xl font-headline font-black uppercase italic mb-2 text-on-surface">ACTIVE_FOUNDERS</h4>
          <p className="text-4xl font-black text-on-surface">1</p>
        </div>
        <div className="bg-surface-container-low p-8 border-2 border-outline/15 shadow-brutal relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-tertiary" />
          <Sparkles className="w-10 h-10 text-tertiary mb-4" />
          <h4 className="text-xl font-headline font-black uppercase italic mb-2 text-on-surface">AI_OPTIMIZED</h4>
          <p className="text-4xl font-black text-on-surface">TRUE</p>
        </div>
      </div>
    </div>
  );
}
