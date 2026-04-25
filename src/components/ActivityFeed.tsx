import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Users, MessageSquare, UserPlus, Zap, Ghost, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface Activity {
  id: string;
  userId: string;
  type: 'join_group' | 'comment_post' | 'connect_user' | 'create_post' | 'like_post';
  targetId: string;
  targetName: string;
  createdAt: any;
  metadata?: any;
}

interface ActivityFeedProps {
  userId: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(activitiesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activities');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'join_group': return <Users className="w-4 h-4 text-primary" />;
      case 'comment_post': return <MessageSquare className="w-4 h-4 text-secondary" />;
      case 'connect_user': return <UserPlus className="w-4 h-4 text-accent" />;
      case 'create_post': return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'like_post': return <Zap className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-on-surface/40" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'join_group':
        return (
          <>
            JOINED_COMMUNITY <Link to={`/groups/${activity.targetId}`} className="text-primary hover:underline">{activity.targetName}</Link>
          </>
        );
      case 'comment_post':
        return (
          <>
            COMMENTED_ON <Link to={`/feed`} className="text-secondary hover:underline">{activity.targetName}</Link>
            {activity.metadata?.commentSnippet && (
              <p className="mt-1 text-[10px] text-on-surface/40 italic line-clamp-1">"{activity.metadata.commentSnippet}"</p>
            )}
          </>
        );
      case 'connect_user':
        return (
          <>
            CONNECTED_WITH <Link to={`/profile/${activity.targetId}`} className="text-accent hover:underline">{activity.targetName}</Link>
          </>
        );
      case 'create_post':
        return (
          <>
            TRANSMITTED_NEW_DATA TO THE FEED
          </>
        );
      case 'like_post':
        return (
          <>
            ENERGIZED A TRANSMISSION
          </>
        );
      default:
        return 'PERFORMED_AN_ACTION';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-on-surface border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 bg-surface-bg border-4 border-on-surface border-dashed">
        <Ghost className="w-12 h-12 mx-auto mb-4 text-on-surface/10" />
        <p className="text-xs font-black uppercase italic tracking-widest text-on-surface/20">NO_ACTIVITY_LOGGED</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-4 p-4 glass-panel shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            <div className="mt-1">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase italic tracking-tight text-on-surface leading-tight">
                {getActivityText(activity)}
              </p>
              <p className="text-[10px] font-mono text-on-surface/40 uppercase tracking-widest mt-1">
                {activity.createdAt ? formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true }) : 'JUST_NOW'}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
