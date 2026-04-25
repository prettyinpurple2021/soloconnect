import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Shield, Lock, Eye } from 'lucide-react';

export function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-bg font-sans p-8 md:p-20">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 bg-on-surface text-surface-bg px-6 py-3 border-4 border-on-surface shadow-kinetic-thud hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all mb-12 font-black uppercase italic"
      >
        <ArrowLeft className="w-6 h-6" /> BACK_TO_SAFETY
      </button>

      <div className="max-w-4xl mx-auto bg-surface-container border-8 border-on-surface p-10 md:p-20 shadow-kinetic relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary border-l-8 border-b-8 border-on-surface -rotate-12 translate-x-12 -translate-y-12"></div>
        
        <div className="flex items-center gap-6 mb-12">
          <div className="p-4 bg-secondary border-4 border-on-surface shadow-kinetic-thud">
            <Shield className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter text-on-surface drop-shadow-[4px_4px_0px_#00ffff]">Privacy Void</h1>
        </div>

        <div className="space-y-12 text-on-surface font-bold text-lg leading-relaxed italic">
          <section>
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-on-surface inline-block">01. DATA_COLLECTION</h2>
            <p>
              WE COLLECT WHAT YOU GIVE US. YOUR NAME, YOUR FACE (AVATAR), YOUR EMAIL, AND YOUR CHAOTIC BRAIN DUMPS. WE USE THIS TO IDENTIFY YOU IN SOLOCONNECT AND ENSURE YOUR ECHOES REACH THE RIGHT FOUNDERS.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-on-surface inline-block">02. COOKIE_PROTOCOL</h2>
            <p>
              WE USE BROWSER STORAGE TO KEEP YOU LOGGED IN. NO TRACKING PIXELS, NO AD-TECH NONSENSE. JUST PURE FUNCTIONALITY TO KEEP YOUR SESSION ALIVE IN THE CAVE.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-on-surface inline-block">03. THIRD_PARTY_VOID</h2>
            <p>
              YOUR DATA IS STORED IN FIREBASE (GOOGLE). WE DON'T SELL YOUR DATA TO SUITS. WE DON'T LEAK YOUR STRATEGIES TO THE COMPETITION. YOUR SECRETS ARE SAFE IN THE ENCRYPTED VOID.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-on-surface inline-block">04. YOUR_RIGHTS</h2>
            <p>
              YOU CAN WIPE YOUR DATA AT ANY TIME BY DELETING YOUR ACCOUNT. ONCE GONE, IT'S GONE FROM THE STREAM FOREVER. NO GHOST DATA, NO RESIDUAL ECHOES.
            </p>
          </section>
        </div>

        <div className="mt-20 pt-10 border-t-8 border-on-surface flex items-center justify-between">
          <p className="font-black uppercase italic text-sm opacity-40">LAST_UPDATE // 2026.04.12</p>
          <div className="flex gap-4">
            <Lock className="w-6 h-6 opacity-20" />
            <Eye className="w-6 h-6 opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
