import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { Bell, UserPlus, MessageSquare, Calendar, Check, CheckCircle2, Sparkles, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { summarizeNotifications } from '../services/geminiService';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

interface Notification {
  id: string;
  userId: string;
  type: 'connection_request' | 'comment' | 'event_invite';
  sourceUserId: string;
  sourceUserName: string;
  sourceUserPhoto: string;
  content: string;
  link: string;
  read: boolean;
  createdAt: any;
}

export function Notifications() {
  const { user, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      // Filter out notifications from blocked users
      const filteredNotifs = notifsData.filter(n => !userProfile?.blockedUsers?.includes(n.sourceUserId));
      
      setNotifications(filteredNotifs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    const batch = writeBatch(db);
    unreadNotifs.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications (batch)');
    }
  };

  const handleSummarize = async () => {
    if (notifications.length === 0) return;
    
    setIsSummarizing(true);
    const toastId = toast.loading('AI is summarizing your notifications...');
    try {
      const notifTexts = notifications.slice(0, 10).map(n => `${n.sourceUserName} ${n.content}`);
      const result = await summarizeNotifications(notifTexts);
      setSummary(result);
      toast.success('Summary generated!', { id: toastId });
    } catch (error) {
      toast.error('Failed to generate summary.', { id: toastId });
    } finally {
      setIsSummarizing(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-green-500" />;
      case 'event_invite':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-zinc-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-16 h-16 border-8 border-black border-t-[#00FF00] rounded-full animate-spin shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black text-on-surface mb-2 uppercase italic tracking-tighter drop-shadow-[4px_4px_0px_#00ffff]">THE ECHOES</h1>
          <p className="text-black font-bold uppercase italic text-sm tracking-widest bg-accent px-3 py-1 inline-block border-2 border-on-surface shadow-kinetic-thud">STAY UPDATED WITH YOUR TRIBE.</p>
        </div>
        <div className="flex items-center gap-4">
          {notifications.length > 0 && (
            <button 
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="flex items-center gap-2 bg-primary border-4 border-on-surface text-black px-4 py-2 font-black uppercase italic shadow-kinetic-active hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
            >
              <Sparkles className={cn("w-5 h-5", isSummarizing && "animate-pulse")} />
              AI ECHO
            </button>
          )}
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-2 bg-secondary border-4 border-on-surface text-black px-4 py-2 font-black uppercase italic shadow-kinetic-active hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              CLEAR ALL
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-12 bg-on-surface text-surface-bg p-8 border-8 border-on-surface shadow-kinetic relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4">
              <button 
                onClick={() => setSummary(null)}
                className="text-surface-bg hover:text-primary transition-colors bg-on-surface border-2 border-surface-bg p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-8 h-8 text-accent" />
              <h3 className="font-black text-2xl uppercase italic tracking-tighter">AI ECHO SUMMARY</h3>
            </div>
            <div className="markdown-body text-white font-bold leading-relaxed text-lg italic">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
        {notifications.length > 0 ? (
          <AnimatePresence>
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "p-6 bg-surface-bg border-4 border-on-surface shadow-kinetic-thud flex gap-6 relative transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none cursor-pointer",
                  !notification.read ? "bg-primary/10" : ""
                )}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                {!notification.read && (
                  <div className="absolute left-[-4px] top-[-4px] bottom-[-4px] w-3 bg-secondary border-r-4 border-on-surface" />
                )}
                
                <div className="shrink-0 relative">
                  <div className="w-16 h-16 border-4 border-on-surface shadow-kinetic-thud overflow-hidden">
                    <img 
                      src={notification.sourceUserPhoto || `https://ui-avatars.com/api/?name=${notification.sourceUserName}`}
                      alt={notification.sourceUserName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-surface-bg border-2 border-on-surface p-1.5 shadow-kinetic-thud">
                    {getIcon(notification.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <p className="text-on-surface text-lg font-black uppercase italic tracking-tighter">
                      <Link to={`/profile/${notification.sourceUserId}`} className="hover:text-secondary transition-colors drop-shadow-[1px_1px_0px_#00ffff]">
                        {notification.sourceUserName}
                      </Link>
                    </p>
                    <span className="text-xs font-black uppercase italic bg-on-surface text-surface-bg px-2 py-0.5">
                      {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'JUST NOW'}
                    </span>
                  </div>
                  
                  <p className="text-on-surface font-bold text-lg mb-4 italic">
                    "{notification.content}"
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <Link 
                      to={notification.link}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                      className="inline-flex items-center justify-center px-6 py-2 text-sm font-black uppercase italic bg-accent border-2 border-on-surface text-black shadow-kinetic-thud hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                      VIEW MISSION
                    </Link>
                    {!notification.read && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="text-xs font-black uppercase italic text-on-surface/40 hover:text-on-surface transition-colors"
                      >
                        MARK AS READ
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 bg-surface-bg border-8 border-on-surface shadow-kinetic">
            <div className="w-24 h-24 bg-accent border-4 border-on-surface flex items-center justify-center mx-auto mb-6 shadow-kinetic-thud rotate-3">
              <Bell className="w-12 h-12 text-black" />
            </div>
            <h3 className="text-3xl font-black text-on-surface mb-2 uppercase italic tracking-tighter drop-shadow-[2px_2px_0px_#ff00ff]">SILENCE IN THE CAVE</h3>
            <p className="text-on-surface font-bold uppercase italic text-sm tracking-widest px-8">WHEN THE TRIBE CALLS, YOU'LL HEAR THE ECHOES HERE.</p>
          </div>
        )}
      </div>
    </div>
  );
}
