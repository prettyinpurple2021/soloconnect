import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Target, Link as LinkIcon, Plus, Trash2, CheckCircle2, Circle, Trophy, Zap, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface GroupGoal {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  createdBy: string;
  createdAt: any;
}

interface GroupResource {
  id: string;
  title: string;
  url: string;
  category: 'tool' | 'article' | 'template' | 'other';
  createdBy: string;
  createdAt: any;
}

interface SquadHubProps {
  groupId: string;
  isMember: boolean;
  isAdmin: boolean;
}

export function SquadHub({ groupId, isMember, isAdmin }: SquadHubProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GroupGoal[]>([]);
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isAddingResource, setIsAddingResource] = useState(false);

  const [newGoal, setNewGoal] = useState({ title: '', description: '' });
  const [newResource, setNewResource] = useState({ title: '', url: '', category: 'tool' as GroupResource['category'] });

  useEffect(() => {
    if (!groupId) return;

    const goalsQuery = query(
      collection(db, `groups/${groupId}/goals`),
      orderBy('createdAt', 'desc')
    );
    const resourcesQuery = query(
      collection(db, `groups/${groupId}/resources`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
      setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupGoal)));
    });

    const unsubscribeResources = onSnapshot(resourcesQuery, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupResource)));
    });

    return () => {
      unsubscribeGoals();
      unsubscribeResources();
    };
  }, [groupId]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGoal.title.trim()) return;

    try {
      await addDoc(collection(db, `groups/${groupId}/goals`), {
        ...newGoal,
        status: 'pending',
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setNewGoal({ title: '', description: '' });
      setIsAddingGoal(false);
      toast.success('Mission uploaded.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'group goals');
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newResource.title.trim() || !newResource.url.trim()) return;

    try {
      await addDoc(collection(db, `groups/${groupId}/resources`), {
        ...newResource,
        createdBy: user.uid,
        createdAt: serverTimestamp()
      });
      setNewResource({ title: '', url: '', category: 'tool' });
      setIsAddingResource(false);
      toast.success('Resource anchored.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'group resources');
    }
  };

  const toggleGoalStatus = async (goalId: string, currentStatus: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, `groups/${groupId}/goals`, goalId), {
        status: currentStatus === 'completed' ? 'pending' : 'completed'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'group goals');
    }
  };

  const deleteItem = async (type: 'goals' | 'resources', id: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, `groups/${groupId}/${type}`, id));
      toast.success('Data redacted.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `group ${type}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 font-sans">
      {/* Mission Tracker */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-headline font-black uppercase italic tracking-tighter text-on-surface flex items-center gap-4">
            <Target className="w-8 h-8 text-primary" /> MISSION_TRACKER
          </h3>
          {isMember && (
            <button
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="liquid-btn text-[10px] px-4 py-2 font-black"
            >
              {isAddingGoal ? 'ABORT' : 'INITIATE_MISSION'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {isAddingGoal && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddGoal}
              className="bg-surface border-2 border-on-surface p-6 shadow-brutal space-y-4"
            >
              <input
                type="text"
                placeholder="MISSION_TITLE"
                value={newGoal.title}
                onChange={e => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                className="w-full text-lg font-bold italic"
                required
              />
              <textarea
                placeholder="MISSION_OBJECTIVES"
                value={newGoal.description}
                onChange={e => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                className="w-full text-sm font-bold italic h-24"
              />
              <button type="submit" className="liquid-btn w-full py-3 text-xs font-black">DEPLOY_MISSION</button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-outline/15 shadow-brutal bg-surface-container-lowest/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant italic">NO_MISSIONS_IDENTIFIED.</p>
            </div>
          ) : (
            goals.map((goal) => (
              <div key={goal.id} className="bg-surface-container-lowest border-2 border-on-surface p-6 shadow-brutal group relative">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleGoalStatus(goal.id, goal.status)}
                    disabled={!isAdmin}
                    className={cn(
                      "mt-1 p-1 border-2 border-on-surface shadow-brutal transition-all",
                      goal.status === 'completed' ? "bg-primary text-on-surface" : "bg-surface text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    {goal.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn("text-xl font-headline font-black uppercase italic tracking-tighter mb-1", goal.status === 'completed' && "line-through text-on-surface-variant")}>
                      {goal.title}
                    </h4>
                    <p className="text-xs font-bold text-on-surface-variant italic">{goal.description}</p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => deleteItem('goals', goal.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-accent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resource Vault */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl font-headline font-black uppercase italic tracking-tighter text-on-surface flex items-center gap-4">
            <Zap className="w-8 h-8 text-secondary" /> RESOURCE_VAULT
          </h3>
          {isMember && (
            <button
              onClick={() => setIsAddingResource(!isAddingResource)}
              className="liquid-btn text-[10px] px-4 py-2 font-black"
            >
              {isAddingResource ? 'ABORT' : 'ANCHOR_RESOURCE'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {isAddingResource && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddResource}
              className="bg-surface border-2 border-on-surface p-6 shadow-brutal space-y-4"
            >
              <input
                type="text"
                placeholder="RESOURCE_NAME"
                value={newResource.title}
                onChange={e => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                className="w-full text-lg font-bold italic"
                required
              />
              <input
                type="url"
                placeholder="https://..."
                value={newResource.url}
                onChange={e => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                className="w-full text-sm font-bold italic"
                required
              />
              <select
                value={newResource.category}
                onChange={e => setNewResource(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full text-xs font-black uppercase italic"
              >
                <option value="tool">TOOL</option>
                <option value="article">ARTICLE</option>
                <option value="template">TEMPLATE</option>
                <option value="other">OTHER</option>
              </select>
              <button type="submit" className="liquid-btn w-full py-3 text-xs font-black">ANCHOR_DATA</button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {resources.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-outline/15 shadow-brutal bg-surface-container-lowest/30">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant italic">NO_RESOURCES_SECURED.</p>
            </div>
          ) : (
            resources.map((res) => (
              <div key={res.id} className="bg-surface-container-lowest border-2 border-on-surface p-6 shadow-brutal group relative flex items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2 bg-secondary/10 border-2 border-on-surface shadow-brutal">
                    <LinkIcon className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-headline font-black uppercase italic tracking-tighter truncate text-on-surface">{res.title}</h4>
                    <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-secondary" /> {res.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-on-surface text-surface border-2 border-on-surface shadow-brutal hover:shadow-none transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => deleteItem('resources', res.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-accent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
