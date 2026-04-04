import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Cpu, MessageSquare, Send, Bot, User, Sparkles, Brain, TrendingUp, DollarSign, Shield, Settings, Code, Palette, Target, HeartHandshake, Users, ChevronRight, Search, Bookmark, BookmarkCheck, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: any;
  color: string;
  prompt: string;
}

const AGENTS: Agent[] = [
  {
    id: 'strategist',
    name: 'Sarah',
    role: 'Business Strategist',
    description: 'High-level planning, growth strategies, and market positioning.',
    icon: Brain,
    color: 'bg-blue-500',
    prompt: 'You are Sarah, a world-class Business Strategist for solo founders. Your goal is to help them build sustainable, scalable businesses through strategic planning and market analysis.'
  },
  {
    id: 'marketing',
    name: 'Marcus',
    role: 'Marketing Specialist',
    description: 'Branding, social media, advertising, and content strategy.',
    icon: Target,
    color: 'bg-pink-500',
    prompt: 'You are Marcus, a creative Marketing Specialist. You help solopreneurs build strong brands and reach their target audience effectively through data-driven marketing.'
  },
  {
    id: 'finance',
    name: 'Felix',
    role: 'Financial Advisor',
    description: 'Budgeting, forecasting, taxes, and financial health.',
    icon: DollarSign,
    color: 'bg-green-500',
    prompt: 'You are Felix, a meticulous Financial Advisor. You provide clear, actionable financial advice for solo business owners to ensure long-term profitability.'
  },
  {
    id: 'legal',
    name: 'Laura',
    role: 'Legal Consultant',
    description: 'Contracts, compliance, IP, and risk management.',
    icon: Shield,
    color: 'bg-amber-500',
    prompt: 'You are Laura, an expert Legal Consultant. You help solopreneurs navigate the legal complexities of business, from contracts to intellectual property.'
  },
  {
    id: 'ops',
    name: 'Oliver',
    role: 'Operations Manager',
    description: 'Efficiency, workflows, tool selection, and automation.',
    icon: Settings,
    color: 'bg-zinc-500',
    prompt: 'You are Oliver, an efficient Operations Manager. Your focus is on optimizing workflows and selecting the right tools to help solo founders do more with less.'
  },
  {
    id: 'tech',
    name: 'Toby',
    role: 'Tech Architect',
    description: 'Software development, infrastructure, and technical strategy.',
    icon: Code,
    color: 'bg-indigo-500',
    prompt: 'You are Toby, a visionary Tech Architect. You provide technical guidance and architecture advice for building robust digital products.'
  },
  {
    id: 'creative',
    name: 'Chloe',
    role: 'Creative Director',
    description: 'Design, visuals, user experience, and aesthetic direction.',
    icon: Palette,
    color: 'bg-purple-500',
    prompt: 'You are Chloe, an inspired Creative Director. You help solopreneurs create beautiful, user-centric designs that resonate with their audience.'
  },
  {
    id: 'sales',
    name: 'Sam',
    role: 'Sales Coach',
    description: 'Pitching, closing, lead generation, and customer acquisition.',
    icon: TrendingUp,
    color: 'bg-orange-500',
    prompt: 'You are Sam, a high-energy Sales Coach. You teach solo founders how to pitch effectively, overcome objections, and close more deals.'
  },
  {
    id: 'success',
    name: 'Sienna',
    role: 'Customer Success',
    description: 'Retention, support, feedback loops, and community building.',
    icon: HeartHandshake,
    color: 'bg-teal-500',
    prompt: 'You are Sienna, a dedicated Customer Success expert. You help solopreneurs build lasting relationships with their customers and foster community.'
  },
  {
    id: 'hr',
    name: 'Harper',
    role: 'HR Advisor',
    description: 'Hiring, culture, team management, and outsourcing.',
    icon: Users,
    color: 'bg-rose-500',
    prompt: 'You are Harper, an empathetic HR Advisor. You guide solo founders on how to hire their first employees or manage freelancers effectively.'
  }
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Insight {
  id: string;
  agentId: string;
  agentName: string;
  content: string;
  createdAt: any;
}

export function SoloSuccessAI() {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedInsights, setSavedInsights] = useState<Insight[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'insights'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const insights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Insight));
      setSavedInsights(insights);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'insights');
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveInsight = async (content: string) => {
    if (!user || !selectedAgent) return;
    
    const isAlreadySaved = savedInsights.some(i => i.content === content);
    if (isAlreadySaved) {
      toast.error('Insight already saved');
      return;
    }

    const toastId = toast.loading('Saving insight...');
    try {
      await addDoc(collection(db, 'insights'), {
        userId: user.uid,
        agentId: selectedAgent.id,
        agentName: selectedAgent.name,
        content,
        createdAt: serverTimestamp(),
      });
      toast.success('Insight saved!', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'insights');
      toast.error('Failed to save insight', { id: toastId });
    }
  };

  const handleDeleteInsight = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'insights', id));
      toast.success('Insight removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'insights');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedAgent || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: input.trim() }] }
        ],
        config: {
          systemInstruction: selectedAgent.prompt,
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        },
      });

      const text = response.text;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      toast.error('Failed to get response from agent.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-10">
      {/* Agent Sidebar */}
      <div className="lg:w-96 flex flex-col gap-6 overflow-hidden">
        <div className="bg-neon-pink p-8 border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] -rotate-1">
          <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter flex items-center gap-3">
            <Cpu className="w-8 h-8 text-black stroke-[3px]" /> SoloSuccess AI
          </h1>
          <p className="text-sm font-bold text-black/70 mt-2 bg-white/50 px-3 py-1 border-2 border-black inline-block">Your team of 10 expert AI agents.</p>
          <button 
            onClick={() => setShowInsights(true)}
            className="w-full mt-6 flex items-center justify-center gap-3 bg-neon-yellow text-black py-3 border-4 border-black font-black uppercase italic text-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
          >
            <Bookmark className="w-5 h-5 stroke-[3px]" /> Saved Insights ({savedInsights.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
          {AGENTS.map((agent, index) => (
            <button
              key={agent.id}
              onClick={() => {
                setSelectedAgent(agent);
                setMessages([]);
              }}
              className={cn(
                "w-full flex items-center gap-5 p-5 border-8 border-black transition-all text-left group relative overflow-hidden",
                selectedAgent?.id === agent.id 
                  ? "bg-neon-blue shadow-none translate-x-1 translate-y-1" 
                  : "bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1",
                index % 2 === 0 ? "rotate-1" : "-rotate-1"
              )}
            >
              <div className={cn(
                "p-3 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors",
                selectedAgent?.id === agent.id ? "bg-white text-black" : agent.color + " text-white"
              )}>
                <agent.icon className="w-6 h-6 stroke-[3px]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xl font-black uppercase italic tracking-tight truncate",
                  selectedAgent?.id === agent.id ? "text-black" : "text-black"
                )}>{agent.name}</p>
                <p className={cn(
                  "text-xs font-bold uppercase tracking-widest truncate",
                  selectedAgent?.id === agent.id ? "text-black/60" : "text-black/50"
                )}>{agent.role}</p>
              </div>
              <ChevronRight className={cn(
                "w-6 h-6 transition-transform stroke-[4px]",
                selectedAgent?.id === agent.id ? "translate-x-2" : "opacity-0 group-hover:opacity-100"
              )} />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white border-[10px] border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative">
        {selectedAgent ? (
          <>
            {/* Chat Header */}
            <div className="p-8 border-b-8 border-black flex items-center justify-between bg-neon-green/10">
              <div className="flex items-center gap-6">
                <div className={cn("p-4 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white", selectedAgent.color)}>
                  <selectedAgent.icon className="w-8 h-8 stroke-[3px]" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-black uppercase italic tracking-tighter">{selectedAgent.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-neon-green border-2 border-black rounded-full animate-pulse" />
                    <p className="text-sm font-bold uppercase tracking-widest text-black/60">{selectedAgent.role} • Online</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setMessages([])}
                className="px-4 py-2 bg-white border-4 border-black font-black uppercase italic text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                Clear Chat
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                  <div className={cn("p-8 border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-white mb-10 rotate-3", selectedAgent.color)}>
                    <selectedAgent.icon className="w-16 h-16 stroke-[3px]" />
                  </div>
                  <h3 className="text-4xl font-black text-black mb-4 uppercase italic tracking-tighter">Chat with {selectedAgent.name}</h3>
                  <p className="text-xl font-bold text-black/70 leading-tight mb-10 bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    {selectedAgent.description}
                  </p>
                  <div className="grid grid-cols-1 gap-4 w-full">
                    <button 
                      onClick={() => setInput("How can you help me grow my business?")}
                      className="text-sm font-black uppercase italic p-5 bg-neon-yellow border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-left"
                    >
                      "How can you help me grow my business?"
                    </button>
                    <button 
                      onClick={() => setInput("What's the first step I should take?")}
                      className="text-sm font-black uppercase italic p-5 bg-neon-blue border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-left"
                    >
                      "What's the first step I should take?"
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn(
                    "flex gap-6 max-w-[90%]",
                    m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                  )}>
                    <div className={cn(
                      "w-12 h-12 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center flex-shrink-0",
                      m.role === 'user' ? "bg-neon-pink" : selectedAgent.color + " text-white"
                    )}>
                      {m.role === 'user' ? <User className="w-6 h-6 stroke-[3px]" /> : <Bot className="w-6 h-6 stroke-[3px]" />}
                    </div>
                    <div className={cn(
                      "p-6 border-8 border-black text-lg leading-tight relative group/msg shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]",
                      m.role === 'user' ? "bg-black text-white -rotate-1" : "bg-white text-black rotate-1"
                    )}>
                      <div className={cn(
                        "prose prose-lg max-w-none font-bold",
                        m.role === 'user' ? "prose-invert" : "prose-zinc"
                      )}>
                        <Markdown>{m.content}</Markdown>
                      </div>
                      {m.role === 'assistant' && (
                        <button 
                          onClick={() => handleSaveInsight(m.content)}
                          className="absolute -right-16 top-0 p-3 bg-neon-yellow border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 opacity-0 group-hover/msg:opacity-100 transition-all"
                          title="Save as insight"
                        >
                          {savedInsights.some(i => i.content === m.content) ? (
                            <BookmarkCheck className="w-6 h-6 text-black stroke-[4px]" />
                          ) : (
                            <Bookmark className="w-6 h-6 text-black stroke-[3px]" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isGenerating && (
                <div className="flex gap-6 max-w-[90%]">
                  <div className={cn("w-12 h-12 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center flex-shrink-0", selectedAgent.color + " text-white")}>
                    <Bot className="w-6 h-6 stroke-[3px]" />
                  </div>
                  <div className="bg-white border-8 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex gap-2">
                    <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-3 h-3 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-8 border-t-8 border-black bg-neon-pink/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask ${selectedAgent.name} anything...`}
                  className="w-full bg-white border-8 border-black p-6 font-black text-xl focus:bg-neon-yellow/10 outline-none shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-2 focus:translate-y-2 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isGenerating}
                  className="absolute right-4 p-4 bg-neon-green text-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-50 transition-all"
                >
                  <Send className="w-8 h-8 stroke-[4px]" />
                </button>
              </div>
              <p className="text-xs font-black uppercase italic text-center text-black/40 mt-6">
                SoloSuccess AI can make mistakes. Check important info.
              </p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:30px_30px]">
            <div className="w-32 h-32 bg-neon-pink border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-10 rotate-6">
              <Cpu className="w-16 h-16 text-black stroke-[3px]" />
            </div>
            <h2 className="text-5xl font-black text-black mb-4 uppercase italic tracking-tighter">Select an Expert Agent</h2>
            <p className="text-2xl font-bold text-black/60 max-w-2xl mx-auto bg-white border-4 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] -rotate-1">
              Choose from our team of 10 specialized AI agents to get expert advice on any aspect of your solo business.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-16 w-full max-w-3xl">
              {AGENTS.slice(0, 6).map((a, i) => (
                <div key={a.id} className={cn(
                  "p-6 border-8 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all",
                  i % 2 === 0 ? "bg-white rotate-1" : "bg-white -rotate-1"
                )}>
                  <a.icon className={cn("w-10 h-10 mb-4 stroke-[3px]", a.color.replace('bg-', 'text-'))} />
                  <p className="text-sm font-black uppercase italic text-black">{a.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Saved Insights Modal */}
      <AnimatePresence>
        {showInsights && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
              className="bg-white border-[10px] border-black shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b-8 border-black bg-neon-yellow flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <Bookmark className="w-8 h-8 text-black stroke-[3px]" />
                  </div>
                  <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter">Saved Insights</h2>
                </div>
                <button 
                  onClick={() => setShowInsights(false)}
                  className="p-3 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                >
                  <X className="w-8 h-8 text-black stroke-[4px]" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-white">
                {savedInsights.length === 0 ? (
                  <div className="text-center py-20">
                    <Bookmark className="w-24 h-24 text-black/10 mx-auto mb-6 stroke-[3px]" />
                    <p className="text-2xl font-black uppercase italic text-black/30">No insights saved yet.</p>
                  </div>
                ) : (
                  savedInsights.map((insight, index) => (
                    <div key={insight.id} className={cn(
                      "p-8 border-8 border-black relative group shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]",
                      index % 2 === 0 ? "bg-white rotate-1" : "bg-white -rotate-1"
                    )}>
                      <div className="flex items-center gap-4 mb-6">
                        <span className="px-3 py-1 bg-neon-blue border-2 border-black font-black uppercase italic text-xs">From {insight.agentName}</span>
                        <span className="text-black/20 font-black">•</span>
                        <span className="font-black uppercase text-xs text-black/40">
                          {insight.createdAt?.toDate ? format(insight.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                        </span>
                      </div>
                      <div className="prose prose-lg max-w-none font-bold text-black">
                        <Markdown>{insight.content}</Markdown>
                      </div>
                      <button 
                        onClick={() => handleDeleteInsight(insight.id)}
                        className="absolute -top-4 -right-4 p-3 bg-red-500 text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-6 h-6 stroke-[3px]" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
