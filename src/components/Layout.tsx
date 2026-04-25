import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { logOut, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Home, User, Users, Calendar, LogOut, Briefcase, Bell, MessageSquare, CheckSquare, Trophy, Target, Sparkles, Search, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { OnboardingTour } from './OnboardingTour';
import { ThemeToggle } from './ThemeToggle';

export function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingConnectionsCount, setPendingConnectionsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLevel, setUserLevel] = useState(1);
  const [userPoints, setUserPoints] = useState(150);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.pendingConnections) {
      setPendingConnectionsCount(userProfile.pendingConnections.length);
    } else {
      setPendingConnectionsCount(0);
    }
  }, [userProfile]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const navItems = [
    { icon: Home, label: 'The Feed', path: '/' },
    { icon: Sparkles, label: 'Founder Match', path: '/founder-match' },
    { icon: Users, label: 'Founder Communities', path: '/groups' },
    { icon: Calendar, label: 'Raves', path: '/events' },
    { icon: MessageSquare, label: 'DMs', path: '/messages', badge: unreadMessagesCount },
    { icon: Bell, label: 'Pings', path: '/notifications', badge: unreadCount },
  ];

  const commonNavItems = [
    { icon: Briefcase, label: 'My Stash', path: `/profile/${user?.uid}` },
    { icon: Users, label: 'Network', path: '/connections', badge: pendingConnectionsCount },
    { icon: CheckSquare, label: 'My Timeline', path: '/my-calendar' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <div className="noise-overlay" aria-hidden="true" />
      <OnboardingTour />
      
      {/* Iridescent Background Container */}
      <div className="fixed inset-0 liquid-iridescent-bg pointer-events-none z-0" />
      
      {/* Glass Header */}
      <header className="glass-panel sticky top-0 z-50 h-16 flex items-center px-6 border-b-2 border-outline/15">
        <div className="flex items-center gap-8 h-full">
          <div className="text-2xl font-headline font-black text-on-surface uppercase italic tracking-[-0.02em] mr-4">
            SOLOCONNECT
          </div>
          <nav className="flex h-full">
            {navItems.slice(0, 4).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "h-full flex items-center px-4 font-bold uppercase tracking-tight transition-all relative group",
                  isActive ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <motion.div 
                        layoutId="nav-active"
                        className="absolute bottom-0 left-0 w-full h-1 liquid-gradient"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <form onSubmit={handleSearch} className="relative hidden lg:block">
            <input 
              type="text"
              placeholder="SCAN_THE_VOID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-lowest border-2 border-outline/15 px-4 py-1.5 pl-10 text-[10px] font-bold uppercase italic shadow-brutal focus:shadow-brutal-lg focus:border-primary transition-all outline-none w-64"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          </form>
          <div className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest hidden xl:block">
            SYS_STATUS: OPTIMAL // NODE: {user?.uid.slice(0, 8)}
          </div>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="liquid-btn text-xs px-4 py-2"
          >
            [DISCONNECT]
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative z-10">
        {/* Sidebar */}
        <aside className="w-72 sticky top-16 h-[calc(100vh-64px)] bg-surface-container-low/40 backdrop-blur-xl border-r-2 border-outline/15 flex flex-col z-20 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 p-4 bg-surface-container-lowest border-2 border-outline/15 shadow-brutal relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full liquid-gradient" />
              <div className="w-10 h-10 liquid-gradient flex items-center justify-center border-2 border-on-surface rotate-3 group-hover:rotate-6 transition-transform">
                <Users className="w-6 h-6 text-on-surface" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-headline font-black text-on-surface uppercase italic leading-none tracking-tight">SOLOCONNECT</p>
                <p className="text-[8px] font-bold text-on-surface-variant uppercase italic mt-1">FOUNDER_SOCIAL</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <p className="px-3 text-[10px] font-mono text-tertiary uppercase tracking-widest">
                // CONNECT_ZONE
              </p>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between px-4 py-3 border-2 border-transparent font-bold text-xs uppercase italic tracking-tight transition-all",
                        isActive 
                          ? "chip-pill-active border-on-surface" 
                          : "text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface hover:border-outline/15 hover:shadow-brutal"
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </div>
                    {item.badge ? (
                      <span className="bg-on-surface text-surface text-[10px] font-bold px-2 py-0.5 border-2 border-on-surface">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="px-3 text-[10px] font-mono text-secondary uppercase tracking-widest">
                // USER_PROTOCOL
              </p>
              <div className="space-y-2">
                {commonNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between px-4 py-3 border-2 border-transparent font-bold text-xs uppercase italic tracking-tight transition-all",
                        isActive 
                          ? "bg-secondary text-on-surface border-on-surface shadow-brutal" 
                          : "text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface hover:border-outline/15 hover:shadow-brutal"
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

          <div className="p-6 bg-surface-container-lowest border-t-2 border-outline/15">
            <div className="flex items-center gap-3 p-3 bg-surface-container-low border-2 border-outline/15 shadow-brutal mb-4">
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=random`} 
                alt={user?.displayName || 'User'} 
                className="w-10 h-10 border-2 border-on-surface object-cover grayscale"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-on-surface truncate uppercase tracking-tight">{user?.displayName}</p>
                <p className="text-[8px] text-tertiary font-mono uppercase tracking-widest">LVL {userLevel} // {userPoints} XP</p>
              </div>
            </div>
            <button 
              onClick={() => {
                const feedback = prompt("TRANSMIT_FEEDBACK_TO_THE_VOID:");
                if (feedback) {
                  import('../lib/firebase').then(({ db }) => {
                    import('firebase/firestore').then(({ collection, addDoc, serverTimestamp }) => {
                      addDoc(collection(db, 'feedback'), {
                        userId: user?.uid,
                        userEmail: user?.email,
                        content: feedback,
                        createdAt: serverTimestamp()
                      }).then(() => alert("FEEDBACK_RECEIVED_FOUNDER."));
                    });
                  });
                }
              }}
              className="w-full py-2 bg-surface-container-low text-on-surface font-black uppercase text-[10px] italic border-2 border-on-surface shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all"
            >
              REPORT_GLITCH
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="max-w-5xl mx-auto w-full py-12 px-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
