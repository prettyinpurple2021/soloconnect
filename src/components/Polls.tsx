import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { BarChart2, Plus, Trash2, Check, Users, Clock, Sparkles, X, Vote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { addXP } from '../lib/reputation';
import { logActivity } from '../lib/activities';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: { [optionIndex: string]: string[] }; // optionIndex "0", "1", etc. -> array of user.uid
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  createdAt: any;
}

export function Polls() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    const q = query(
      collection(db, 'polls'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPolls = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          question: data.question || '',
          options: data.options || [],
          votes: data.votes || {},
          creatorId: data.creatorId || '',
          creatorName: data.creatorName || 'Anonymous',
          creatorPhoto: data.creatorPhoto || '',
          createdAt: data.createdAt,
        } as Poll;
      });
      setPolls(loadedPolls);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'polls');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddOptionField = () => {
    if (options.length >= 6) {
      toast.error('MAXIMUM_6_OPTIONS_PER_POLL');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOptionField = (index: number) => {
    if (options.length <= 2) {
      toast.error('MINIMUM_2_OPTIONS_REQUIRED');
      return;
    }
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, val: string) => {
    const nextOpts = [...options];
    nextOpts[index] = val;
    setOptions(nextOpts);
  };

  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('SIGN_IN_TO_TRANSMIT');
      return;
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      toast.error('QUESTION_CANNOT_BE_EMPTY');
      return;
    }

    const cleanedOptions = options.map(o => o.trim()).filter(o => o !== '');
    if (cleanedOptions.length < 2) {
      toast.error('PROVIDE_AT_LEAST_2_OPTIONS');
      return;
    }

    // Check unique choices
    const uniqueOptions = Array.from(new Set(cleanedOptions));
    if (uniqueOptions.length !== cleanedOptions.length) {
      toast.error('OPTIONS_MUST_BE_UNIQUE');
      return;
    }

    const initialVotes: { [key: string]: string[] } = {};
    cleanedOptions.forEach((_, index) => {
      initialVotes[index.toString()] = [];
    });

    const toastId = toast.loading('Establishing poll vector...');
    try {
      await addDoc(collection(db, 'polls'), {
        question: trimmedQuestion,
        options: cleanedOptions,
        votes: initialVotes,
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous',
        creatorPhoto: user.photoURL || '',
        createdAt: serverTimestamp()
      });

      // Award XP for contributing to community engagement
      await addXP(user.uid, 'create_poll');

      await logActivity({
        userId: user.uid,
        type: 'vouch_user', // Fallback or standard activity type supported by schema
        targetId: 'poll',
        targetName: trimmedQuestion.slice(0, 50) + '...'
      });

      toast.success('POLL_SURVEY_STREAMED_SUCCESSFULLY', { id: toastId });
      
      // Reset form
      setQuestion('');
      setOptions(['', '']);
      setIsCreating(false);
    } catch (err: any) {
      console.error('Failed to create poll:', err);
      toast.error('TRANSMISSION_ERROR', { id: toastId });
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!user) {
      toast.error('SIGN_IN_TO_VOTE');
      return;
    }

    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    const currentVotes = { ...poll.votes };
    const uid = user.uid;

    // Clean existing vote if any
    Object.keys(currentVotes).forEach(idx => {
      if (Array.isArray(currentVotes[idx])) {
        currentVotes[idx] = currentVotes[idx].filter(id => id !== uid);
      } else {
        currentVotes[idx] = [];
      }
    });

    // Add new vote
    const strIndex = optionIndex.toString();
    if (!Array.isArray(currentVotes[strIndex])) {
      currentVotes[strIndex] = [];
    }
    if (!currentVotes[strIndex].includes(uid)) {
      currentVotes[strIndex].push(uid);
    }

    const pollRef = doc(db, 'polls', pollId);

    try {
      await updateDoc(pollRef, { votes: currentVotes });
      // Award micro-XP reward for voting!
      await addXP(user.uid, 'vote_poll');
      toast.success('VOTE_SUCCESSFULLY_RECORDED');
    } catch (err: any) {
      console.error('Failed to cast vote:', err);
      toast.error('VOTE_TRANSMISSION_INTERRUPTED');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!window.confirm('IRREVERSIBLE: Delete this poll?')) return;
    
    try {
      await deleteDoc(doc(db, 'polls', pollId));
      toast.success('POLL_DELETED_SUCCESSFULLY');
    } catch (err) {
      console.error('Delete poll failure:', err);
      toast.error('DELETE_FAILED');
    }
  };

  const calculatePollStats = (poll: Poll) => {
    const rawVotes = poll.votes || {};
    let totalVotes = 0;
    const optionCounts: { [key: string]: number } = {};

    poll.options.forEach((_, idx) => {
      const optionVoters = rawVotes[idx.toString()] || [];
      optionCounts[idx.toString()] = optionVoters.length;
      totalVotes += optionVoters.length;
    });

    return { totalVotes, optionCounts };
  };

  return (
    <div id="polls-container" className="space-y-8">
      {/* Top Banner to toggle creation */}
      <div className="bg-surface-container-low border-2 border-on-surface p-6 shadow-brutal flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <BarChart2 className="w-24 h-24 text-on-surface" />
        </div>
        <div className="space-y-2 z-10">
          <p className="text-[10px] font-bold text-accent uppercase italic tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" /> SURVEYS_PROTOCOLS_V1.5
          </p>
          <h2 className="text-2xl font-headline font-black uppercase italic tracking-tight text-on-surface">
            COMMUNITY_POLLS
          </h2>
          <p className="text-xs text-on-surface-variant font-medium max-w-lg">
            Create multi-choice micro-voting sessions to gauge consensus, crowdsource ideas, or resolve core founder disputes in real-time.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className={cn(
            "px-6 py-3 border-2 border-on-surface font-black uppercase italic text-xs tracking-wider transition-all duration-200 z-10 flex items-center gap-2 shadow-brutal active:shadow-none active:translate-x-1 active:translate-y-1",
            isCreating 
              ? "bg-accent text-on-surface hover:bg-accent/80" 
              : "bg-primary text-on-surface hover:bg-primary/80"
          )}
        >
          {isCreating ? (
            <>
              <X className="w-4 h-4" /> CLOSE_TERMINAL
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 stroke-[3px]" /> CREATE_SURVEY
            </>
          )}
        </button>
      </div>

      {/* Creation form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-surface-container-low border-2 border-on-surface shadow-brutal"
          >
            <form onSubmit={handleCreatePollSubmit} className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase italic tracking-widest flex items-center gap-2">
                  <Vote className="w-3 h-3 text-primary" /> POLL_QUESTION
                </label>
                <input
                  type="text"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="WHAT IS YOUR ABSOLUTE STANCE ON CO-FOUNDER EQUITY SPLITS?"
                  className="w-full bg-surface-container-lowest border-2 border-on-surface p-4 text-xs font-bold uppercase italic tracking-wider focus:outline-none focus:border-primary focus:shadow-brutal transition-all"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase italic tracking-widest flex items-center gap-2">
                  <BarChart2 className="w-3 h-3 text-secondary" /> SURVEY_RESPONSES
                </label>
                <div className="space-y-3">
                  {options.map((option, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <span className="font-mono text-xs font-bold text-on-surface-variant w-6">
                        0{idx + 1}.
                      </span>
                      <input
                        type="text"
                        required
                        value={option}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`OPTION_${idx + 1}`}
                        className="flex-1 bg-surface-container-lowest border-2 border-on-surface p-3 text-xs font-bold uppercase italic tracking-wider focus:outline-none focus:border-secondary focus:shadow-brutal transition-all"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(idx)}
                          className="p-3 border-2 border-on-surface bg-surface-container-lowest hover:bg-error/20 hover:text-error text-on-surface-variant transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase italic hover:underline"
                  >
                    <Plus className="w-3 h-4 stroke-[3px]" /> ADD_CHANCE_OPTION
                  </button>
                )}
              </div>

              <div className="pt-4 border-t-2 border-outline/10 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 border-2 border-on-surface bg-on-surface text-surface hover:bg-primary hover:text-on-surface font-black uppercase italic text-xs tracking-wider transition-all shadow-brutal active:shadow-none active:translate-x-1 active:translate-y-1"
                >
                  TRANSMIT_TO_FEED
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Polls Listing */}
      {loading ? (
        <div id="polls-loader" className="flex justify-center py-16">
          <div className="w-12 h-12 border-4 border-on-surface border-t-primary animate-spin shadow-brutal" />
        </div>
      ) : polls.length === 0 ? (
        <div id="polls-empty" className="bg-surface-container-low border-2 border-outline/15 py-16 text-center shadow-brutal">
          <p className="text-xl font-headline font-black uppercase italic tracking-tighter text-on-surface mb-2">
            NO_ACTIVE_POLLS
          </p>
          <p className="text-xs text-on-surface-variant font-medium max-w-sm mx-auto">
            The community spectrum is quiet. Create a poll vector to catalyze engagement!
          </p>
        </div>
      ) : (
        <div id="polls-grid" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence>
            {polls.map((poll) => {
              const { totalVotes, optionCounts } = calculatePollStats(poll);
              
              // Check if currently authed user has voted on any option
              let userVotedOptionIndex: number | null = null;
              if (user) {
                poll.options.forEach((_, idx) => {
                  const voters = poll.votes?.[idx.toString()] || [];
                  if (voters.includes(user.uid)) {
                    userVotedOptionIndex = idx;
                  }
                });
              }

              const isOwner = user?.uid === poll.creatorId;
              const formattedTime = poll.createdAt
                ? formatDistanceToNow(poll.createdAt.toDate ? poll.createdAt.toDate() : new Date(poll.createdAt), { addSuffix: true })
                : 'just now';

              return (
                <motion.div
                  key={poll.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface-container-low border-2 border-on-surface shadow-brutal p-6 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Content Header */}
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-2 border-on-surface overflow-hidden shadow-brutal-sm">
                          <img 
                            src={poll.creatorPhoto || `https://ui-avatars.com/api/?name=${poll.creatorName}`} 
                            referrerPolicy="no-referrer"
                            alt={poll.creatorName} 
                            className="w-full h-full object-cover grayscale"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase italic tracking-wider text-on-surface">
                            {poll.creatorName}
                          </p>
                          <span className="text-[8px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {formattedTime}
                          </span>
                        </div>
                      </div>

                      {/* Deletion context */}
                      {(isOwner || user?.email === 'prettyinpurple2021@gmail.com') && (
                        <button
                          type="button"
                          onClick={() => handleDeletePoll(poll.id)}
                          className="p-1.5 border-2 border-on-surface bg-surface hover:bg-error/20 hover:text-error text-on-surface transition-colors shadow-brutal-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <h3 className="text-base font-headline font-black uppercase italic tracking-tighter text-on-surface leading-snug mb-6 border-b-2 border-on-surface/5 pb-4">
                      {poll.question}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-3">
                      {poll.options.map((option, idx) => {
                        const score = optionCounts[idx.toString()] || 0;
                        const percentage = totalVotes > 0 ? Math.round((score / totalVotes) * 100) : 0;
                        const hasVotedThis = userVotedOptionIndex === idx;
                        const hasVotedAny = userVotedOptionIndex !== null;

                        return (
                          <div key={idx} className="relative">
                            {/* Vote option button or visual container */}
                            <button
                              type="button"
                              onClick={() => handleVote(poll.id, idx)}
                              disabled={!user}
                              className={cn(
                                "w-full text-left p-3.5 border-2 border-on-surface font-black uppercase italic text-[10px] tracking-wider relative overflow-hidden transition-all duration-200 shadow-brutal-sm active:translate-y-[1px] disabled:opacity-90",
                                hasVotedThis 
                                  ? "bg-secondary/15 text-on-surface" 
                                  : "bg-surface hover:bg-primary/5 text-on-surface"
                              )}
                            >
                              {/* Background percentage visual bar */}
                              {hasVotedAny && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.6 }}
                                  className={cn(
                                    "absolute top-0 left-0 h-full -z-10",
                                    hasVotedThis ? "bg-accent/30" : "bg-on-surface/5"
                                  )}
                                />
                              )}

                              {/* Text and stats */}
                              <div className="flex items-center justify-between z-10 relative">
                                <div className="flex items-center gap-3 pr-4">
                                  {hasVotedThis ? (
                                    <span className="p-0.5 bg-accent border border-on-surface shadow-brutal-sm scale-110">
                                      <Check className="w-3 h-3 text-on-surface stroke-[3.5px]" />
                                    </span>
                                  ) : (
                                    <span className="w-4 h-4 border border-on-surface/50 rounded-xs flex items-center justify-center font-mono text-[8px] font-black group-hover:border-primary">
                                      {idx + 1}
                                    </span>
                                  )}
                                  <span className="truncate">{option}</span>
                                </div>

                                {hasVotedAny && (
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono text-[9px] text-on-surface-variant font-bold">
                                      {score} {score === 1 ? 'VOTE' : 'VOTES'}
                                    </span>
                                    <span className="font-mono text-xs font-black text-on-surface">
                                      {percentage}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer metadata */}
                  <div className="mt-6 pt-4 border-t-2 border-outline/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase italic text-on-surface-variant">
                      <Users className="w-3.5 h-3.5" />
                      <span>{totalVotes} {totalVotes === 1 ? 'VOTER' : 'VOTERS'}</span>
                    </div>

                    {!user && (
                      <span className="text-[8px] font-bold text-error uppercase tracking-widest bg-error/10 px-2 py-0.5 border border-error">
                        SIGN_IN_VETO
                      </span>
                    )}

                    {userVotedOptionIndex !== null && (
                      <span className="text-[8px] font-black text-accent uppercase tracking-widest flex items-center gap-1 bg-accent/10 px-2.5 py-1 border-2 border-on-surface shadow-brutal-sm">
                        <Check className="w-3 h-3 text-accent animate-ping" /> DECISION_SECURED
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
