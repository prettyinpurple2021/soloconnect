import React from 'react';
import { useUserOnlineState } from '../hooks/useUserOnlineState';

interface OnlineIndicatorProps {
  userId: string | undefined;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function OnlineIndicator({ userId, className = '', size = 'md' }: OnlineIndicatorProps) {
  const isOnline = useUserOnlineState(userId);

  if (!isOnline) return null;

  const sizeClasses = {
    xs: 'w-2 h-2 border-[1.5px]',
    sm: 'w-3 h-3 border-2',
    md: 'w-4 h-4 border-2',
    lg: 'w-5 h-5 border-2',
  };

  return (
    <div 
      className={`absolute bottom-0 right-0 z-20 rounded-full bg-[#10B981] border-on-surface shadow-sm shadow-[#10B981]/50 ${sizeClasses[size]} ${className}`}
      title="NODE_ONLINE (ACTIVE_PULSE)"
    >
      <span className="absolute inset-x-0 h-full w-full rounded-full bg-[#10B981] opacity-75 animate-ping" />
    </div>
  );
}
export default OnlineIndicator;
