import { Zap, Briefcase, Terminal, GraduationCap, Store, Video, Compass } from 'lucide-react';

export type FounderPersonaType = 
  | 'Solo Founder' 
  | 'Solopreneur' 
  | 'Indie Hacker' 
  | 'Student' 
  | 'Small Business Owner' 
  | 'Content Creator' 
  | 'Curious Mind';

export interface PersonaMetadata {
  id: FounderPersonaType;
  name: string;
  tagline: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderColorClass: string;
  systemCode: string;
  iconName: string;
}

export const PERSONAS_LIST: PersonaMetadata[] = [
  {
    id: 'Solo Founder',
    name: 'SOLO_FOUNDER',
    tagline: '⚡ SCALE_READY',
    description: 'An entrepreneur engineering high-growth SaaS and capital-efficient startup rigs single-handedly.',
    bgClass: 'bg-primary',
    textClass: 'text-on-surface',
    borderColorClass: 'border-primary',
    systemCode: 'PF_RIG_ALPHA',
    iconName: 'Zap'
  },
  {
    id: 'Solopreneur',
    name: 'SOLOPRENEUR',
    tagline: '💼 MONETIZING_LIVE',
    description: 'A sovereign builder operating profitable, highly optimized one-person business model vectors.',
    bgClass: 'bg-secondary',
    textClass: 'text-on-surface',
    borderColorClass: 'border-secondary',
    systemCode: 'PF_SOLO_CAPITAL',
    iconName: 'Briefcase'
  },
  {
    id: 'Indie Hacker',
    name: 'INDIE_HACKER',
    tagline: '⌨️ DEPLOYING_FAST',
    description: 'A technical builder ship-compiling micro-SaaS platforms, tools, and scripts directly inside the public domain.',
    bgClass: 'bg-tertiary',
    textClass: 'text-on-surface',
    borderColorClass: 'border-tertiary',
    systemCode: 'PF_COMPILER_X',
    iconName: 'Terminal'
  },
  {
    id: 'Student',
    name: 'STUDENT_BUILDER',
    tagline: '🎓 LEVELING_UP',
    description: 'An active learner exploring emerging technological stacks, constructing initial prototypes, and acquiring allies.',
    bgClass: 'bg-green-300 dark:bg-green-400',
    textClass: 'text-black',
    borderColorClass: 'border-green-400',
    systemCode: 'PF_ACADEMY_NODE',
    iconName: 'GraduationCap'
  },
  {
    id: 'Small Business Owner',
    name: 'SMALL_BUSINESS_OWNER',
    tagline: '🏪 LOCAL_COMMERCE',
    description: 'A brick-and-mortar or boutique agency operator running high-touch localized commerce operations.',
    bgClass: 'bg-amber-300 dark:bg-amber-400',
    textClass: 'text-black',
    borderColorClass: 'border-amber-400',
    systemCode: 'PF_COMMERCE_RAID',
    iconName: 'Store'
  },
  {
    id: 'Content Creator',
    name: 'CONTENT_CREATOR',
    tagline: '🎙️ STREAM_ACTIVE',
    description: 'A digital publisher, stream-caster, deep-dive researcher, or designer constructing a programmatic audience vector.',
    bgClass: 'bg-orange-300 dark:bg-orange-400',
    textClass: 'text-black',
    borderColorClass: 'border-orange-400',
    systemCode: 'PF_BROADCAST_HUB',
    iconName: 'Video'
  },
  {
    id: 'Curious Mind',
    name: 'CURIOUS_MIND',
    tagline: '👀 RESEARCH_LIVE',
    description: 'An explorer, mentor, observer, or angel investigator hunting down ideas and learning from builders in public.',
    bgClass: 'bg-blue-300 dark:bg-blue-400',
    textClass: 'text-black',
    borderColorClass: 'border-blue-400',
    systemCode: 'PF_OBSERVER_EYE',
    iconName: 'Compass'
  }
];

export function getPersonaMetadata(id?: string): PersonaMetadata {
  const normalizedId = id ? id.trim() : '';
  const match = PERSONAS_LIST.find(p => p.id.toLowerCase() === normalizedId.toLowerCase());
  if (match) return match;
  
  // Backwards compatibility fallback mapping
  if (normalizedId.toLowerCase() === 'bootstrapper') return PERSONAS_LIST[1]; // Solopreneur
  if (normalizedId.toLowerCase() === 'visionary') return PERSONAS_LIST[0]; // Solo Founder
  if (normalizedId.toLowerCase() === 'builder') return PERSONAS_LIST[2]; // Indie Hacker
  if (normalizedId.toLowerCase() === 'specialist') return PERSONAS_LIST[5]; // Content Creator

  // Generic core default fallback
  return PERSONAS_LIST[0];
}
