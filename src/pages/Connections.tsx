import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router';
import { UserCheck, UserPlus, UserX, X, Check, Users } from 'lucide-react';
import { acceptConnectionRequest, rejectConnectionRequest, removeConnection } from '../lib/connections';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface UserProfilePreview {
  uid: string;
  displayName: string;
  photoURL: string;
  founderType?: string;
}

export function Connections() {
  const { user, userProfile } = useAuth();
  
  const [pendingProfiles, setPendingProfiles] = useState<UserProfilePreview[]>([]);
  const [connectionProfiles, setConnectionProfiles] = useState<UserProfilePreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const pendingPromises = (userProfile.pendingConnections || []).map(async (uid) => {
          const docSnap = await getDoc(doc(db, 'users', uid));
          return docSnap.exists() ? { uid, ...docSnap.data() } as UserProfilePreview : null;
        });

        const connectionPromises = (userProfile.connections || []).map(async (uid) => {
          const docSnap = await getDoc(doc(db, 'users', uid));
          return docSnap.exists() ? { uid, ...docSnap.data() } as UserProfilePreview : null;
        });

        const resolvedPending = (await Promise.all(pendingPromises)).filter(Boolean) as UserProfilePreview[];
        const resolvedConnections = (await Promise.all(connectionPromises)).filter(Boolean) as UserProfilePreview[];

        setPendingProfiles(resolvedPending);
        setConnectionProfiles(resolvedConnections);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [userProfile]);

  const handleAccept = async (uid: string) => {
    if (!user) return;
    try {
      await acceptConnectionRequest(user, uid);
      toast.success('CONNECTION_ESTABLISHED.');
      setPendingProfiles(prev => prev.filter(p => p.uid !== uid));
      // Will auto-refresh when userProfile listener triggers 
    } catch (error) {
      toast.error('FAILED_TO_CONNECT.');
    }
  };

  const handleReject = async (uid: string) => {
    if (!user) return;
    try {
      await rejectConnectionRequest(user, uid);
      toast.success('REQUEST_DENIED.');
      setPendingProfiles(prev => prev.filter(p => p.uid !== uid));
    } catch (error) {
      toast.error('FAILED_TO_REJECT.');
    }
  };

  const handleRemove = async (uid: string) => {
    if (!user) return;
    try {
      await removeConnection(user, uid);
      toast.success('CONNECTION_SEVERED.');
      setConnectionProfiles(prev => prev.filter(p => p.uid !== uid));
    } catch (error) {
      toast.error('FAILED_TO_SEVER.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <div className="w-16 h-16 border-2 border-on-surface border-t-primary animate-spin shadow-brutal" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 font-sans">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-primary border-2 border-on-surface shadow-brutal flex items-center justify-center transform -rotate-3">
          <Users className="w-8 h-8 text-on-surface" />
        </div>
        <h1 className="text-4xl md:text-5xl font-headline font-black uppercase italic tracking-tighter text-on-surface">NETWORK_NODES</h1>
      </div>

      {pendingProfiles.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-headline font-black uppercase italic tracking-tight text-on-surface flex items-center gap-3">
            <span className="w-3 h-3 bg-accent animate-pulse" /> PENDING_REQUESTS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pendingProfiles.map(p => (
              <div key={p.uid} className="bg-surface border-2 border-on-surface p-6 flex flex-col sm:flex-row items-center gap-6 shadow-brutal">
                <Link to={`/profile/${p.uid}`} className="shrink-0 w-20 h-20 border-2 border-on-surface shadow-brutal hover:rotate-3 transition-transform overflow-hidden">
                  <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`} alt={p.displayName} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all cursor-pointer" />
                </Link>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <Link to={`/profile/${p.uid}`} className="block text-xl font-headline font-black uppercase italic tracking-tight text-on-surface hover:text-primary transition-colors truncate">
                    {p.displayName}
                  </Link>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {p.founderType || 'FOUNDER'}
                  </p>
                </div>
                <div className="flex sm:flex-col gap-3 shrink-0">
                  <button onClick={() => handleAccept(p.uid)} className="bg-primary text-on-surface border-2 border-on-surface p-2 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all" title="Accept">
                    <Check className="w-6 h-6 stroke-[3px]" />
                  </button>
                  <button onClick={() => handleReject(p.uid)} className="bg-surface text-on-surface border-2 border-on-surface p-2 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-0.5 transition-all" title="Reject">
                    <X className="w-6 h-6 stroke-[3px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <h2 className="text-2xl font-headline font-black uppercase italic tracking-tight text-on-surface flex items-center gap-3">
          <span className="w-3 h-3 bg-secondary" /> ESTABLISHED_NODES ({connectionProfiles.length})
        </h2>
        
        {connectionProfiles.length === 0 ? (
          <div className="p-16 text-center bg-surface-container-lowest border-2 border-dashed border-outline/15 shadow-brutal">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant italic">
              NO_ACTIVE_CONNECTIONS.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectionProfiles.map(p => (
              <div key={p.uid} className="bg-surface border-2 border-on-surface p-6 flex flex-col items-center text-center gap-4 shadow-brutal hover:shadow-brutal-lg hover:-translate-y-1 transition-all group">
                <Link to={`/profile/${p.uid}`} className="shrink-0 w-24 h-24 border-2 border-on-surface shadow-brutal overflow-hidden">
                  <img src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName}`} alt={p.displayName} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all cursor-pointer" />
                </Link>
                <div className="min-w-0 w-full mb-2">
                  <Link to={`/profile/${p.uid}`} className="block text-xl font-headline font-black uppercase italic tracking-tight text-on-surface hover:text-primary transition-colors truncate">
                    {p.displayName}
                  </Link>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {p.founderType || 'FOUNDER'}
                  </p>
                </div>
                <div className="flex gap-4 w-full">
                  <Link to={`/messages?chat=${p.uid}`} className="flex-1 bg-secondary text-on-surface border-2 border-on-surface py-2 shadow-brutal hover:bg-primary transition-colors text-[10px] font-bold uppercase italic flex justify-center items-center">
                    PING
                  </Link>
                  <button onClick={() => handleRemove(p.uid)} className="shrink-0 bg-surface text-on-surface-variant border-2 border-on-surface px-3 py-2 shadow-brutal hover:bg-accent hover:text-on-surface transition-colors">
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
