import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Search as SearchIcon, Users, FileText, User, Ghost, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface SearchResult {
  id: string;
  type: 'user' | 'group' | 'post';
  title: string;
  subtitle: string;
  image?: string;
  link: string;
}

export function Search() {
  const [searchParams] = useSearchParams();
  const queryText = searchParams.get('q') || '';
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!queryText.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const searchResults: SearchResult[] = [];
        const normalizedQuery = queryText.toLowerCase();

        // 1. Search Users
        const usersQuery = query(collection(db, 'users'), limit(10));
        const usersSnap = await getDocs(usersQuery);
        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.displayName?.toLowerCase().includes(normalizedQuery) || data.bio?.toLowerCase().includes(normalizedQuery)) {
            searchResults.push({
              id: doc.id,
              type: 'user',
              title: data.displayName || 'Anonymous Founder',
              subtitle: data.bio || 'Solo Founder',
              image: data.photoURL,
              link: `/feed/profile/${doc.id}`
            });
          }
        });

        // 2. Search Groups
        const groupsQuery = query(collection(db, 'groups'), limit(10));
        const groupsSnap = await getDocs(groupsQuery);
        groupsSnap.forEach(doc => {
          const data = doc.data();
          if (data.name?.toLowerCase().includes(normalizedQuery) || data.description?.toLowerCase().includes(normalizedQuery)) {
            searchResults.push({
              id: doc.id,
              type: 'group',
              title: data.name,
              subtitle: data.description,
              link: `/feed/groups/${doc.id}`
            });
          }
        });

        // 3. Search Posts
        const postsQuery = query(collection(db, 'posts'), limit(10));
        const postsSnap = await getDocs(postsQuery);
        postsSnap.forEach(doc => {
          const data = doc.data();
          if (data.content?.toLowerCase().includes(normalizedQuery)) {
            searchResults.push({
              id: doc.id,
              type: 'post',
              title: 'Transmission',
              subtitle: data.content,
              link: `/feed`
            });
          }
        });

        setResults(searchResults);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'search');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [queryText]);

  return (
    <div className="space-y-12 font-sans">
      <div className="bg-primary p-10 border-[10px] border-on-surface shadow-kinetic -rotate-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rotate-12 translate-x-16 -translate-y-16"></div>
        <div className="relative z-10">
          <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic drop-shadow-[4px_4px_0px_#ffffff]">INTEL_SEARCH</h1>
          <p className="text-black font-bold mt-2 text-xl bg-white/50 px-4 py-1 border-4 border-black inline-block italic">
            {queryText ? `SCANNING_FOR: "${queryText}"` : "ENTER_QUERY_TO_SCAN_THE_VOID"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-20 h-20 border-[10px] border-on-surface border-t-secondary rounded-full animate-spin shadow-kinetic-thud" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {results.map((result, index) => (
              <motion.div
                key={`${result.type}-${result.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <Link 
                  to={result.link}
                  className="flex items-center gap-6 p-6 bg-surface-container border-8 border-on-surface shadow-kinetic hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all h-full"
                >
                  <div className="shrink-0">
                    {result.image ? (
                      <div className="w-16 h-16 border-4 border-on-surface shadow-kinetic-thud overflow-hidden">
                        <img src={result.image} alt={result.title} className="w-full h-full object-cover grayscale" />
                      </div>
                    ) : (
                      <div className={cn(
                        "w-16 h-16 border-4 border-on-surface shadow-kinetic-thud flex items-center justify-center",
                        result.type === 'user' ? "bg-accent" : result.type === 'group' ? "bg-secondary" : "bg-primary"
                      )}>
                        {result.type === 'user' ? <User className="w-8 h-8 text-black" /> : 
                         result.type === 'group' ? <Users className="w-8 h-8 text-black" /> : 
                         <FileText className="w-8 h-8 text-black" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[8px] font-black uppercase italic px-2 py-0.5 border-2 border-on-surface",
                        result.type === 'user' ? "bg-accent" : result.type === 'group' ? "bg-secondary" : "bg-primary"
                      )}>
                        {result.type}
                      </span>
                    </div>
                    <h3 className="text-xl font-black uppercase italic tracking-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                      {result.title}
                    </h3>
                    <p className="text-xs font-bold text-on-surface/60 line-clamp-2 italic leading-tight">
                      "{result.subtitle}"
                    </p>
                  </div>
                  <ArrowRight className="w-8 h-8 text-on-surface/20 group-hover:text-primary transition-colors" />
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : queryText ? (
        <div className="text-center py-32 bg-surface-bg border-8 border-dashed border-on-surface shadow-kinetic rotate-1">
          <Ghost className="w-24 h-24 text-on-surface/20 mx-auto mb-6 stroke-[3px]" />
          <h3 className="text-4xl font-black text-on-surface mb-4 uppercase italic drop-shadow-[4px_4px_0px_#ff00ff]">NO_INTEL_FOUND</h3>
          <p className="text-xl font-bold text-on-surface/60 italic">"THE_VOID_RETURNED_NOTHING_FOR_THIS_QUERY."</p>
        </div>
      ) : (
        <div className="text-center py-32 bg-surface-bg border-8 border-dashed border-on-surface shadow-kinetic">
          <SearchIcon className="w-24 h-24 text-on-surface/20 mx-auto mb-6 stroke-[3px]" />
          <h3 className="text-4xl font-black text-on-surface mb-4 uppercase italic drop-shadow-[4px_4px_0px_#00ffff]">READY_TO_SCAN</h3>
          <p className="text-xl font-bold text-on-surface/60 italic">"ENTER_A_QUERY_IN_THE_TERMINAL_ABOVE."</p>
        </div>
      )}

      {/* AI Suggestions */}
      {queryText && !loading && (
        <div className="bg-on-surface text-surface-bg p-10 border-[10px] border-on-surface shadow-kinetic rotate-1">
          <div className="flex items-center gap-4 mb-8">
            <Sparkles className="w-10 h-10 text-accent" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">AI_INTEL_SUGGESTIONS</h2>
          </div>
          <p className="text-lg font-bold italic leading-relaxed mb-8">
            "FOUNDER_MATCH_PROTOCOL: BASED_ON_YOUR_QUERY, YOU_MIGHT_BE_LOOKING_FOR_COLLABORATORS_IN_THE_TECH_SECTOR. TRY_SEARCHING_FOR_SPECIFIC_SKILLS_LIKE_REACT_OR_NODEJS."
          </p>
          <div className="flex flex-wrap gap-4">
            {['REACT', 'NODEJS', 'DESIGN', 'MARKETING', 'SAAS'].map(tag => (
              <Link 
                key={tag}
                to={`/search?q=${tag}`}
                className="bg-surface-bg text-on-surface border-4 border-on-surface px-6 py-2 font-black uppercase italic text-xs shadow-kinetic-thud hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                SCAN_{tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
