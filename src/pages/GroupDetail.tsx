import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where, orderBy, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Users, Calendar, MessageSquare, Shield, X, UserPlus, UserMinus, Edit2, Camera, Sparkles, Zap, TrendingUp, Activity, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { PostComments } from '../components/PostComments';
import { SquadHub } from '../components/SquadHub';
import { formatDistanceToNow } from 'date-fns';
import { logActivity } from '../lib/activities';

interface Group {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  members: string[];
  moderators?: string[];
  coverImage?: string;
  createdAt: any;
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  images?: string[];
  tags?: string[];
  likes: string[];
  commentCount: number;
  groupId?: string;
  createdAt: any;
}

interface Event {
  id: string;
  title: string;
  date: any;
  location: string;
  attendees: string[];
}

export function GroupDetail() {
  const { groupId } = useParams();
  const { user, userProfile } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members' | 'hub'>('feed');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = onSnapshot(doc(db, 'groups', groupId), (doc) => {
      if (doc.exists()) {
        setGroup({ id: doc.id, ...doc.data() } as Group);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `groups/${groupId}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'posts'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    const q = query(
      collection(db, 'events'),
      where('groupId', '==', groupId),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(eventsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    return () => unsubscribe();
  }, [groupId]);

  const toggleJoin = async () => {
    if (!user || !group) return;
    const isMember = group.members.includes(user.uid);
    const groupRef = doc(db, 'groups', group.id);

    try {
      await updateDoc(groupRef, {
        members: isMember ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });

      if (!isMember) {
        await logActivity({
          userId: user.uid,
          type: 'join_group',
          targetId: group.id,
          targetName: group.name
        });
      }

      toast.success(isMember ? 'Left the community.' : 'Joined the community!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `groups/${group.id}`);
      toast.error('Failed to update membership.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-on-surface border-t-primary animate-spin shadow-brutal" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-24 brutal-card bg-surface-container-low">
        <Ghost className="w-24 h-24 mx-auto mb-8 text-on-surface/20" />
        <h2 className="text-4xl font-headline font-black uppercase italic tracking-tighter text-on-surface">COMMUNITY_NOT_FOUND</h2>
        <Link to="/groups" className="mt-8 inline-block liquid-btn px-8 py-3">
          BACK_TO_DIRECTORIES
        </Link>
      </div>
    );
  }

  const isMember = group.members.includes(user?.uid || '');
  const isCreator = group.creatorId === user?.uid;
  const isModerator = group.moderators?.includes(user?.uid || '');
  const isAdmin = isCreator || isModerator;

  return (
    <div className="space-y-12 pb-24 font-sans">
      {/* Group Header */}
      <div className="relative">
        <div className="h-64 lg:h-80 bg-surface-container-low border-2 border-on-surface shadow-brutal overflow-hidden relative">
          {group.coverImage ? (
            <img src={group.coverImage} alt={group.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
          ) : (
            <div className="w-full h-full bg-surface-container-lowest flex items-center justify-center relative">
              <div className="absolute inset-0 liquid-gradient opacity-20 blur-[80px]"></div>
              <Users className="w-32 h-32 text-on-surface/10 relative z-10" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent" />
          
          <div className="absolute bottom-8 left-8 right-8 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h1 className="text-5xl lg:text-7xl font-headline font-black text-surface uppercase italic tracking-tighter drop-shadow-[4px_4px_0px_#2c2f31]">
                  {group.name}
                </h1>
                {isAdmin && (
                  <div className="bg-primary border-2 border-on-surface px-3 py-1 shadow-brutal rotate-3">
                    <Shield className="w-6 h-6 text-on-surface" />
                  </div>
                )}
              </div>
              <p className="text-xl font-bold text-surface/80 italic max-w-2xl line-clamp-2">
                {group.description}
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="bg-surface-container-lowest/20 backdrop-blur-md border-2 border-surface/20 p-4 flex items-center gap-4 shadow-brutal">
                <div className="text-right">
                  <p className="text-3xl font-headline font-black text-surface leading-none">{group.members.length}</p>
                  <p className="text-[10px] font-black text-surface/60 uppercase italic tracking-widest">MEMBERS</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
              
              <button
                onClick={toggleJoin}
                className={cn(
                  "px-10 py-5 border-2 border-on-surface font-black text-2xl uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all",
                  isMember ? "bg-surface text-on-surface" : "liquid-btn"
                )}
              >
                {isMember ? (
                  <span className="flex items-center gap-3"><UserMinus className="w-6 h-6" /> LEAVE_COMMUNITY</span>
                ) : (
                  <span className="flex items-center gap-3"><UserPlus className="w-6 h-6" /> JOIN_COMMUNITY</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-on-surface bg-surface-container-low overflow-x-auto scroller-none">
        {[
          { id: 'feed', label: 'THE_FEED', icon: MessageSquare },
          { id: 'hub', label: 'SQUAD_HUB', icon: Zap },
          { id: 'events', label: 'RAVES', icon: Calendar },
          { id: 'members', label: 'THE_COUNCIL', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-6 flex items-center justify-center gap-4 font-headline font-black text-xl uppercase italic tracking-tighter transition-all relative overflow-hidden",
              activeTab === tab.id 
                ? "bg-on-surface text-surface" 
                : "text-on-surface hover:bg-on-surface/5"
            )}
          >
            <tab.icon className="w-6 h-6" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 liquid-gradient" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'feed' && (
          <div className="space-y-12">
            {isMember ? (
              <div className="bg-surface-container-low border-2 border-outline/15 p-8 shadow-brutal">
                <Link to="/" className="flex items-center justify-center gap-4 liquid-btn py-6 font-headline font-black text-2xl uppercase italic">
                  <Sparkles className="w-8 h-8" /> TRANSMIT_TO_COMMUNITY
                </Link>
              </div>
            ) : (
              <div className="bg-surface-container-low border-2 border-outline/15 border-dashed p-12 text-center shadow-brutal">
                <p className="text-2xl font-black uppercase italic tracking-widest text-on-surface-variant/40">JOIN_THE_COMMUNITY_TO_PARTICIPATE_IN_THE_FEED</p>
              </div>
            )}

            <div className="space-y-12">
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-container-low border-2 border-outline/15 p-10 shadow-brutal relative group overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 liquid-gradient opacity-30" />
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <Link to={`/profile/${post.authorId}`} className="w-16 h-16 border-2 border-on-surface shadow-brutal overflow-hidden hover:rotate-6 transition-transform">
                        <img src={post.authorPhoto || `https://ui-avatars.com/api/?name=${post.authorName}`} alt={post.authorName} className="w-full h-full object-cover grayscale" />
                      </Link>
                      <div>
                        <Link to={`/profile/${post.authorId}`} className="text-2xl font-headline font-black uppercase italic tracking-tighter text-on-surface hover:text-primary transition-colors leading-none">{post.authorName}</Link>
                        <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest mt-2">
                          {post.createdAt ? formatDistanceToNow(post.createdAt.toDate()) : 'JUST_NOW'} // AGO
                        </p>
                      </div>
                    </div>
                  </div>

                  <div 
                    className="text-xl font-bold italic leading-tight mb-8 text-on-surface"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />

                  {post.images && post.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      {post.images.map((img, i) => (
                        <div key={i} className="aspect-video border-2 border-on-surface shadow-brutal overflow-hidden">
                          <img src={img} alt="" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-8 border-t-2 border-outline/15 flex items-center gap-8">
                    <div className="flex items-center gap-2 text-xs font-black uppercase italic text-on-surface">
                      <Zap className="w-5 h-5 text-secondary" /> {post.likes.length} LIKES
                    </div>
                    <div className="flex items-center gap-2 text-xs font-black uppercase italic text-on-surface">
                      <MessageSquare className="w-5 h-5 text-primary" /> {post.commentCount} INTEL
                    </div>
                  </div>
                </motion.div>
              ))}

              {posts.length === 0 && (
                <div className="text-center py-24 brutal-card bg-surface-container-low border-dashed">
                  <Ghost className="w-16 h-16 mx-auto mb-6 text-on-surface-variant/10" />
                  <p className="text-xl font-black uppercase italic tracking-widest text-on-surface-variant/20">NO_DATA_TRANSMISSIONS_YET</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hub' && (
          <SquadHub groupId={group.id} isMember={isMember} isAdmin={isAdmin} />
        )}

        {activeTab === 'events' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-container-low border-2 border-outline/15 p-8 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-1 transition-all group"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="bg-secondary border-2 border-on-surface p-3 shadow-brutal -rotate-6 group-hover:rotate-0 transition-transform">
                    <Calendar className="w-8 h-8 text-on-secondary" />
                  </div>
                  <div className="bg-on-surface text-surface px-4 py-1 text-[10px] font-black uppercase italic tracking-widest border-2 border-on-surface">
                    {event.attendees.length} GOING
                  </div>
                </div>
                <h3 className="text-3xl font-headline font-black uppercase italic tracking-tighter mb-4 text-on-surface">{event.title}</h3>
                <div className="space-y-2 mb-8">
                  <p className="text-sm font-bold italic text-on-surface-variant">{event.date?.toDate ? event.date.toDate().toLocaleString() : 'TBD'}</p>
                  <p className="text-sm font-bold italic text-on-surface-variant">{event.location}</p>
                </div>
                <Link to="/events" className="block w-full text-center bg-surface border-2 border-on-surface py-4 font-black uppercase italic shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all text-on-surface">
                  VIEW_DETAILS
                </Link>
              </motion.div>
            ))}
            
            {events.length === 0 && (
              <div className="md:col-span-2 text-center py-24 brutal-card bg-surface-container-low border-dashed">
                <Calendar className="w-16 h-16 mx-auto mb-6 text-on-surface-variant/10" />
                <p className="text-xl font-black uppercase italic tracking-widest text-on-surface-variant/20">NO_GATHERINGS_PLANNED</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {group.members.map((memberId) => (
              <MemberCard key={memberId} memberId={memberId} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemberCard({ memberId, group }: { memberId: string, group: Group }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'users', memberId), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${memberId}`);
    });
    return () => unsubscribe();
  }, [memberId]);

  if (!profile) return null;

  const isCreator = group.creatorId === memberId;
  const isModerator = group.moderators?.includes(memberId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface-container-low border-2 border-outline/15 p-6 shadow-brutal flex items-center gap-6 group hover:rotate-1 transition-all"
    >
      <Link to={`/profile/${memberId}`} className="w-20 h-20 border-2 border-on-surface shadow-brutal overflow-hidden shrink-0 group-hover:-rotate-6 transition-transform block hover:scale-105">
        <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName}`} alt={profile.displayName} className="w-full h-full object-cover grayscale" />
      </Link>
      <div className="min-w-0">
        <Link to={`/profile/${memberId}`} className="text-xl font-headline font-black uppercase italic tracking-tighter truncate block hover:text-primary transition-colors text-on-surface">
          {profile.displayName}
        </Link>
        <div className="flex gap-2 mt-2">
          {isCreator && <span className="bg-on-surface text-surface text-[8px] px-2 py-0.5 font-black uppercase italic">ADMIN</span>}
          {isModerator && !isCreator && <span className="bg-primary text-on-surface text-[8px] px-2 py-0.5 font-black uppercase italic border-2 border-on-surface">MOD</span>}
        </div>
      </div>
    </motion.div>
  );
}
