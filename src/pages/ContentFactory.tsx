import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Factory, Instagram, Twitter, Linkedin, Facebook, Youtube, Calendar, Sparkles, Wand2, Image as ImageIcon, Send, Copy, Check, MoreVertical, Trash2, Edit3, Plus, Search, Filter, X, ExternalLink, Eye, Heart, MessageCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ContentItem {
  id: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'youtube';
  content: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: any;
  createdAt: any;
  updatedAt: any;
}

const PLATFORMS = [
  { id: 'instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
  { id: 'twitter', icon: Twitter, color: 'text-blue-400', bg: 'bg-blue-50' },
  { id: 'linkedin', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50' },
  { id: 'facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'youtube', icon: Youtube, color: 'text-red-600', bg: 'bg-red-50' },
];

export function ContentFactory() {
  const { user } = useAuth();
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'youtube'>('instagram');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'scheduled' | 'published'>('all');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  const templates = {
    instagram: [
      { title: 'Educational Carousel', prompt: 'Create a 5-slide educational carousel script about [Topic]. Include a hook for the first slide and a CTA for the last.' },
      { title: 'Behind the Scenes', prompt: 'Write a relatable caption for a behind-the-scenes photo of a solo founder working on [Project].' },
    ],
    twitter: [
      { title: 'Value Thread', prompt: 'Write a 5-tweet thread sharing actionable tips about [Topic] for other solopreneurs.' },
      { title: 'Hot Take', prompt: 'Create a thought-provoking "hot take" about [Industry Trend] that encourages engagement.' },
    ],
    linkedin: [
      { title: 'Professional Milestone', prompt: 'Write a professional yet personal post about reaching [Milestone] in my solo business journey.' },
      { title: 'Industry Insight', prompt: 'Share a deep insight about [Industry Topic] and how it affects small business owners.' },
    ],
    facebook: [
      { title: 'Community Question', prompt: 'Draft an engaging question to ask my community group about their biggest challenges with [Topic].' },
      { title: 'Event Announcement', prompt: 'Create an exciting announcement for an upcoming webinar or live session about [Topic].' },
    ],
    youtube: [
      { title: 'Video Script Outline', prompt: 'Create a detailed script outline for a 10-minute video titled "[Title]". Include intro, 3 main points, and outro.' },
      { title: 'SEO Description', prompt: 'Write a keyword-rich description for a YouTube video about [Topic], including timestamps and links.' },
    ]
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'content'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
      setContentItems(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'content');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: `You are an expert social media content creator. Create a high-engaging ${selectedPlatform} post based on the user's prompt. Include relevant hashtags and emojis.`,
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
        },
      });

      const text = response.text;
      setGeneratedContent(text);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (status: 'draft' | 'scheduled' = 'draft') => {
    if (!user || !generatedContent) return;
    const toastId = toast.loading('Saving content...');
    try {
      await addDoc(collection(db, 'content'), {
        userId: user.uid,
        platform: selectedPlatform,
        content: generatedContent,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success(`Content saved as ${status}!`, { id: toastId });
      setIsCreating(false);
      setGeneratedContent('');
      setPrompt('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'content');
      toast.error('Failed to save content.', { id: toastId });
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'DELETE_CONTENT',
      message: 'ARE_YOU_SURE_YOU_WANT_TO_WIPE_THIS_DATA_STREAM_FROM_THE_FACTORY?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'content', id));
          toast.success('Content deleted');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'content');
        }
      }
    });
  };

  const handleCopy = async (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const filteredItems = contentItems.filter(item => {
    if (activeTab === 'all') return true;
    return item.status === activeTab;
  });

  return (
    <div className="space-y-16 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 bg-secondary border-[12px] border-on-surface p-12 lg:p-20 shadow-kinetic -rotate-1">
        <div className="space-y-4">
          <h1 className="text-6xl lg:text-8xl font-black text-white uppercase italic leading-none tracking-tighter drop-shadow-[6px_6px_0px_#000000]">CONTENT FACTORY</h1>
          <p className="text-2xl font-black uppercase italic tracking-widest text-white/80 leading-tight">AUTOMATE YOUR SOCIAL MEDIA PRESENCE WITH AI-POWERED CREATION.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="kinetic-btn bg-accent text-black px-12 py-6 text-3xl flex items-center justify-center gap-4 rotate-2"
        >
          <Plus className="w-10 h-10 stroke-[4px]" /> CREATE CONTENT
        </button>
      </div>

      {/* Stats / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        {[
          { label: 'TOTAL POSTS', value: contentItems.length, icon: Factory, color: 'bg-secondary', textColor: 'text-white' },
          { label: 'DRAFTS', value: contentItems.filter(i => i.status === 'draft').length, icon: Edit3, color: 'bg-primary', textColor: 'text-black' },
          { label: 'SCHEDULED', value: contentItems.filter(i => i.status === 'scheduled').length, icon: Calendar, color: 'bg-accent', textColor: 'text-black' },
          { label: 'PUBLISHED', value: contentItems.filter(i => i.status === 'published').length, icon: Check, color: 'bg-primary', textColor: 'text-black' },
        ].map((stat, i) => (
          <div key={i} className={cn(
            "bg-surface-container border-8 border-on-surface p-10 shadow-kinetic-sm transition-all",
            i % 2 === 0 ? "rotate-1" : "-rotate-1"
          )}>
            <div className="flex items-center justify-between mb-8">
              <div className={cn("w-16 h-16 border-4 border-on-surface shadow-kinetic-thud flex items-center justify-center", stat.color, stat.textColor)}>
                <stat.icon className="w-8 h-8 stroke-[3px]" />
              </div>
              <span className="text-5xl font-black text-on-surface uppercase italic tracking-tighter">{stat.value}</span>
            </div>
            <p className="text-sm font-black uppercase italic tracking-widest text-on-surface/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Content List */}
      <div className="bg-surface-container border-[12px] border-on-surface shadow-kinetic overflow-hidden">
        <div className="p-10 border-b-[10px] border-on-surface flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-secondary/10">
          <div className="flex flex-wrap gap-6">
            {['all', 'drafts', 'scheduled', 'published'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "border-4 border-on-surface px-8 py-3 font-black uppercase italic text-lg tracking-widest shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all",
                  activeTab === tab ? "bg-secondary text-white" : "bg-surface-bg text-on-surface"
                )}
              >
                <span className="capitalize">{tab}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-on-surface stroke-[3px]" />
              <input 
                type="text" 
                placeholder="SEARCH CONTENT..."
                className="w-full pl-16 pr-6 py-4 bg-surface-bg border-8 border-on-surface font-black uppercase italic text-xl shadow-kinetic-thud focus:shadow-none focus:bg-secondary/10 transition-all outline-none"
              />
            </div>
            <button className="p-4 bg-surface-bg border-8 border-on-surface shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
              <Filter className="w-8 h-8 text-on-surface stroke-[3px]" />
            </button>
          </div>
        </div>

        <div className="divide-y-[8px] divide-on-surface">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-12 h-40 animate-pulse bg-on-surface/5" />
            ))
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const platform = PLATFORMS.find(p => p.id === item.platform);
              const PlatformIcon = platform?.icon || Instagram;
              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "p-12 hover:bg-secondary/5 transition-colors group cursor-pointer",
                    index % 2 === 0 ? "bg-surface-bg" : "bg-surface-container"
                  )} 
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex flex-col lg:flex-row items-start gap-12">
                    <div className={cn(
                      "w-24 h-24 border-8 border-on-surface shadow-kinetic-sm flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform",
                      item.platform === 'instagram' ? "bg-secondary text-white" :
                      item.platform === 'twitter' ? "bg-accent text-black" :
                      item.platform === 'linkedin' ? "bg-primary text-black" :
                      item.platform === 'facebook' ? "bg-primary text-black" : "bg-secondary text-white"
                    )}>
                      <PlatformIcon className="w-12 h-12 stroke-[3px]" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <span className="text-4xl font-black text-on-surface uppercase italic tracking-tighter leading-none">{item.platform} POST</span>
                          <span className={cn(
                            "border-4 border-on-surface px-4 py-1 text-xs font-black uppercase italic shadow-kinetic-thud",
                            item.status === 'published' ? "bg-primary text-black" :
                            item.status === 'scheduled' ? "bg-accent text-black" : "bg-secondary text-white"
                          )}>
                            {item.status}
                          </span>
                        </div>
                        <span className="text-sm font-black uppercase italic tracking-widest text-on-surface/40">
                          {item.createdAt?.toDate ? format(item.createdAt.toDate(), 'MMM d, h:mm a') : 'RECENTLY'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-on-surface italic line-clamp-2 leading-tight">"{item.content}"</p>
                      <div className="flex items-center gap-8 pt-6">
                        <button className="text-sm font-black uppercase italic tracking-widest text-on-surface/60 hover:text-secondary flex items-center gap-3 transition-colors">
                          <Eye className="w-6 h-6 stroke-[3px]" /> PREVIEW
                        </button>
                        <button 
                          onClick={(e) => handleCopy(item.content, e)}
                          className="text-sm font-black uppercase italic tracking-widest text-on-surface/60 hover:text-secondary flex items-center gap-3 transition-colors"
                        >
                          <Copy className="w-6 h-6 stroke-[3px]" /> COPY
                        </button>
                        <button 
                          onClick={(e) => handleDelete(item.id, e)}
                          className="text-sm font-black uppercase italic tracking-widest text-secondary hover:text-secondary/80 flex items-center gap-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-6 h-6 stroke-[3px]" /> DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-32 text-center space-y-12">
              <div className="w-32 h-32 bg-on-surface border-8 border-on-surface shadow-kinetic-sm flex items-center justify-center mx-auto rotate-12">
                <Factory className="w-16 h-16 text-secondary stroke-[3px]" />
              </div>
              <div className="space-y-4">
                <p className="text-4xl font-black text-on-surface uppercase italic tracking-tighter">NO CONTENT FOUND</p>
                <p className="text-xl font-black uppercase italic tracking-widest text-on-surface/40">THE FACTORY IS IDLE. START THE MACHINES!</p>
              </div>
              <button 
                onClick={() => setIsCreating(true)}
                className="kinetic-btn bg-primary text-black px-12 py-6 text-3xl"
              >
                CREATE YOUR FIRST POST
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-surface-bg border-[16px] border-on-surface w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col shadow-kinetic-active"
            >
              <div className="p-10 border-b-[12px] border-on-surface flex items-center justify-between bg-secondary">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 bg-on-surface border-8 border-on-surface shadow-kinetic-sm flex items-center justify-center rotate-3">
                    <Factory className="w-10 h-10 text-surface-bg stroke-[3px]" />
                  </div>
                  <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none drop-shadow-[4px_4px_0px_#000000]">CONTENT GENERATOR</h2>
                </div>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="p-6 bg-surface-bg border-8 border-on-surface hover:bg-primary transition-all shadow-kinetic-thud active:shadow-none active:translate-x-2 active:translate-y-2"
                >
                  <X className="w-10 h-10 stroke-[4px]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 lg:p-20 flex flex-col lg:flex-row gap-20 bg-surface-bg">
                <div className="lg:w-1/3 space-y-12">
                  <div className="space-y-6">
                    <label className="block text-2xl font-black text-on-surface uppercase italic tracking-tighter">SELECT PLATFORM</label>
                    <div className="grid grid-cols-5 gap-4">
                      {PLATFORMS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPlatform(p.id as any)}
                          className={cn(
                            "w-full aspect-square border-8 border-on-surface transition-all flex items-center justify-center shadow-kinetic-thud",
                            selectedPlatform === p.id 
                              ? "bg-secondary text-white -translate-y-1 shadow-kinetic-sm" 
                              : "bg-surface-bg text-on-surface hover:bg-on-surface/5"
                          )}
                        >
                          <p.icon className="w-8 h-8 stroke-[3px]" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="block text-xl font-black text-on-surface uppercase italic tracking-widest">QUICK TEMPLATES</label>
                      <div className="flex flex-wrap gap-4">
                        {templates[selectedPlatform].map((template, i) => (
                          <button
                            key={i}
                            onClick={() => setPrompt(template.prompt)}
                            className="bg-surface-bg border-4 border-on-surface px-4 py-2 text-[10px] font-black uppercase italic tracking-widest shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                          >
                            {template.title}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-2xl font-black text-on-surface uppercase italic tracking-tighter">WHAT'S THE POST ABOUT?</label>
                      <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="E.G., A POST ABOUT THE LAUNCH OF MY NEW DIGITAL PRODUCT FOR DESIGNERS..."
                        className="w-full bg-surface-bg border-8 border-on-surface px-8 py-6 min-h-[250px] font-black uppercase italic text-xl shadow-kinetic-sm focus:shadow-none focus:bg-accent/10 transition-all outline-none resize-none"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="kinetic-btn w-full py-8 text-3xl flex items-center justify-center gap-6 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-10 h-10 animate-spin stroke-[4px]" />
                    ) : (
                      <><Wand2 className="w-10 h-10 stroke-[3px]" /> GENERATE CONTENT</>
                    )}
                  </button>
                </div>

                <div className="lg:w-2/3 bg-accent/5 border-[10px] border-on-surface p-12 min-h-[500px] relative shadow-kinetic">
                  {generatedContent ? (
                    <div className="space-y-12">
                      <div className="bg-surface-bg p-12 border-8 border-on-surface shadow-kinetic-sm prose prose-invert max-w-none">
                        <div className="text-2xl font-bold text-on-surface italic leading-relaxed">
                          <Markdown>{generatedContent}</Markdown>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-8">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(generatedContent);
                            toast.success('COPIED TO CLIPBOARD!');
                          }}
                          className="flex items-center gap-4 bg-surface-bg border-8 border-on-surface px-8 py-4 font-black text-xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                        >
                          <Copy className="w-8 h-8 stroke-[3px]" /> COPY TEXT
                        </button>
                        <button className="flex items-center gap-4 bg-surface-bg border-8 border-on-surface px-8 py-4 font-black text-xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                          <ImageIcon className="w-8 h-8 stroke-[3px]" /> GENERATE IMAGE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface/20 p-16 text-center space-y-10">
                      <Sparkles className="w-32 h-32 opacity-20 stroke-[3px]" />
                      <div className="space-y-4">
                        <p className="text-4xl font-black uppercase italic tracking-tighter">YOUR MASTERPIECE AWAITS</p>
                        <p className="text-xl font-black uppercase italic tracking-widest">SELECT A PLATFORM AND DESCRIBE YOUR VISION TO BEGIN.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-10 border-t-[12px] border-on-surface flex flex-col sm:flex-row justify-end gap-8 bg-primary/10">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-10 py-4 text-2xl font-black text-on-surface uppercase italic hover:bg-on-surface/5 transition-colors"
                >
                  DISCARD
                </button>
                <button 
                  onClick={() => handleSave('draft')}
                  disabled={!generatedContent}
                  className="bg-surface-bg border-8 border-on-surface text-on-surface px-10 py-4 font-black text-2xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 transition-all"
                >
                  SAVE AS DRAFT
                </button>
                <button 
                  onClick={() => handleSave('scheduled')}
                  disabled={!generatedContent}
                  className="bg-on-surface border-8 border-on-surface text-surface-bg px-12 py-4 font-black text-2xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 transition-all"
                >
                  SCHEDULE POST
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Preview Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-surface-bg border-[16px] border-on-surface w-full max-w-3xl overflow-hidden flex flex-col shadow-kinetic-active"
            >
              <div className="p-10 border-b-[12px] border-on-surface flex items-center justify-between bg-accent">
                <div className="flex items-center gap-8">
                  <div className={cn(
                    "w-20 h-20 border-8 border-on-surface shadow-kinetic-sm flex items-center justify-center rotate-3",
                    selectedItem.platform === 'instagram' ? "bg-secondary text-white" :
                    selectedItem.platform === 'twitter' ? "bg-accent text-black" :
                    selectedItem.platform === 'linkedin' ? "bg-primary text-black" :
                    selectedItem.platform === 'facebook' ? "bg-primary text-black" : "bg-secondary text-white"
                  )}>
                    {React.createElement(PLATFORMS.find(p => p.id === selectedItem.platform)?.icon || Instagram, { className: "w-10 h-10 stroke-[3px]" })}
                  </div>
                  <h2 className="text-5xl font-black text-black uppercase italic tracking-tighter leading-none">{selectedItem.platform} PREVIEW</h2>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-6 bg-surface-bg border-8 border-on-surface hover:bg-secondary transition-all shadow-kinetic-thud active:shadow-none active:translate-x-2 active:translate-y-2"
                >
                  <X className="w-10 h-10 stroke-[4px]" />
                </button>
              </div>
              <div className="p-16 bg-primary/5 flex justify-center">
                <div className="w-full max-w-[400px] bg-surface-bg border-8 border-on-surface shadow-kinetic overflow-hidden rotate-1">
                  <div className="p-6 border-b-4 border-on-surface flex items-center gap-6">
                    <div className="w-12 h-12 bg-secondary border-4 border-on-surface shadow-kinetic-thud" />
                    <div className="space-y-2">
                      <div className="w-32 h-4 bg-on-surface" />
                      <div className="w-20 h-2 bg-on-surface/20" />
                    </div>
                  </div>
                  <div className="aspect-square bg-surface-container border-b-4 border-on-surface flex items-center justify-center">
                    <ImageIcon className="w-24 h-24 text-on-surface/10 stroke-[3px]" />
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="flex items-center gap-6">
                      <Heart className="w-8 h-8 text-on-surface stroke-[3px]" />
                      <MessageCircle className="w-8 h-8 text-on-surface stroke-[3px]" />
                      <Send className="w-8 h-8 text-on-surface stroke-[3px]" />
                    </div>
                    <div className="text-xl font-bold text-on-surface italic leading-tight">
                      <Markdown>{selectedItem.content}</Markdown>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-10 border-t-[12px] border-on-surface flex justify-end gap-8 bg-surface-bg">
                <button 
                  onClick={() => handleCopy(selectedItem.content)}
                  className="bg-surface-bg border-8 border-on-surface text-on-surface px-10 py-4 font-black text-2xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-4"
                >
                  <Copy className="w-8 h-8 stroke-[3px]" /> COPY CONTENT
                </button>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="bg-on-surface border-8 border-on-surface text-surface-bg px-12 py-4 font-black text-2xl uppercase italic shadow-kinetic-thud hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}

