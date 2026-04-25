import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative group p-2 overflow-hidden border-2 border-on-surface shadow-brutal transition-all hover:shadow-brutal-lg active:scale-95",
        theme === 'dark' ? "bg-primary" : "bg-secondary"
      )}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      <div className="relative z-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {theme === 'light' ? (
            <motion.div
              key="sun"
              initial={{ y: 20, rotate: 45, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: -20, rotate: -45, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Sun className="w-5 h-5 text-on-surface" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ y: 20, rotate: 45, opacity: 0 }}
              animate={{ y: 0, rotate: 0, opacity: 1 }}
              exit={{ y: -20, rotate: -45, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Moon className="w-5 h-5 text-on-surface" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Glitch Background Effect on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-white animate-[glitch-anim_0.2s_infinite]" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-primary animate-[glitch-anim_0.3s_infinite_reverse]" />
      </div>
      
      {/* Liquid Melting Overlay */}
      <motion.div
        className="absolute inset-0 bg-on-surface/10 pointer-events-none"
        initial={false}
        animate={{
          clipPath: theme === 'dark' 
            ? "circle(150% at 100% 100%)" 
            : "circle(0% at 100% 100%)"
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
    </button>
  );
}
