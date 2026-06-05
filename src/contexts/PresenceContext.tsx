import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface PresenceContextType {
  onlineUsers: { [uid: string]: boolean };
  subscribeToUserPresence: (uid: string) => () => void;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUsers: {},
  subscribeToUserPresence: () => () => {},
});

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<{ [uid: string]: boolean }>({});
  const subscriptionsRef = useRef<{ [uid: string]: { count: number; unsubscribe: () => void } }>({});

  // 1. Current user heartbeat
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      // Don't send heartbeat pulses if the user has minimized the tab / is away
      if (document.visibilityState !== 'visible') return;
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          lastActive: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        // Gracefully sink silent permissions/interference errors during early login phases
        console.warn('Presence heartbeat skipped:', err);
      }
    };

    // Trigger initially
    updatePresence();
    
    // Heartbeat every 25 seconds (short enough for smooth 75s detection, long enough to minimize writes)
    const interval = setInterval(updatePresence, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // 2. High performance shared multi-observer subscription loader
  const subscribeToUserPresence = React.useCallback((uid: string) => {
    if (!uid) return () => {};

    if (subscriptionsRef.current[uid]) {
      // Increment observers counter and re-use connection
      subscriptionsRef.current[uid].count++;
    } else {
      const userRef = doc(db, 'users', uid);
      const unsubscribe = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const lastActive = data.lastActive;
          
          if (lastActive) {
            const lastActiveDate = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
            const timeDiff = Date.now() - lastActiveDate.getTime();
            // Consider user active/online if timestamp is within a generous 75 seconds window
            const isOnline = timeDiff <= 75000;
            setOnlineUsers(prev => {
              if (prev[uid] === isOnline) return prev;
              return { ...prev, [uid]: isOnline };
            });
          } else {
            setOnlineUsers(prev => {
              if (prev[uid] === false) return prev;
              return { ...prev, [uid]: false };
            });
          }
        }
      }, () => {
        // Silent capture for network disconnects or permissions
      });

      subscriptionsRef.current[uid] = { count: 1, unsubscribe };
    }

    return () => {
      const sub = subscriptionsRef.current[uid];
      if (sub) {
        sub.count--;
        if (sub.count <= 0) {
          // No more active observers on the DOM; teardown connection cleanly
          sub.unsubscribe();
          delete subscriptionsRef.current[uid];
          setOnlineUsers(prev => {
            if (!(uid in prev)) return prev;
            const next = { ...prev };
            delete next[uid];
            return next;
          });
        }
      }
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ onlineUsers, subscribeToUserPresence }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
