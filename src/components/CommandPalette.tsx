import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Search, Zap, Users, Calendar, MessageSquare, Bell, User, Settings, X, ArrowRight, Home, Sparkles, Move } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { playSound } from '../lib/sounds';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const listRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Focus and toggle key bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle palette: Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        playSound('click');
        setIsOpen(prev => !prev);
      }
      
      if (!isOpen) return;

      // Close key
      if (e.key === 'Escape') {
        playSound('click');
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const commands = [
    { icon: Home, label: 'GOTO_FEED', path: '/feed', desc: 'Main community hub & stream' },
    { icon: Zap, label: 'FOUNDER_MATCH', path: '/feed/founder-match', desc: 'Find co-founders via compatibility algorithm' },
    { icon: Users, label: 'SQUAD_HUBS', path: '/feed/groups', desc: 'Join industry or interest circles' },
    { icon: Calendar, label: 'RAVES_EVENTS', path: '/feed/events', desc: 'Upcoming digital & local meetups' },
    { icon: MessageSquare, label: 'DIRECT_MESSAGES', path: '/feed/messages', desc: 'Direct secure chat channels' },
    { icon: Bell, label: 'SYSTEM_PINGS', path: '/feed/notifications', desc: 'Audit incoming alerts and reactions' },
    { icon: User, label: 'MY_PROFILE', path: `/feed/profile/${user?.uid}`, desc: 'View and edit retro bio & digital card' },
    { icon: Search, label: 'GLOBAL_SEARCH', path: '/feed/search', desc: 'Lookup founders, group nodes, and system logs' },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.desc.toLowerCase().includes(query.toLowerCase())
  );

  // Manage selectedIndex resetting & navigation keyboard events
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyboardNavigation = (e: KeyboardEvent) => {
      if (filteredCommands.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        playSound('hover');
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        playSound('hover');
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedCmd = filteredCommands[selectedIndex];
        if (selectedCmd) {
          handleAction(selectedCmd.path);
        }
      }
    };

    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Keep active item scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleAction = (path: string) => {
    playSound('success');
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Ambient Retro Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              playSound('click');
              setIsOpen(false);
            }}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-[100] cursor-pointer"
            id="cmd-backdrop"
          />

          {/* Draggable Command Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            dragElastic={0.05}
            style={{ x: '-50%', y: '0px' }}
            className="fixed top-[12%] left-1/2 w-full max-w-2xl bg-surface border-4 border-on-surface shadow-[8px_8px_0px_0px_var(--color-primary)] dark:shadow-[8px_8px_0px_0px_#FFACE4] z-[101] overflow-hidden rounded-none"
            id="cmd-palette-box"
          >
            {/* Y2K OS Style Draggable Title Bar */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="draggable-title-bar flex items-center justify-between p-3 bg-primary text-[#030712] border-b-4 border-on-surface cursor-grab active:cursor-grabbing select-none"
              id="cmd-title-bar"
            >
              <div className="flex items-center gap-2 font-mono text-xs font-black tracking-widest uppercase">
                <Move className="w-3.5 h-3.5 text-black" />
                <span>SOLOCONNECT://CORE_NAV.EXE [DRAG_HANDLE]</span>
              </div>
              <div className="flex items-center gap-1.5 pointer-events-auto">
                <div className="w-5 h-5 bg-surface border-2 border-on-surface flex items-center justify-center font-mono text-[9px] font-black text-on-surface shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] select-none">
                  _
                </div>
                <div className="w-5 h-5 bg-surface border-2 border-on-surface flex items-center justify-center font-mono text-[9px] font-black text-on-surface shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] select-none">
                  ▣
                </div>
                <button 
                  onClick={() => {
                    playSound('click');
                    setIsOpen(false);
                  }}
                  className="w-5 h-5 bg-secondary text-black border-2 border-on-surface flex items-center justify-center font-mono text-[10px] font-black hover:bg-accent cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  title="Close command room (Esc)"
                  id="cmd-close-btn"
                >
                  X
                </button>
              </div>
            </div>

            {/* Input Filter Node */}
            <div className="flex items-center p-5 border-b-4 border-on-surface gap-4 bg-surface" id="cmd-input-container">
              <Search className="w-6 h-6 text-on-surface-variant flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="ENTER INSTRUCTION NODE OR DESIRED PATH..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-lg font-headline font-black uppercase italic italic-placeholder outline-none p-1 border-b-2 border-transparent focus:border-primary text-on-surface selection:bg-secondary"
                id="cmd-input-field"
              />
              <div 
                onClick={() => {
                  playSound('click');
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1 bg-surface border-2 border-on-surface shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[10px] font-black text-on-surface cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                id="cmd-esc-badge"
              >
                ESC
              </div>
            </div>

            {/* Content List Feed */}
            <div 
              ref={listRef}
              className="max-h-[50vh] overflow-y-auto p-3 space-y-1.5 custom-scrollbar bg-surface" 
              id="cmd-nodes-list"
            >
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, i) => {
                  const isActive = selectedIndex === i;
                  return (
                    <button
                      key={i}
                      data-active={isActive ? "true" : "false"}
                      onClick={() => handleAction(cmd.path)}
                      onMouseEnter={() => {
                        playSound('hover');
                        setSelectedIndex(i);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-3 border-2 transition-all text-left rounded-none",
                        isActive 
                        ? "bg-primary/20 dark:bg-primary/30 border-on-surface text-on-surface shadow-[3px_3px_0px_0px_var(--color-primary)] translate-x-[-1px] translate-y-[-1px]" 
                        : "bg-surface-container border-transparent text-on-surface-variant hover:bg-surface-container-high"
                      )}
                      id={`cmd-item-${i}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2.5 border-2 transition-colors",
                          isActive 
                          ? "bg-primary text-black border-on-surface" 
                          : "bg-surface border-on-surface/15 text-on-surface-variant"
                        )}>
                          <cmd.icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-headline font-black uppercase italic tracking-tight">{cmd.label}</span>
                          <span className="text-[10px] font-mono opacity-80 uppercase tracking-wider">{cmd.desc}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <span className="font-mono text-[9px] bg-secondary text-black px-1.5 py-0.5 border border-on-surface font-bold uppercase animate-pulse">
                            ACTIVE
                          </span>
                        )}
                        <ArrowRight className={cn(
                          "w-5 h-5 transition-all",
                          isActive ? "opacity-100 translate-x-1 text-primary" : "opacity-0"
                        )} />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-10 text-center opacity-40 py-16" id="cmd-no-results">
                  <p className="text-xl font-headline font-black uppercase italic">NO_MATCHING_INSTRUCTIONS_FOUND</p>
                  <p className="font-mono text-xs uppercase mt-2">TRY SEARCHINGS DIFFERENT NODES</p>
                </div>
              )}
            </div>

            {/* Footer Status Bar panel */}
            <div className="p-3 bg-secondary text-black border-t-4 border-on-surface flex flex-col sm:flex-row items-center justify-between gap-2" id="cmd-footer-bar">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <p className="text-[10px] font-black uppercase italic tracking-widest leading-none">
                  SYS_SHELL_PORTAL_ACTIVE // SOLOCONNECT
                </p>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-black uppercase italic leading-none">
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.5 border border-black bg-surface text-on-surface rounded-none">↑↓ / MOUSE</span> CHOOSE
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.5 border border-black bg-surface text-on-surface rounded-none">ENTER</span> RUN_APP
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
