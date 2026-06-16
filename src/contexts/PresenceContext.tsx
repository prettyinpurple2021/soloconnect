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
  const lastActiveDatesRef = useRef<{ [uid: string]: Date | null }>({});

  const sweep = React.useCallback(() => {
    const now = Date.now();
    setOnlineUsers(prev => {
      let changed = false;
      const next: { [uid: string]: boolean } = {};

      Object.keys(lastActiveDatesRef.current).forEach(uid => {
        const lastActiveDate = lastActiveDatesRef.current[uid];
        const isOnline = lastActiveDate 
          ? (now - lastActiveDate.getTime() <= 75000) 
          : false;
        
        next[uid] = isOnline;
        if (prev[uid] !== isOnline) {
          changed = true;
        }
      });

      if (!changed) {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) {
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, []);

  // Run a status sweep every 15 seconds to gracefully transition users offline
  useEffect(() => {
    const sweepInterval = setInterval(sweep, 15000);
    return () => clearInterval(sweepInterval);
  }, [sweep]);

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
            lastActiveDatesRef.current[uid] = lastActiveDate;
          } else {
            lastActiveDatesRef.current[uid] = null;
          }
          sweep();
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
          delete lastActiveDatesRef.current[uid];
          sweep();
        }
      }
    };
  }, [sweep]);

  return (
    <PresenceContext.Provider value={{ onlineUsers, subscribeToUserPresence }}>
      {children}
    </PresenceContext.Provider>
  );
};

export const usePresence = () => useContext(PresenceContext);
