import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Users, Plus, Search, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AcademyGroup {
  id: string;
  name: string;
  description: string;
  courseName: string;
  memberCount: number;
  creatorId: string;
  createdAt: any;
}

export function AcademyGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<AcademyGroup[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newGroup, setNewGroup] = useState({ name: '', description: '', courseName: '' });

  useEffect(() => {
    const q = query(collection(db, 'academy_groups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AcademyGroup[];
      setGroups(groupsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'academy_groups');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'academy_groups'), {
        ...newGroup,
        creatorId: user.uid,
        memberCount: 1,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewGroup({ name: '', description: '', courseName: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'academy_groups');
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.courseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-neon-blue p-10 border-[10px] border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] -rotate-1">
        <div>
          <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic">Academy Groups</h1>
          <p className="text-black font-bold mt-2 text-xl bg-white/50 px-4 py-1 border-4 border-black inline-block">Find study peers from SoloSuccess Academy.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-3 bg-neon-yellow text-black px-8 py-4 border-8 border-black font-black uppercase italic text-lg hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1"
        >
          <Plus className="w-6 h-6 stroke-[3px]" />
          Create Group
        </button>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-black translate-x-2 translate-y-2" />
        <div className="relative flex items-center">
          <Search className="absolute left-6 w-8 h-8 text-black stroke-[3px]" />
          <input
            type="text"
            placeholder="Search by course or group name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-6 bg-white border-8 border-black font-black text-2xl uppercase italic focus:bg-neon-pink/10 outline-none transition-all"
          />
        </div>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="bg-white p-10 border-[10px] border-black shadow-[25px_25px_0px_0px_rgba(0,0,0,1)] space-y-8"
        >
          <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter">Start a new study group</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-xl font-black text-black uppercase italic mb-3">Group Name</label>
              <input
                type="text"
                required
                value={newGroup.name}
                onChange={e => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white border-8 border-black p-5 font-bold text-xl focus:bg-neon-yellow/10 outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
              />
            </div>
            <div>
              <label className="block text-xl font-black text-black uppercase italic mb-3">Academy Course</label>
              <input
                type="text"
                required
                placeholder="e.g. Solo Business 101"
                value={newGroup.courseName}
                onChange={e => setNewGroup(prev => ({ ...prev, courseName: e.target.value }))}
                className="w-full bg-white border-8 border-black p-5 font-bold text-xl focus:bg-neon-blue/10 outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xl font-black text-black uppercase italic mb-3">Description</label>
              <textarea
                required
                value={newGroup.description}
                onChange={e => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-white border-8 border-black p-5 font-bold text-xl min-h-[120px] focus:bg-neon-pink/10 outline-none resize-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-6">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-8 py-4 bg-white border-4 border-black font-black uppercase italic text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-neon-green text-black px-10 py-4 border-8 border-black font-black uppercase italic text-xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all"
              >
                Create Group
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {filteredGroups.map((group, index) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-10 border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden",
              index % 2 === 0 ? "bg-white rotate-1" : "bg-white -rotate-1"
            )}
          >
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 bg-neon-yellow border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-black group-hover:bg-neon-pink transition-colors">
                <GraduationCap className="w-8 h-8 stroke-[3px]" />
              </div>
              <div className="flex items-center gap-3 bg-black text-white px-4 py-2 border-2 border-black font-black uppercase italic text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Users className="w-5 h-5 stroke-[3px]" />
                {group.memberCount} members
              </div>
            </div>
            <h3 className="text-3xl font-black text-black mb-2 uppercase italic tracking-tighter">{group.name}</h3>
            <div className="flex items-center gap-2 bg-neon-blue/20 border-2 border-black px-3 py-1 font-black uppercase italic text-xs tracking-wider mb-6 inline-flex">
              <BookOpen className="w-4 h-4 stroke-[3px]" />
              {group.courseName}
            </div>
            <p className="text-xl font-bold text-black/70 line-clamp-2 mb-10 leading-tight">{group.description}</p>
            <button className="w-full bg-neon-green text-black py-5 border-8 border-black font-black uppercase italic text-2xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all">
              Join Study Group
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
