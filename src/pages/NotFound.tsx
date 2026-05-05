import React from 'react';
import { Link } from 'react-router';
import { Ghost, ArrowLeft, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mb-12"
      >
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
        <Ghost className="w-48 h-48 text-on-surface relative z-10" />
        <div className="absolute -top-4 -right-4 bg-accent p-3 border-4 border-on-surface shadow-brutal rotate-12">
          <Zap className="w-8 h-8 text-on-accent" />
        </div>
      </motion.div>

      <h1 className="text-6xl md:text-8xl font-headline font-black uppercase italic tracking-tighter text-on-surface mb-6 drop-shadow-kinetic">
        404_VOID_REACHED
      </h1>
      
      <p className="text-xl md:text-2xl font-bold uppercase italic text-on-surface-variant max-w-xl mb-12 tracking-tight">
        You have drifted into an unmapped node of the stream. 
        <span className="text-primary italic"> Reality has collapsed here.</span>
      </p>

      <Link 
        to="/feed" 
        className="liquid-btn py-6 px-12 text-2xl flex items-center gap-4 group"
      >
        <ArrowLeft className="w-8 h-8 group-hover:-translate-x-2 transition-transform" /> 
        RE-ENTER_SIGNAL
      </Link>
    </div>
  );
}
