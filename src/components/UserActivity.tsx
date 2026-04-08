import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, FileText, Users, Ghost, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';

interface ActivityItem {
  id: string;
  type: 'post' | 'comment' | 'group';
  title: string;
  content: string;
  createdAt: any;
  link: string;
}

interface UserActivityProps {
  userId: string;
}

import { useAuth } from '../contexts/AuthContext';

export function UserActivity({ userId }: UserActivityProps) {
  const { userProfile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      try {
        // If the user being viewed is blocked by the current user, don't show activity
        if (userProfile?.blockedUsers?.includes(userId)) {
          setActivities([]);
          setLoading(false);
          return;
        }

        const activityList: ActivityItem[] = [];

        // Fetch recent posts
        const postsQuery = query(
          collection(db, 'posts'),
          where('authorId', '==', userId)
        );
        const postsSnapshot = await getDocs(postsQuery);
        postsSnapshot.forEach((doc) => {
          const data = doc.data();
          activityList.push({
            id: `post-${doc.id}`,
            type: 'post',
            title: 'Created a post',
            content: data.content || 'Shared an update with images',
            createdAt: data.createdAt,
            link: `/feed`, // Ideally link to specific post, but feed is fine for now
          });
        });

        // Fetch recent comments
        const commentsQuery = query(
          collection(db, 'comments'),
          where('authorId', '==', userId)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        commentsSnapshot.forEach((doc) => {
          const data = doc.data();
          activityList.push({
            id: `comment-${doc.id}`,
            type: 'comment',
            title: 'Commented on a post',
            content: data.content,
            createdAt: data.createdAt,
            link: `/feed`,
          });
        });

        // Fetch groups joined
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', userId)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        groupsSnapshot.forEach((doc) => {
          const data = doc.data();
          activityList.push({
            id: `group-${doc.id}`,
            type: 'group',
            title: 'Joined a group',
            content: data.name,
            createdAt: data.createdAt, // This is group creation time, not join time, but it's the best we have
            link: `/groups`,
          });
        });

        // Sort all activities by date descending
        activityList.sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return dateB - dateA;
        });

        setActivities(activityList.slice(0, 15)); // Keep top 15
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'activity');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchActivity();
    }
  }, [userId, userProfile?.blockedUsers]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-[8px] border-black border-t-[#FF00FF] rounded-none animate-spin shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16 bg-[#FFFF00] border-[8px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rotate-[-1deg]">
        <Ghost className="w-20 h-20 text-black mx-auto mb-6 animate-bounce" />
        <p className="text-2xl font-black text-black uppercase italic tracking-tighter">NO PULSE DETECTED!</p>
        <p className="text-xs font-black text-black/60 uppercase italic mt-2 tracking-widest">THIS FOUNDER IS CURRENTLY LURKING IN THE SHADOWS.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-6 group">
          <div className="mt-2 shrink-0">
            {activity.type === 'post' && (
              <div className="p-4 bg-[#00FFFF] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all rotate-[-3deg]">
                <FileText className="w-8 h-8 text-black" />
              </div>
            )}
            {activity.type === 'comment' && (
              <div className="p-4 bg-[#00FF00] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all rotate-[3deg]">
                <MessageCircle className="w-8 h-8 text-black" />
              </div>
            )}
            {activity.type === 'group' && (
              <div className="p-4 bg-[#FF00FF] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all rotate-[-2deg]">
                <Users className="w-8 h-8 text-black" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-black text-black uppercase italic tracking-tighter drop-shadow-[2px_2px_0px_#fff]">{activity.title}</span>
              <span className="bg-black text-white px-3 py-1 text-[10px] font-black uppercase italic tracking-widest shadow-[4px_4px_0px_0px_rgba(0,255,255,1)]">
                {activity.createdAt?.toDate ? formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true }).toUpperCase() : 'RECENTLY'}
              </span>
            </div>
            <Link to={activity.link} className="block bg-white border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFFF00]/10 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              <p className="text-lg font-black text-black italic tracking-tight line-clamp-2 leading-relaxed">"{activity.content}"</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase italic text-[#FF00FF]">
                VIEW INTEL <ExternalLink className="w-3 h-3" />
              </div>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
