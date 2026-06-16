import { useEffect } from 'react';
import { usePresence } from '../contexts/PresenceContext';

export function useUserOnlineState(userId: string | undefined): boolean {
  const { onlineUsers, subscribeToUserPresence } = usePresence();

  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe = subscribeToUserPresence(userId);
    return () => {
      unsubscribe();
    };
  }, [userId, subscribeToUserPresence]);

  return !!(userId && onlineUsers[userId]);
}
