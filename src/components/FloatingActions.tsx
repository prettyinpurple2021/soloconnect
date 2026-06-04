import React from 'react';
import { Sparkles, Target, Zap, ShieldAlert, ArrowUpRight, Compass, Maximize2 } from 'lucide-react';
import { motion } from 'motion/react';

export function FloatingActions() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none" id="y2k-floating-container">
      {/* --- TOP LEFT DECORATIVE ANCHOR --- */}
      <div className="absolute top-20 left-4 md:left-8 hidden lg:flex flex-col items-start gap-2" id="decor-top-left">
        {/* Holographic Glowing Spot */}
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-primary/10 blur-xl pointer-events-none" />
        
        {/* Sharp double-layered neo-brutal badge */}
        <div className="relative p-2 bg-surface border-2 border-on-surface shadow-[3px_3px_0px_0px_var(--color-primary)]">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        
        {/* Clean static labels */}
        <div className="flex flex-col font-mono text-[8.5px] text-on-surface-variant leading-none border-l-2 border-primary/40 pl-2 py-0.5">
          <span className="font-bold tracking-widest text-[#FFACE4]">ANGLE_01_A</span>
          <span className="text-on-surface-variant/70 mt-1">SEC_COOR_TL</span>
        </div>
      </div>

      {/* --- TOP RIGHT DECORATIVE ANCHOR --- */}
      <div className="absolute top-20 right-4 md:right-8 hidden lg:flex flex-col items-end gap-2" id="decor-top-right">
        {/* Holographic Glowing Spot */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-secondary/10 blur-xl pointer-events-none" />
        
        {/* Sharp double-layered neo-brutal badge */}
        <div className="relative p-2 bg-surface border-2 border-on-surface shadow-[3px_3px_0px_0px_var(--color-secondary)]">
          <Target className="w-5 h-5 text-secondary animate-pulse" style={{ animationDuration: '3s' }} />
        </div>
        
        {/* Clean static labels */}
        <div className="flex flex-col items-end font-mono text-[8.5px] text-on-surface-variant leading-none border-r-2 border-secondary/40 pr-2 py-0.5">
          <span className="font-bold tracking-widest text-[#a5f3fc]">ANGLE_02_B</span>
          <span className="text-on-surface-variant/70 mt-1">LOCK_TARGET_TR</span>
        </div>
      </div>

      {/* --- BOTTOM LEFT DECORATIVE ANCHOR --- */}
      <div className="absolute bottom-6 left-4 md:left-8 hidden lg:flex flex-col items-start gap-2" id="decor-bottom-left">
        {/* Holographic Glowing Spot */}
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-accent/10 blur-xl pointer-events-none" />
        
        {/* Clean static labels first, stacked in bottom corners */}
        <div className="flex flex-col font-mono text-[8.5px] text-on-surface-variant leading-none border-l-2 border-accent/40 pl-2 py-0.5">
          <span className="font-bold tracking-widest text-accent">ANGLE_03_C</span>
          <span className="text-on-surface-variant/70 mt-1">SEC_COOR_BL</span>
        </div>

        {/* Sharp double-layered neo-brutal badge */}
        <div className="relative p-2 bg-surface border-2 border-on-surface shadow-[3px_3px_0px_0px_var(--color-accent)]">
          <Compass className="w-5 h-5 text-accent" />
        </div>
      </div>

      {/* --- BOTTOM RIGHT DECORATIVE ANCHOR --- */}
      <div className="absolute bottom-6 right-4 md:right-8 hidden lg:flex flex-col items-end gap-2" id="decor-bottom-right">
        {/* Holographic Glowing Spot */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-xl pointer-events-none" />
        
        {/* Clean static labels first, stacked in bottom corners */}
        <div className="flex flex-col items-end font-mono text-[8.5px] text-on-surface-variant leading-none border-r-2 border-primary/40 pr-2 py-0.5">
          <span className="font-bold tracking-widest text-[#FFACE4]">ANGLE_04_D</span>
          <span className="text-on-surface-variant/70 mt-1">ORBITAL_CORNER</span>
        </div>

        {/* Sharp double-layered neo-brutal badge */}
        <div className="relative p-2 bg-surface border-2 border-on-surface shadow-[3px_3px_0px_0px_var(--color-primary)]">
          <Maximize2 className="w-5 h-5 text-primary rotate-45" />
        </div>
      </div>

      {/* --- BACKGROUND BLURRED FLOATING SHAPES --- */}
      <div className="absolute top-[25%] left-[-40px] w-96 h-96 rounded-full bg-primary/15 blur-[120px] pointer-events-none mix-blend-screen opacity-65 dark:opacity-40" />
      <div className="absolute bottom-[20%] right-[-40px] w-96 h-96 rounded-full bg-secondary/15 blur-[120px] pointer-events-none mix-blend-screen opacity-65 dark:opacity-43" />
    </div>
  );
}
