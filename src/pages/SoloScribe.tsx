import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { FileText, Lightbulb, Plus, Search, File, MoreVertical, Download, Trash2, Edit3, Wand2, Sparkles, X, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { cn } from '../lib/utils';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface Document {
  id: string;
  title: string;
  content: string;
  type: 'ideation' | 'document';
  createdAt: any;
  updatedAt: any;
}

export function SoloScribe() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newDocType, setNewDocType] = useState<'ideation' | 'document'>('document');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isCopying, setIsCopying] = useState(false);

  const templates = {
    ideation: [
      { title: 'Market Gap Analysis', prompt: 'Analyze the current market for [Your Niche] and identify 3 potential gaps or underserved segments for a solo founder.' },
      { title: 'Product-Market Fit Check', prompt: 'I have an idea for [Your Idea]. Evaluate its potential product-market fit and suggest 3 ways to validate it with minimal budget.' },
      { title: 'Revenue Stream Brainstorm', prompt: 'Brainstorm 5 different revenue models for a solo business in the [Your Industry] space.' },
    ],
    document: [
      { title: 'Executive Summary', prompt: 'Write a compelling executive summary for a solo business offering [Your Service/Product].' },
      { title: 'Client Proposal Template', prompt: 'Create a professional project proposal template for a [Your Service] project, including scope, timeline, and pricing sections.' },
      { title: 'Terms of Service', prompt: 'Draft a basic Terms of Service agreement for a solo-run SaaS or service business in [Your Region].' },
    ]
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'documents'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
      setDocuments(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'documents');
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
          systemInstruction: newDocType === 'ideation' 
            ? "You are an expert business ideation assistant. Help the user brainstorm ideas, refine concepts, and identify opportunities for their solo business."
            : "You are a professional business document generator. Create high-quality, structured documents like business plans, proposals, contracts, or internal guides.",
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
        },
      });

      const text = response.text;
      setGeneratedContent(text);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !generatedContent || !docTitle) return;
    const toastId = toast.loading('Saving document...');
    try {
      await addDoc(collection(db, 'documents'), {
        userId: user.uid,
        title: docTitle,
        content: generatedContent,
        type: newDocType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Document saved!', { id: toastId });
      setIsCreating(false);
      setGeneratedContent('');
      setDocTitle('');
      setPrompt('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
      toast.error('Failed to save document.', { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDoc(doc(db, 'documents', id));
      toast.success('Document deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopying(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setIsCopying(false), 2000);
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-neon-pink p-10 border-[10px] border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] -rotate-1">
        <div>
          <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic">SoloScribe</h1>
          <p className="text-black font-bold mt-2 text-xl bg-white/50 px-4 py-1 border-4 border-black inline-block">AI-powered ideation & document generation.</p>
        </div>
        <div className="flex flex-wrap gap-5">
          <button 
            onClick={() => {
              setNewDocType('ideation');
              setIsCreating(true);
            }}
            className="flex items-center gap-3 bg-neon-yellow text-black px-8 py-4 border-8 border-black font-black uppercase italic text-lg hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1"
          >
            <Lightbulb className="w-6 h-6 stroke-[3px]" />
            New Idea
          </button>
          <button 
            onClick={() => {
              setNewDocType('document');
              setIsCreating(true);
            }}
            className="flex items-center gap-3 bg-neon-blue text-black px-8 py-4 border-8 border-black font-black uppercase italic text-lg hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1"
          >
            <Plus className="w-6 h-6 stroke-[3px]" />
            New Doc
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <div className="w-20 h-20 border-[10px] border-black border-t-neon-green rounded-full animate-spin shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]" />
          </div>
        ) : documents.length > 0 ? (
          documents.map((doc, index) => (
            <motion.div 
              key={doc.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-8 border-8 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all group relative overflow-hidden",
                index % 3 === 0 ? "bg-white rotate-1" : index % 3 === 1 ? "bg-white -rotate-1" : "bg-white rotate-2"
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                  doc.type === 'ideation' ? "bg-neon-yellow text-black" : "bg-neon-blue text-black"
                )}>
                  {doc.type === 'ideation' ? <Lightbulb className="w-6 h-6 stroke-[3px]" /> : <FileText className="w-6 h-6 stroke-[3px]" />}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedDoc(doc)}
                    className="p-3 bg-neon-green border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <Search className="w-5 h-5 stroke-[3px]" />
                  </button>
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-3 bg-red-500 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <Trash2 className="w-5 h-5 stroke-[3px]" />
                  </button>
                </div>
              </div>
              <h3 className="text-2xl font-black text-black mb-3 uppercase italic line-clamp-1">{doc.title}</h3>
              <p className="font-bold text-black/70 line-clamp-3 mb-6 leading-tight">{doc.content}</p>
              <div className="flex items-center justify-between pt-4 border-t-4 border-black">
                <span className="font-black uppercase text-sm">{doc.updatedAt?.toDate ? format(doc.updatedAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                <span className={cn(
                  "px-3 py-1 border-2 border-black font-black uppercase text-xs",
                  doc.type === 'ideation' ? "bg-neon-yellow" : "bg-neon-blue"
                )}>{doc.type}</span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-32 bg-white border-8 border-dashed border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] rotate-1">
            <File className="w-24 h-24 text-black/20 mx-auto mb-6 stroke-[3px]" />
            <h3 className="text-4xl font-black text-black mb-4 uppercase italic">No documents yet</h3>
            <p className="text-xl font-bold text-black/60 mb-10 max-w-md mx-auto">Start generating ideas or professional documents with AI.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="bg-neon-green text-black px-10 py-5 border-8 border-black font-black uppercase italic text-2xl hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
            >
              Create Your First Doc
            </button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 2 }}
              className="bg-white border-[10px] border-black shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className={cn(
                "p-8 border-b-8 border-black flex items-center justify-between",
                newDocType === 'ideation' ? "bg-neon-yellow" : "bg-neon-blue"
              )}>
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    {newDocType === 'ideation' ? <Lightbulb className="w-8 h-8 text-black stroke-[3px]" /> : <FileText className="w-8 h-8 text-black stroke-[3px]" />}
                  </div>
                  <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter">
                    {newDocType === 'ideation' ? 'Idea Forge' : 'Doc Architect'}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsCreating(false)}
                  className="p-3 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                >
                  <X className="w-8 h-8 text-black stroke-[4px]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 flex flex-col lg:flex-row gap-10 bg-white">
                <div className="lg:w-1/3 space-y-8">
                  <div>
                    <label className="block text-xl font-black text-black uppercase italic mb-3">Document Title</label>
                    <input 
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="e.g., Q2 Marketing Strategy"
                      className="w-full bg-white border-8 border-black p-4 font-bold text-xl focus:bg-neon-yellow/10 outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xl font-black text-black uppercase italic mb-3">
                      {newDocType === 'ideation' ? 'Brainstorm Focus' : 'Document Type'}
                    </label>
                    <div className="flex flex-wrap gap-3 mb-6">
                      {templates[newDocType].map((template, i) => (
                        <button
                          key={i}
                          onClick={() => setPrompt(template.prompt)}
                          className="px-4 py-2 bg-white border-4 border-black font-black uppercase italic text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neon-pink"
                        >
                          {template.title}
                        </button>
                      ))}
                    </div>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={newDocType === 'ideation' ? "Describe your business idea or the problem you're solving..." : "e.g., Professional service agreement for a freelance designer..."}
                      className="w-full bg-white border-8 border-black p-5 font-bold text-lg min-h-[250px] focus:bg-neon-blue/10 outline-none resize-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:shadow-none focus:translate-x-1 focus:translate-y-1 transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full flex items-center justify-center gap-4 bg-neon-green text-black py-6 border-8 border-black font-black uppercase italic text-2xl hover:shadow-none hover:translate-x-2 hover:translate-y-2 disabled:opacity-50 transition-all shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {isGenerating ? (
                      <div className="w-8 h-8 border-[6px] border-black border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Wand2 className="w-8 h-8 stroke-[3px]" /> Ignite AI</>
                    )}
                  </button>
                </div>

                <div className="lg:w-2/3 bg-black/5 border-8 border-black p-10 min-h-[500px] relative shadow-[inset_8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                  {generatedContent ? (
                    <div className="prose prose-xl prose-zinc max-w-none font-bold text-black">
                      <Markdown>{generatedContent}</Markdown>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-black/20 p-12 text-center">
                      <Sparkles className="w-32 h-32 mb-6 opacity-10 animate-pulse" />
                      <p className="text-2xl font-black uppercase italic">AI Output Awaits Your Command</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 border-t-8 border-black flex flex-col sm:flex-row items-center justify-end gap-6 bg-white">
                {generatedContent && (
                  <>
                    <button 
                      onClick={() => copyToClipboard(generatedContent)}
                      className="flex items-center gap-3 px-8 py-4 bg-white border-8 border-black font-black uppercase italic text-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all hover:bg-neon-pink"
                    >
                      {isCopying ? <Check className="w-6 h-6 stroke-[4px]" /> : <Copy className="w-6 h-6 stroke-[3px]" />}
                      {isCopying ? 'Copied!' : 'Copy Text'}
                    </button>
                    <button 
                      onClick={handleSave}
                      disabled={!docTitle}
                      className="bg-neon-blue text-black px-10 py-4 border-8 border-black font-black uppercase italic text-xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2 disabled:opacity-50 transition-all"
                    >
                      Save to Archives
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: -2 }}
              className="bg-white border-[10px] border-black shadow-[30px_30px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b-8 border-black bg-neon-pink flex items-center justify-between">
                <h2 className="text-4xl font-black text-black uppercase italic tracking-tighter">{selectedDoc.title}</h2>
                <div className="flex gap-4">
                  <button 
                    onClick={() => copyToClipboard(selectedDoc.content)}
                    className="p-3 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <Copy className="w-8 h-8 text-black stroke-[3px]" />
                  </button>
                  <button 
                    onClick={() => setSelectedDoc(null)}
                    className="p-3 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                  >
                    <X className="w-8 h-8 text-black stroke-[4px]" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-12 bg-white">
                <div className="prose prose-2xl prose-zinc max-w-none font-bold text-black">
                  <Markdown>{selectedDoc.content}</Markdown>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
