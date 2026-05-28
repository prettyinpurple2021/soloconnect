import React from 'react';
import { Zap, Briefcase, Terminal, GraduationCap, Store, Video, Compass } from 'lucide-react';
import { getPersonaMetadata } from '../types';
import { cn } from '../lib/utils';

// Helper to resolve the icon based on metadata strings inside React components safely
export function PersonaIcon({ iconName, className = "w-4 h-4" }: { iconName: string; className?: string }) {
  switch (iconName) {
    case 'Zap':
      return <Zap className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'Terminal':
      return <Terminal className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Store':
      return <Store className={className} />;
    case 'Video':
      return <Video className={className} />;
    case 'Compass':
    default:
      return <Compass className={className} />;
  }
}

interface PersonaBadgeProps {
  personaString?: string;
  showTagline?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PersonaBadge({ personaString, showTagline = false, className = "", size = 'md' }: PersonaBadgeProps) {
  const metadata = getPersonaMetadata(personaString);

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[8px] font-mono gap-1 border",
    md: "px-3 py-1 text-[10px] font-black tracking-wider uppercase border-2 gap-1.5",
    lg: "px-4 py-2 text-xs font-black tracking-widest uppercase border-4 gap-2.5"
  };

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <div 
        className={cn(
          "inline-flex items-center font-headline uppercase italic font-black select-none shadow-brutal border-on-surface select-none hover:scale-[1.03] transition-transform",
          metadata.bgClass,
          metadata.textClass,
          sizeClasses[size]
        )}
      >
        <PersonaIcon iconName={metadata.iconName} className={cn(size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5')} />
        <span>{metadata.name}</span>
      </div>
      {showTagline && (
        <span className="font-mono text-[9px] font-black text-on-surface-variant uppercase tracking-wider pl-1 select-none">
          {metadata.tagline}
        </span>
      )}
    </div>
  );
}
