import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { logOut, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Home, User, Users, Calendar, LogOut, Briefcase, Bell, MessageSquare, CheckSquare, Trophy, GraduationCap, Cpu, Target, LayoutGrid, FileText, Factory, Sparkles, ChevronDown, Zap, Star, Ghost } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

type AppType = 'connect' | 'scribe' | 'ai' | 'academy' | 'factory';

export function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [currentApp, setCurrentApp] = useState<AppType>('connect');
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [userLevel, setUserLevel] = useState(1);
  const [userPoints, setUserPoints] = useState(150);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const totalUnread = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        return acc + (data.unreadCount?.[user.uid] || 0);
      }, 0);
      setUnreadMessagesCount(totalUnread);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };

  const apps = [
    { id: 'connect', name: 'SOLOCONNECT', icon: Users, color: 'bg-neon-pink', description: 'Troll Town Social' },
    { id: 'scribe', name: 'SCRIBBLE-BOT', icon: FileText, color: 'bg-neon-green', description: 'AI Brain Dumps' },
    { id: 'ai', name: 'BRAIN-BLAST', icon: Cpu, color: 'bg-neon-blue', description: 'Cyber-Squad' },
    { id: 'academy', name: 'SKILL-UP', icon: GraduationCap, color: 'bg-neon-yellow', description: 'Level Up Your Biz' },
    { id: 'factory', name: 'HYPE-LAB', icon: Factory, color: 'bg-troll-orange', description: 'Viral Machine' },
  ];

  const navItemsByApp: Record<AppType, any[]> = {
    connect: [
      { icon: Home, label: 'The Feed', path: '/' },
      { icon: Users, label: 'Troll Tribes', path: '/groups' },
      { icon: Calendar, label: 'Raves', path: '/events' },
      { icon: Target, label: 'Quests', path: '/challenges' },
      { icon: Trophy, label: 'Hall of Fame', path: '/success-stories' },
      { icon: MessageSquare, label: 'DMs', path: '/messages', badge: unreadMessagesCount },
      { icon: Bell, label: 'Pings', path: '/notifications', badge: unreadCount },
    ],
    scribe: [
      { icon: FileText, label: 'My Scrolls', path: '/soloscribe' },
      { icon: Sparkles, label: 'Magic Wand', path: '/soloscribe' },
      { icon: Target, label: 'Quests', path: '/challenges' },
    ],
    ai: [
      { icon: Cpu, label: 'Cyber-Agents', path: '/solosuccess-ai' },
      { icon: Target, label: 'The Market', path: '/agent-marketplace' },
    ],
    academy: [
      { icon: GraduationCap, label: 'Skill Hub', path: '/academy' },
      { icon: Users, label: 'Study Squads', path: '/academy-groups' },
      { icon: Trophy, label: 'Quests', path: '/challenges' },
    ],
    factory: [
      { icon: Factory, label: 'Hype Lab', path: '/content-factory' },
      { icon: Calendar, label: 'Hype Calendar', path: '/content-factory' },
    ]
  };

  const commonNavItems = [
    { icon: Briefcase, label: 'My Stash', path: `/profile/${user?.uid}` },
    { icon: CheckSquare, label: 'My Timeline', path: '/my-calendar' },
  ];

  const currentNavItems = navItemsByApp[currentApp];
  const activeApp = apps.find(a => a.id === currentApp)!;

  return (
    <div className="min-h-screen bg-surface-bg flex flex-col font-sans relative overflow-hidden">
      <div className="crt-scanline" />
      
      {/* Terminal Navigation */}
      <header className="terminal-nav">
        <div className="flex items-center gap-8 h-full">
          <div className="text-2xl font-black text-black uppercase italic tracking-[-2px] mr-4">
            SOLOCONNECT
          </div>
          <nav className="flex h-full">
            {navItemsByApp[currentApp].slice(0, 4).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "terminal-link",
                  isActive ? "bg-black text-secondary" : "text-black"
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="font-mono text-[10px] text-black uppercase tracking-widest hidden md:block">
            SYS_STATUS: OPTIMAL // NODE: {user?.uid.slice(0, 8)}
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-black text-secondary font-bold uppercase text-xs border-2 border-black hover:bg-secondary hover:text-black transition-colors"
          >
            [DISCONNECT]
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-72 sticky top-16 h-[calc(100vh-64px)] bg-surface-bg border-r-[6px] border-on-surface flex flex-col z-20 overflow-hidden">
          <div className="p-6 border-b-[6px] border-on-surface">
            <div className="relative">
              <button 
                onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)}
                className="w-full flex items-center justify-between p-4 bg-surface-bg border-[6px] border-on-surface shadow-kinetic hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 border-4 border-black flex items-center justify-center text-black", activeApp.color)}>
                    <activeApp.icon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-on-surface uppercase italic leading-none tracking-tight">{activeApp.name}</p>
                  </div>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-on-surface transition-transform", isAppSwitcherOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isAppSwitcherOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 right-0 mt-4 bg-surface-container border-[6px] border-on-surface shadow-kinetic-active z-30"
                  >
                    <div className="p-2 space-y-2">
                      {apps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            setCurrentApp(app.id as AppType);
                            setIsAppSwitcherOpen(false);
                            navigate(navItemsByApp[app.id as AppType][0].path);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 border-4 border-transparent transition-all text-left",
                            currentApp === app.id ? "bg-secondary text-black" : "text-on-surface hover:bg-primary hover:text-black"
                          )}
                        >
                          <div className={cn("w-8 h-8 border-2 border-black flex items-center justify-center text-black", app.color)}>
                            <app.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase italic leading-none">{app.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <p className="px-3 text-[10px] font-mono text-primary uppercase tracking-widest mb-4">
                // {activeApp.name}_ZONE
              </p>
              <div className="space-y-2">
                {navItemsByApp[currentApp].map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between px-4 py-3 border-[4px] border-transparent font-bold text-xs uppercase italic tracking-tight transition-all",
                        isActive 
                          ? "bg-primary text-black border-black shadow-kinetic-sm translate-x-1 translate-y-1" 
                          : "text-on-surface hover:bg-secondary hover:text-black hover:border-black"
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                    {item.badge ? (
                      <span className="bg-black text-secondary text-[10px] font-bold px-2 py-0.5 border-2 border-secondary">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="px-3 text-[10px] font-mono text-accent uppercase tracking-widest mb-4">
                // USER_PROTOCOL
              </p>
              <div className="space-y-2">
                {commonNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between px-4 py-3 border-[4px] border-transparent font-bold text-xs uppercase italic tracking-tight transition-all",
                        isActive 
                          ? "bg-accent text-black border-black shadow-kinetic-sm translate-x-1 translate-y-1" 
                          : "text-on-surface hover:bg-accent hover:text-black hover:border-black"
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>

          <div className="p-6 border-t-[6px] border-on-surface">
            <div className="flex items-center gap-3 p-3 bg-surface-container border-4 border-on-surface shadow-kinetic-sm mb-4">
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=random`} 
                alt={user?.displayName || 'User'} 
                className="w-10 h-10 border-2 border-on-surface object-cover grayscale"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-on-surface truncate uppercase tracking-tight">{user?.displayName}</p>
                <p className="text-[8px] text-primary font-mono uppercase tracking-widest">LVL {userLevel} // {userPoints} XP</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen bg-surface-bg">
          <div className="max-w-5xl mx-auto w-full py-12 px-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
