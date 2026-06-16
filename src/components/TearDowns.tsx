import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth, db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  MessageSquare, Plus, ExternalLink, Play, Upload, Send, User, 
  Image as ImageIcon, Video, AlertCircle, Sparkles, Star, ThumbsUp, 
  Trash2, Flame, Award, Globe, X, Heart
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../lib/sounds';
import { toast } from 'react-hot-toast';
import { addXP } from '../lib/reputation';
import { logActivity } from '../lib/activities';
import { cn } from '../lib/utils';

export interface Teardown {
  id: string;
  title: string;
  description: string;
  url?: string;
  videoUrl?: string;
  imageUrl?: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  createdAt: any;
  feedbackCount: number;
}

export interface TeardownReview {
  id: string;
  teardownId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto?: string;
  ratingDesign: number;
  ratingValue: number;
  brutalTruth: string;
  actionableSteps: string;
  upvotes: string[];
  createdAt: any;
}

export function TearDowns() {
  const { user, userProfile } = useAuth();
  
  // State Lists
  const [teardowns, setTeardowns] = useState<Teardown[]>([]);
  const [reviews, setReviews] = useState<TeardownReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Forms and Modals
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTeardown, setSelectedTeardown] = useState<Teardown | null>(null);

  // Add Request Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Form State
  const [ratingDesign, setRatingDesign] = useState(7);
  const [ratingValue, setRatingValue] = useState(7);
  const [brutalTruth, setBrutalTruth] = useState('');
  const [actionableSteps, setActionableSteps] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Computed Karma scores for each user
  const [karmaScores, setKarmaScores] = useState<Record<string, number>>({});

  // Real-time synchronization
  useEffect(() => {
    if (!user) return;

    // Listen to teardown requests
    const teardownsRef = collection(db, 'teardowns');
    const unsubTeardowns = onSnapshot(teardownsRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Teardown[];
      setTeardowns(list);
      setIsLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'teardowns');
    });

    // Listen to teardown reviews
    const reviewsRef = collection(db, 'teardown_reviews');
    const unsubReviews = onSnapshot(reviewsRef, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeardownReview[];
      setReviews(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'teardown_reviews');
    });

    return () => {
      unsubTeardowns();
      unsubReviews();
    };
  }, [user]);

  // Re-calculate Karma Scores whenever reviews change
  useEffect(() => {
    const scores: Record<string, number> = {};
    
    reviews.forEach(review => {
      const rId = review.reviewerId;
      // Writing a review rewards +10 Karma points
      scores[rId] = (scores[rId] || 0) + 10;
      
      // Every helpful upvote received rewards +5 Karma points
      if (review.upvotes && review.upvotes.length > 0) {
        scores[rId] += review.upvotes.length * 5;
      }
    });

    setKarmaScores(scores);
  }, [reviews]);

  // Current user's specific feedback karma
  const currentUserKarma = karmaScores[user?.uid || ''] || 0;
  const currentReviewsWrittenCount = reviews.filter(r => r.reviewerId === user?.uid).length;
  const currentUpvotesEarned = reviews
    .filter(r => r.reviewerId === user?.uid)
    .reduce((acc, r) => acc + (r.upvotes?.length || 0), 0);

  // Handle Screenshot Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      playSound('click');
    }
  };

  // Submit Feedback / Tear-down Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newTitle.trim() || !newDescription.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    playSound('click');

    try {
      let uploadedUrl = '';
      if (imageFile) {
        // Upload screenshot
        const fileName = `teardowns/${Date.now()}_${imageFile.name}`;
        const imageRef = ref(storage, fileName);
        await uploadBytes(imageRef, imageFile);
        uploadedUrl = await getDownloadURL(imageRef);
      }

      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        url: newUrl.trim(),
        videoUrl: newVideoUrl.trim(),
        imageUrl: uploadedUrl,
        creatorId: user.uid,
        creatorName: userProfile?.displayName || 'Anonymous Founder',
        creatorPhoto: userProfile?.photoURL || '',
        createdAt: serverTimestamp(),
        feedbackCount: 0
      };

      await addDoc(collection(db, 'teardowns'), payload);
      
      // Add XP for launching sandbox critique
      await addXP(user.uid, 'create_post');
      await logActivity({
        userId: user.uid,
        type: 'create_post',
        targetId: '',
        targetName: 'sandbox teardown request',
        metadata: { title: newTitle.trim() }
      });

      toast.success('🎉 TEARDOWN REQUEST LAUNCHED ON THE BOARD!');
      playSound('success');

      // Reset Form
      setNewTitle('');
      setNewDescription('');
      setNewUrl('');
      setNewVideoUrl('');
      setImageFile(null);
      setImagePreview(null);
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      toast.error('Error creating request. Check your layout data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Review to a specific Teardown
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTeardown) return;
    if (!brutalTruth.trim() || !actionableSteps.trim()) {
      toast.error('Critique feedback and actionable steps are both required!');
      return;
    }

    setIsSubmittingReview(true);
    playSound('click');

    try {
      const payload = {
        teardownId: selectedTeardown.id,
        reviewerId: user.uid,
        reviewerName: userProfile?.displayName || 'Anonymous Founder',
        reviewerPhoto: userProfile?.photoURL || '',
        ratingDesign,
        ratingValue,
        brutalTruth: brutalTruth.trim(),
        actionableSteps: actionableSteps.trim(),
        upvotes: [],
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'teardown_reviews'), payload);

      // Create notification alert for the project founder
      if (selectedTeardown.creatorId && selectedTeardown.creatorId !== user.uid) {
        const feedbackSnippet = brutalTruth.trim().length > 70
          ? brutalTruth.trim().substring(0, 70) + '...'
          : brutalTruth.trim();

        await addDoc(collection(db, 'notifications'), {
          userId: selectedTeardown.creatorId,
          type: 'teardown_feedback',
          sourceUserId: user.uid,
          sourceUserName: userProfile?.displayName || 'Someone',
          sourceUserPhoto: userProfile?.photoURL || '',
          content: `left a critical teardown review on "${selectedTeardown.title}": "${feedbackSnippet}"`,
          link: '/feed?tab=teardowns',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      // Increment comments / reviews counter on the Teardown post
      const teardownRef = doc(db, 'teardowns', selectedTeardown.id);
      await updateDoc(teardownRef, {
        feedbackCount: (selectedTeardown.feedbackCount || 0) + 1
      });

      // Update local state temporarily for smooth counter sync
      setSelectedTeardown(pf => pf ? { ...pf, feedbackCount: (pf.feedbackCount || 0) + 1 } : null);

      // Reward points! Feedback reviewers get XP for constructive reviews
      await addXP(user.uid, 'comment_post');
      await logActivity({
        userId: user.uid,
        type: 'comment_post',
        targetId: selectedTeardown.id,
        targetName: selectedTeardown.title,
        metadata: { summary: 'sandbox feedback review' }
      });

      toast.success('🔥 CONSTRUCTIVE CRITIQUE SUBMITTED! +10 KARMA SCORE ADDED!');
      playSound('success');

      // Reset
      setBrutalTruth('');
      setActionableSteps('');
      setRatingDesign(7);
      setRatingValue(7);
    } catch (err) {
      console.error(err);
      toast.error('Could not post your critique.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Upvote/Vouch a review helpfulness (+5 reviewer karma)
  const toggleUpvoteReview = async (review: TeardownReview) => {
    if (!user) return;
    if (review.reviewerId === user.uid) {
      toast.error('You cannot upvote your own critiques.');
      return;
    }

    const reviewRef = doc(db, 'teardown_reviews', review.id);
    const hasUpvoted = review.upvotes?.includes(user.uid);

    try {
      playSound('click');
      if (hasUpvoted) {
        await updateDoc(reviewRef, {
          upvotes: arrayRemove(user.uid)
        });
        toast.success('Retracted upvote.');
      } else {
        await updateDoc(reviewRef, {
          upvotes: arrayUnion(user.uid)
        });
        toast.success('Vouched critique helpful! (+5 Karma awarded to author)');
        playSound('success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sort teardowns dynamically by owner's computed Karma score first, then by date!
  const sortedTeardowns = [...teardowns].sort((a, b) => {
    const scoreA = karmaScores[a.creatorId] || 0;
    const scoreB = karmaScores[b.creatorId] || 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA; // prioritize higher creator feedback scores
    }
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* KARMA HUD WIDGET */}
      <div className="bg-primary/5 border-4 border-on-surface p-6 shadow-brutal flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden bg-dot-grid">
        <div className="absolute right-[-10px] top-[-10px] text-primary/10 select-none scale-150 pointer-events-none">
          <Award className="w-40 h-40" />
        </div>

        <div className="space-y-2 max-w-xl z-10 text-left">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-black font-black uppercase text-[9px] px-2 py-0.5 border border-on-surface shadow-brutal-xs">
              SANDBOX CENTRAL
            </span>
            <span className="font-mono text-[9px] font-bold text-on-surface-variant">// RECIPROCAL_DEVELOPER_FEEDBACK_ENGINE</span>
          </div>
          <h2 className="text-3xl font-headline font-black uppercase italic tracking-tight text-on-surface">
            CROWDSOURCED_TEARDOWNS
          </h2>
          <p className="text-xs text-on-surface-variant font-bold leading-relaxed">
            Makers suffer from pleasant-but-useless reviews. Pitch your pages, pitches, and wireframes here requesting <strong className="text-on-surface">brutal, critical critique</strong>. 
            Your request priority on the leaderboard matches your <strong className="text-primary uppercase">Feedback Karma Score</strong> — write excellent feedback for others to bubble your page to the absolute top!
          </p>
        </div>

        {/* User stats details */}
        <div className="bg-surface border-2 border-on-surface p-4 shadow-brutal-sm font-mono text-[10px] space-y-2 minimum-w-[200px] z-10 text-left w-full md:w-auto">
          <div className="flex justify-between items-center border-b border-on-surface/10 pb-1.5">
            <span className="text-on-surface-variant font-bold uppercase">YOUR_FEEDBACK_KARMA:</span>
            <span className="font-black text-primary text-lg flex items-center gap-1">⚡ {currentUserKarma}</span>
          </div>
          <p className="text-[9px] font-bold text-on-surface-variant">
            REVIEWS_CONVEYED: <strong className="text-on-surface">{currentReviewsWrittenCount} (+{currentReviewsWrittenCount * 10} pts)</strong>
          </p>
          <p className="text-[9px] font-bold text-on-surface-variant">
            HELPFUL_VOUCHES: <strong className="text-on-surface">{currentUpvotesEarned} (+{currentUpvotesEarned * 5} pts)</strong>
          </p>
          <div className="pt-2 border-t border-on-surface/5 flex justify-end">
            <button
              onClick={() => {
                setIsAdding(true);
                playSound('click');
              }}
              className="bg-primary hover:bg-primary-hover text-black border border-on-surface px-3 py-1 text-[9px] font-black uppercase italic shadow-brutal-xs hover:-translate-y-0.5 transition-all w-full text-center"
            >
              🚀 POST_MY_PROJECT
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED DIALOG: ASK FOR TEARDOWN */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border-4 border-on-surface max-w-2xl w-full p-8 shadow-brutal relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => { setIsAdding(false); playSound('click'); }}
                className="absolute top-4 right-4 border-2 border-on-surface bg-surface hover:bg-on-surface/10 p-2 cursor-pointer transition-all"
              >
                <X className="w-5 h-5 text-on-surface" />
              </button>

              <h3 className="text-2xl font-headline font-black uppercase italic mb-1 tracking-tight">
                📐 LAUNCH_SANDBOX_TEARDOWN
              </h3>
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wide mb-6">
                Post your landing, design mockups, or value proposition. Be ready for raw community truths.
              </p>

              <form onSubmit={handleSubmitRequest} className="space-y-6 text-left">
                <div>
                  <label className="block text-xs font-black uppercase italic mb-2 text-on-surface-variant">
                    WHAT_ARE_YOU_PROPOSING *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-surface-container-lowest border-2 border-on-surface p-4 font-bold text-sm uppercase italic focus:outline-none"
                    placeholder="E.G., SAAS_LANDING_PAGE_FOR_FREELANCERS"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase italic mb-2 text-on-surface-variant">
                    TELL_US_WHAT_WE_ARE_REVIEWS * (WHAT KEEPS YOU UP? WHAT DO YOU SUSPECT IS INEFFECTIVE?)
                  </label>
                  <textarea
                    required
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-surface-container-lowest border-2 border-on-surface p-4 font-mono text-xs focus:outline-none h-32"
                    placeholder="We just spent 2 weeks writing page copy but conversion data is flat. Is our hook too generic? Does our layout feel shady? Tell us exactly what is wrong."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase italic mb-2 text-on-surface-variant">
                      LIVE_SITE_URL (OPTIONAL)
                    </label>
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="w-full bg-surface-container-lowest border-2 border-on-surface p-3 font-mono text-xs focus:outline-none"
                      placeholder="https://mysolofounder.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase italic mb-2 text-on-surface-variant">
                      VIDEO_DEMO_URL (LOOM, BREAD, ETC - OPTIONAL)
                    </label>
                    <input
                      type="url"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="w-full bg-surface-container-lowest border-2 border-on-surface p-3 font-mono text-xs focus:outline-none"
                      placeholder="https://loom.com/share/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase italic mb-2 text-on-surface-variant">
                    SCREENSHOT_OR_PREVIEW_PROOF (HIGHLY RECOMMENDED)
                  </label>
                  <div className="border-2 border-dashed border-on-surface/40 bg-surface-container-lowest p-6 text-center relative hover:border-on-surface transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {imagePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={imagePreview} alt="Screenshot preview" className="max-h-40 object-contain border-2 border-on-surface shadow-brutal-sm" />
                        <span className="font-mono text-[9px] text-primary uppercase font-bold">CLICK_TO_CHANGE_SCREENSHOT</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                        <Upload className="w-8 h-8" />
                        <span className="text-xs font-bold uppercase italic">DRAG_OR_SELECT_PROJECT_MUTATION_SCREENSHOT</span>
                        <span className="text-[9px] font-mono font-bold">PNG / JPG UP TO 5MB</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-on-surface/10">
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); playSound('click'); }}
                    className="border-2 border-on-surface px-6 py-3 font-bold text-xs uppercase hover:bg-on-surface/5 italic"
                    disabled={isSubmitting}
                  >
                    ABORT
                  </button>
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-hover text-black border-2 border-on-surface px-8 py-3 font-black text-xs uppercase italic shadow-brutal"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'SYNCING_AND_LAUNCHING...' : '🚀 DEPLOY_TO_TEARDOWN_BOARD'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GRID BOARD AND LISTS */}
      {isLoading ? (
        <div className="py-24 text-center">
          <p className="animate-pulse font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            GETTING_COMMUNITY_SANDBOX_STREAMS...
          </p>
        </div>
      ) : sortedTeardowns.length === 0 ? (
        <div className="border-4 border-dashed border-on-surface/20 py-20 text-center flex flex-col items-center justify-center gap-4 bg-on-surface/5">
          <AlertCircle className="w-12 h-12 text-on-surface-variant/55" />
          <div>
            <h4 className="text-xl font-headline font-black uppercase italic text-on-surface">NO_TEARDOWNS_IN_FLIGHT</h4>
            <p className="text-xs font-bold text-on-surface-variant mt-1.5">No founders has requesting live page critique yet. Be the first!</p>
          </div>
          <button
            onClick={() => { setIsAdding(true); playSound('click'); }}
            className="border-2 border-on-surface bg-surface hover:bg-primary hover:text-black font-black text-xs uppercase px-6 py-3 italic shadow-brutal transition-all"
          >
            🚀 INITIATE_SANDBOX_REQUEST
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          {sortedTeardowns.map((teardown, index) => {
            const creatorKarma = karmaScores[teardown.creatorId] || 0;
            const requiresHelp = creatorKarma < 20;

            return (
              <motion.div
                key={teardown.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "bg-surface border-4 border-on-surface p-6 shadow-brutal hover:shadow-brutal-lg transition-all relative flex flex-col justify-between",
                  // Highlight top contributing founders with clean outer glow/offset
                  creatorKarma >= 60 ? "border-primary" : "border-on-surface"
                )}
              >
                {/* Score badge at top right */}
                <div className="absolute top-4 right-4 flex items-center gap-2 font-mono text-[9px] font-black uppercase">
                  {creatorKarma >= 60 && (
                    <span className="bg-primary text-black border border-on-surface px-2 py-0.5 shadow-brutal-xs">
                      🔥 TOP_CONTRIBUTOR
                    </span>
                  )}
                  <span className="bg-on-surface/5 border border-on-surface/25 text-on-surface px-2 py-0.5 rounded-none">
                    CREATOR_KARMA: ⚡{creatorKarma}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Creator Info */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 border border-on-surface overflow-hidden shadow-brutal-xs shrink-0">
                      <img 
                        src={teardown.creatorPhoto || `https://ui-avatars.com/api/?name=${teardown.creatorName}`} 
                        alt={teardown.creatorName} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover grayscale" 
                      />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">{teardown.creatorName}</p>
                      <p className="text-[9px] font-mono font-bold text-on-surface-variant/80">
                        LAUNCHED: {teardown.createdAt?.toDate ? formatDistanceToNow(teardown.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'JUST NOW'}
                      </p>
                    </div>
                  </div>

                  {/* Attachment thumbnail preview */}
                  {teardown.imageUrl && (
                    <div className="border border-on-surface/20 bg-black/5 overflow-hidden h-40 flex items-center justify-center relative group">
                      <img 
                        src={teardown.imageUrl} 
                        alt={teardown.title} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300 pointer-events-none" 
                      />
                      <div className="absolute inset-0 bg-black/45 md:opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="bg-surface border border-on-surface text-on-surface uppercase font-black text-[9px] px-2.5 py-1 shadow-brutal-xs">
                          INSPECT_PROJECT_MUTATION
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-headline font-black uppercase italic tracking-tight line-clamp-1 text-on-surface">
                      {teardown.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant/90 line-clamp-3 font-medium leading-relaxed">
                      {teardown.description}
                    </p>
                  </div>

                  {/* Warning label if author has low engagement */}
                  {requiresHelp && (
                    <div className="border border-yellow-600/30 bg-yellow-500/5 px-2.5 py-2 flex items-center gap-2 font-mono text-[8px] text-yellow-700/85">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-yellow-600" />
                      <span className="font-extrabold uppercase tracking-wider">
                        LOW_COMMUNITY_RECIPROCITY: HELP_THIS_FOUNDER_AND_TEACH_THEM_KARMA!
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer specs & Actions */}
                <div className="pt-4 border-t border-on-surface/10 mt-5 flex items-center justify-between gap-4">
                  <div className="flex gap-2 shrink-0">
                    {teardown.url && (
                      <a 
                        href={teardown.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="p-1.5 border border-on-surface/30 hover:border-on-surface hover:bg-on-surface/5 transition-all text-on-surface"
                        title="Open Live Site"
                        onClick={(e) => { e.stopPropagation(); playSound('click'); }}
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {teardown.videoUrl && (
                      <a 
                        href={teardown.videoUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="p-1.5 border border-on-surface/30 hover:border-on-surface hover:bg-on-surface/5 transition-all text-on-surface"
                        title="View Video Feedback Context"
                        onClick={(e) => { e.stopPropagation(); playSound('click'); }}
                      >
                        <Play className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTeardown(teardown);
                      playSound('click');
                    }}
                    className="flex-1 text-center bg-surface hover:bg-primary hover:text-black border-2 border-on-surface py-2 px-3 font-black text-xs uppercase italic shadow-brutal-sm transition-all text-on-surface cursor-pointer"
                  >
                    🔍 CRITIQUE / READ ({teardown.feedbackCount || 0})
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* DETAIL DRAWER / MODAL FOR CRITIQUING */}
      <AnimatePresence>
        {selectedTeardown && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border-4 border-on-surface max-w-4xl w-full p-8 shadow-brutal relative max-h-[90vh] overflow-y-auto text-left"
            >
              <button 
                onClick={() => { setSelectedTeardown(null); playSound('click'); }}
                className="absolute top-4 right-4 border-2 border-on-surface bg-surface hover:bg-on-surface/10 p-2 cursor-pointer transition-all"
              >
                <X className="w-5 h-5 text-on-surface" />
              </button>

              {/* Title Header */}
              <div className="border-b-4 border-on-surface pb-6 mb-6">
                <span className="bg-primary text-black font-black uppercase text-[8px] px-2 py-0.5 border border-on-surface shadow-brutal-xs">
                  INSPECTING_SANDBOX_PAGE_MUTATION
                </span>
                <h3 className="text-3xl font-headline font-black uppercase italic tracking-tight text-on-surface mt-2">
                  {selectedTeardown.title}
                </h3>
                <div className="flex flex-wrap items-center gap-4 mt-3 font-mono text-[9px] text-on-surface-variant font-bold">
                  <span>LAUNCHED_BY: <strong className="text-on-surface text-xs">{selectedTeardown.creatorName.toUpperCase()}</strong></span>
                  <span>•</span>
                  <span>TOTAL_CRITIQUES: <strong className="text-on-surface text-xs">{selectedTeardown.feedbackCount || 0}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Pitch info and image preview */}
                <div className="lg:col-span-7 space-y-6">
                  {selectedTeardown.imageUrl && (
                    <div className="border-4 border-on-surface rounded-none overflow-hidden max-h-96 shadow-brutal-sm bg-black/5">
                      <img src={selectedTeardown.imageUrl} alt={selectedTeardown.title} className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">// PROJECT_HOOK_CONTEXT</h4>
                    <p className="text-sm font-medium leading-relaxed bg-on-surface/5 p-4 border border-on-surface/10 italic text-on-surface">
                      "{selectedTeardown.description}"
                    </p>
                  </div>

                  <div className="flex gap-4">
                    {selectedTeardown.url && (
                      <a
                        href={selectedTeardown.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-surface hover:bg-secondary text-on-surface hover:text-black py-3 border-2 border-on-surface font-black text-xs uppercase italic shadow-brutal-sm transition-all"
                        onClick={() => playSound('click')}
                      >
                        🌐 INSPECT LIVE LANDING
                      </a>
                    )}
                    {selectedTeardown.videoUrl && (
                      <a
                        href={selectedTeardown.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center bg-surface hover:bg-accent hover:text-white py-3 border-2 border-on-surface font-black text-xs uppercase italic shadow-brutal-sm transition-all"
                        onClick={() => playSound('click')}
                      >
                        🎥 PLAY VIDEO WALKTHROUGH
                      </a>
                    )}
                  </div>

                  {/* REVIEWS STREAM FOR THIS TEARDOWN */}
                  <div className="space-y-4 pt-6 border-t border-on-surface/10">
                    <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" /> REVIEWS_BOARD_FEEDBACK_LEDGER
                    </h4>

                    {reviews.filter(r => r.teardownId === selectedTeardown.id).length === 0 ? (
                      <div className="border-2 border-dashed border-on-surface/20 p-8 text-center text-on-surface-variant/65">
                        <p className="font-mono text-[10px] font-bold">NO_CRITICAL_FEEDBACK_SUBMITTED_YET</p>
                        <p className="text-[10px] font-bold mt-1">Founders are inspectively pondering. Jump-start with the first truth!</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {reviews
                          .filter(r => r.teardownId === selectedTeardown.id)
                          .map((review, rIdx) => {
                            const hasUpvoted = review.upvotes?.includes(user?.uid || '');
                            
                            return (
                              <div key={review.id || rIdx} className="border-2 border-on-surface bg-surface p-5 shadow-brutal-sm text-left relative">
                                
                                {/* Score Indicator card */}
                                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                                  <div className="bg-secondary/10 border border-secondary text-on-surface font-mono text-[8px] px-2 py-0.5 uppercase italic">
                                    UI_UX: {review.ratingDesign}/10
                                  </div>
                                  <div className="bg-primary/10 border border-primary text-on-surface font-mono text-[8px] px-2 py-0.5 uppercase italic">
                                    V_PROP: {review.ratingValue}/10
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  {/* Reviewer signature */}
                                  <div className="flex items-center gap-1.5 border-b border-on-surface/10 pb-2 mb-2">
                                    <div className="w-6 h-6 border border-on-surface overflow-hidden shadow-brutal-xs rounded-none">
                                      <img 
                                        src={review.reviewerPhoto || `https://ui-avatars.com/api/?name=${review.reviewerName}`} 
                                        alt={review.reviewerName} 
                                        className="w-full h-full object-cover grayscale" 
                                      />
                                    </div>
                                    <span className="font-mono text-[10px] font-black text-on-surface uppercase">{review.reviewerName}</span>
                                    <span className="text-on-surface-variant font-mono text-[8px]">• {review.createdAt?.toDate ? formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'RECENT'}</span>
                                  </div>

                                  {/* Section of Truth */}
                                  <div className="space-y-1">
                                    <h5 className="text-[9px] font-mono font-black uppercase tracking-widest text-red-600 block">
                                      🛑 BRUTAL_TRUTH_CRITIQUE
                                    </h5>
                                    <p className="text-[11px] font-bold text-on-surface italic font-medium leading-relaxed bg-red-500/5 p-3.5 border border-red-600/10">
                                      "{review.brutalTruth}"
                                    </p>
                                  </div>

                                  {/* Actionable items */}
                                  <div className="space-y-1.5 pt-2">
                                    <h5 className="text-[9px] font-mono font-black uppercase tracking-widest text-secondary block">
                                      🛠️ RECOMMENDED_RECONSTRUCTIONS
                                    </h5>
                                    <p className="text-[11px] whitespace-pre-line font-mono font-bold text-on-surface bg-secondary/5 p-3.5 border border-secondary/15 leading-relaxed">
                                      {review.actionableSteps}
                                    </p>
                                  </div>

                                  {/* Help upvote button */}
                                  <div className="pt-2 border-t border-on-surface/10 flex justify-between items-center bg-on-surface/5 -mx-5 -mb-5 px-5 py-2.5 mt-4">
                                    <span className="font-mono text-[8px] font-bold text-on-surface-variant flex items-center gap-1">
                                      {review.upvotes?.length || 0} FOUNDERS_VOUCHED_THIS_HELPFUL
                                    </span>
                                    <button
                                      onClick={() => toggleUpvoteReview(review)}
                                      className={cn(
                                        "flex items-center gap-1.5 px-3 py-1 text-[8px] font-black uppercase italic border border-on-surface shadow-brutal-xs transition-all",
                                        hasUpvoted 
                                          ? "bg-accent text-white" 
                                          : "bg-surface text-on-surface hover:bg-accent hover:text-white"
                                      )}
                                    >
                                      <ThumbsUp className="w-3 h-3" />
                                      {hasUpvoted ? 'HELPFUL_VOUCHED' : 'VOUCH_HELPFUL (+5 KARMA)'}
                                    </button>
                                  </div>

                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Structured Feedback Submission Form */}
                <div className="lg:col-span-5 border-l-4 border-on-surface/15 pl-0 lg:pl-8 space-y-6">
                  <div className="bg-on-surface/5 p-5 border-2 border-on-surface shadow-brutal-sm space-y-4">
                    <h4 className="text-lg font-headline font-black uppercase italic tracking-tight border-b-2 border-on-surface/15 pb-2">
                      ✏️ LEAVE_CONSTRUCTIVE_CRITIQUE
                    </h4>

                    {user?.uid === selectedTeardown.creatorId ? (
                      <div className="border border-on-surface/10 bg-surface p-4 text-center font-mono text-[9px] text-on-surface-variant font-black">
                        🚫 YOU_CANNOT_PROVIDE_SELF_MUTATION_CRITIQUE_TO_YOUR_OWN_SANDBOX
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-5">
                        
                        {/* Rating Design Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-black uppercase italic text-on-surface">
                            <span>DESIGN & INTERFACE</span>
                            <span className="text-primary font-mono font-black">{ratingDesign}/10</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={ratingDesign}
                            onChange={(e) => setRatingDesign(Number(e.target.value))}
                            className="w-full accent-primary h-2" 
                          />
                        </div>

                        {/* Rating Value Slider */}
                        <div className="space-y-1 pt-2">
                          <div className="flex justify-between items-center text-xs font-black uppercase italic text-on-surface">
                            <span>VALUE PROP & PITCH HOOK</span>
                            <span className="text-secondary font-mono font-black">{ratingValue}/10</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={ratingValue}
                            onChange={(e) => setRatingValue(Number(e.target.value))}
                            className="w-full accent-secondary h-2" 
                          />
                        </div>

                        {/* Truth Box */}
                        <div className="pt-2">
                          <label className="block text-[9px] font-mono font-black uppercase tracking-wider text-on-surface mb-1.5">
                            🛑 BRUTAL TRUTH CRITIQUE *
                          </label>
                          <textarea
                            required
                            value={brutalTruth}
                            onChange={(e) => setBrutalTruth(e.target.value)}
                            className="w-full bg-surface-container-lowest border-2 border-on-surface p-3 font-mono text-[10px] focus:outline-none h-24"
                            placeholder="E.g., Honestly, your hero title has major fluff words like 'streamline' and 'next generation' but I still do not understand what the code actually does. Get rid of the generic jargon..."
                          />
                        </div>

                        {/* Action Steps */}
                        <div>
                          <label className="block text-[9px] font-mono font-black uppercase tracking-wider text-on-surface mb-1.5">
                            🛠️ 3_ACTIONABLE_RECONSTRUCTIONS *
                          </label>
                          <textarea
                            required
                            value={actionableSteps}
                            onChange={(e) => setActionableSteps(e.target.value)}
                            className="w-full bg-surface-container-lowest border-2 border-on-surface p-3 font-mono text-[10px] focus:outline-none h-24"
                            placeholder="E.g., 1. Rewrite slide subtitle to: 'We write cold emails for tech agencies'.&#10;2. Add the actual interactive dashboard mockup first instead of stock logos.&#10;3. Make the action call button contrast neon."
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="w-full bg-primary hover:bg-primary-hover text-black border-2 border-on-surface py-3 font-black text-xs uppercase italic shadow-brutal transition-all"
                        >
                          {isSubmittingReview ? 'DISPATCHING_CRITIQUE...' : '🚀 DISPATCH_CONSTRUCTIVE_REVIEWS'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
