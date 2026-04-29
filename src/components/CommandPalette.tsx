import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, Users, Calendar, MessageSquare, Bell, User, Settings, X, ArrowRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = [
    { icon: Home, label: 'GOTO_FEED', path: '/feed' },
    { icon: Zap, label: 'FOUNDER_MATCH', path: '/feed/founder-match' },
    { icon: Users, label: 'SQUAD_HUBS', path: '/feed/groups' },
    { icon: Calendar, label: 'RAVES_EVENTS', path: '/feed/events' },
    { icon: MessageSquare, label: 'DIRECT_MESSAGES', path: '/feed/messages' },
    { icon: Bell, label: 'SYSTEM_PINGS', path: '/feed/notifications' },
    { icon: User, label: 'MY_PROFILE', path: `/feed/profile/${user?.uid}` },
    { icon: Search, label: 'GLOBAL_SEARCH', path: '/feed/search' },
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleAction = (path: string) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-on-surface/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-surface border-4 border-on-surface shadow-brutal-lg z-[101] overflow-hidden"
          >
            <div className="flex items-center p-6 border-b-4 border-on-surface gap-4">
              <Search className="w-8 h-8 text-on-surface-variant" />
              <input
                autoFocus
                type="text"
                placeholder="ENTER_COMMAND_OR_SEACH..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-xl font-headline font-black uppercase italic italic-placeholder outline-none"
              />
              <div className="flex items-center gap-2 px-3 py-1 bg-on-surface/5 border-2 border-on-surface/20 rounded text-[10px] font-black text-on-surface-variant">
                ESC
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(cmd.path)}
                    className="w-full flex items-center justify-between p-4 hover:bg-primary/10 border-2 border-transparent hover:border-on-surface transition-all group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="p-3 bg-on-surface/5 border-2 border-on-surface/10 group-hover:bg-primary group-hover:text-on-surface transition-colors">
                        <cmd.icon className="w-6 h-6" />
                      </div>
                      <span className="text-lg font-headline font-black uppercase italic tracking-tight">{cmd.label}</span>
                    </div>
                    <ArrowRight className="w-6 h-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                ))
              ) : (
                <div className="p-12 text-center opacity-40">
                   <p className="text-xl font-headline font-black uppercase italic">NO_MATCHING_COMMANDS</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-on-surface/5 border-t-2 border-on-surface/10 flex items-center justify-between">
              <p className="text-[10px] font-black text-on-surface-variant uppercase italic tracking-widest">
                SOLOCONNECT_CLI_V1.0
              </p>
              <div className="flex items-center gap-4 text-[8px] font-black uppercase italic text-on-surface-variant/60">
                 <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 border border-on-surface/20 rounded">↑↓</span> NAVIGATE
                 </div>
                 <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.5 border border-on-surface/20 rounded">ENTER</span> EXECUTE
                 </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
