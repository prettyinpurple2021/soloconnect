import { useEffect, useState } from 'react';
import { usePresence } from '../contexts/PresenceContext';

export function useUserOnlineState(userId: string | undefined): boolean {
  const { onlineUsers, subscribeToUserPresence } = usePresence();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsOnline(false);
      return;
    }

    const unsubscribe = subscribeToUserPresence(userId);
    const currentUserStatus = !!onlineUsers[userId];
    
    // Periodically update local state to react to time-passing if no socket update is fired
    const interval = setInterval(() => {
      setIsOnline(!!onlineUsers[userId]);
    }, 15000);

    setIsOnline(currentUserStatus);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [userId, subscribeToUserPresence, onlineUsers[userId]]);

  return isOnline;
}
