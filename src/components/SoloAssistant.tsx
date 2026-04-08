import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Minus, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { createChatSession } from '../services/geminiService';
import { GenerateContentResponse } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export function SoloAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "YO! I'M YOUR SOLOCONNECT WINGMAN. NEED A BRAIN BLAST OR A HYPE BOOST? SPILL IT!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const SUGGESTED_PROMPTS = [
    "How do I write a business plan?",
    "Tips for solo founder productivity",
    "How to grow my community?",
    "Help me draft a milestone post"
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    if (!chatRef.current) {
      chatRef.current = createChatSession(
        "You are SoloConnect Assistant, the ultimate AI wingman for legendary solo founders and indie hackers. " +
        "Your goal is to help them with documentation, content creation, business strategy, and community engagement. " +
        "Be bold, encouraging, and concise. Use markdown for formatting. Your vibe is neobrutalist, high-energy, and slightly chaotic but helpful."
      );
    }
  };

  const handleSend = async (e?: React.FormEvent, text?: string) => {
    if (e) e.preventDefault();
    const messageToSend = text || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage = messageToSend.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const result = await chatRef.current.sendMessage({ message: userMessage });
      const response: GenerateContentResponse = result;
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleOpen}
            className="bg-neon-pink text-white p-5 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all group relative"
          >
            <Sparkles className="w-8 h-8 group-hover:rotate-12 transition-transform" />
            <span className="absolute right-full mr-6 top-1/2 -translate-y-1/2 bg-white text-black px-4 py-2 border-4 border-black font-black uppercase italic text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              SUMMON AI WINGMAN
            </span>
          </motion.button>
        )}

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '80px' : '600px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 bg-white border-[8px] border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] w-80 md:w-[450px] overflow-hidden flex flex-col transition-all duration-500 z-50"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between shrink-0 border-b-[8px] border-black bg-neon-yellow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-black border-2 border-white flex items-center justify-center shadow-neo-sm rotate-6">
                  <Sparkles className="w-6 h-6 text-neon-green" />
                </div>
                <div>
                  <span className="font-display font-black text-black uppercase italic text-xl block leading-none tracking-tighter">SOLOCONNECT AI</span>
                  <span className="text-[10px] text-black/60 font-black uppercase tracking-widest animate-pulse">SYSTEM_ACTIVE_V2</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 bg-white border-2 border-black hover:bg-black hover:text-white transition-colors text-black shadow-neo-sm"
                >
                  {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 bg-white border-2 border-black hover:bg-neon-pink hover:text-white transition-colors text-black shadow-neo-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#131313] custom-scrollbar"
                >
                  {messages.map((msg, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={cn(
                          "max-w-[90%] p-5 border-4 border-black font-bold text-sm leading-relaxed shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
                          msg.role === 'user' 
                            ? 'bg-neon-blue text-black' 
                            : 'bg-white text-black'
                        )}
                      >
                        <div className="markdown-body prose prose-sm prose-zinc max-w-none">
                          <ReactMarkdown>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex gap-2 items-center">
                        <motion.div 
                          animate={{ y: [0, -10, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                          className="w-3 h-3 bg-neon-pink border-2 border-black" 
                        />
                        <motion.div 
                          animate={{ y: [0, -10, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                          className="w-3 h-3 bg-neon-green border-2 border-black" 
                        />
                        <motion.div 
                          animate={{ y: [0, -10, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                          className="w-3 h-3 bg-neon-blue border-2 border-black" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggested Prompts */}
                {messages.length === 1 && !isLoading && (
                  <div className="px-6 py-4 flex flex-wrap gap-3 bg-[#131313] border-t-4 border-black">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={async () => await handleSend(undefined, prompt)}
                        className="text-[10px] font-black uppercase italic tracking-wider bg-neon-green text-black px-4 py-2 border-2 border-black hover:bg-neon-pink hover:text-white transition-all shadow-neo-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="p-6 bg-neon-yellow border-t-[8px] border-black">
                  <form onSubmit={handleSend} className="relative group">
                    <div className="flex items-center bg-white border-[6px] border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="SPILL IT, FOUNDER..."
                        className="flex-1 bg-transparent border-none py-5 pl-6 pr-14 text-sm font-black uppercase italic text-black placeholder:text-black/40 focus:ring-0"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-3 p-3 bg-black text-white border-2 border-white disabled:opacity-50 transition-all hover:scale-110 active:scale-90 shadow-neo-sm"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
