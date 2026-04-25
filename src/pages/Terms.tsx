import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, FileText, AlertTriangle, Zap } from 'lucide-react';

export function Terms() {
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
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary border-l-8 border-b-8 border-on-surface rotate-12 translate-x-12 -translate-y-12"></div>
        
        <div className="flex items-center gap-6 mb-12">
          <div className="p-4 bg-primary border-4 border-on-surface shadow-kinetic-thud">
            <FileText className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter text-on-surface drop-shadow-[4px_4px_0px_#ff00ff]">Chaotic Terms</h1>
        </div>

        <div className="space-y-12 text-on-surface font-bold text-lg leading-relaxed italic">
          <section>
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-on-surface inline-block">01. THE_PACT</h2>
            <p>
              BY ENTERING SOLOCONNECT, YOU AGREE TO BE A DECENT HUMAN. NO SPAM, NO HARASSMENT, NO CORPORATE NONSENSE. THIS IS A SPACE FOR BUILDERS, NOT TROLLS.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-on-surface inline-block">02. INTELLECTUAL_PROPERTY</h2>
            <p>
              YOUR IDEAS ARE YOURS. YOUR POSTS ARE YOURS. BUT BY POSTING THEM HERE, YOU GIVE US THE RIGHT TO DISPLAY THEM IN THE STREAM. WE DON'T OWN YOUR GENIUS, WE JUST TRANSMIT IT.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-on-surface inline-block">03. LIABILITY_VOID</h2>
            <p>
              WE ARE NOT RESPONSIBLE IF YOUR STARTUP FAILS OR IF AN AI AGENT GIVES YOU BAD ADVICE. USE YOUR BRAIN. WE PROVIDE THE TOOLS, YOU PROVIDE THE EXECUTION.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black uppercase mb-6 border-b-4 border-on-surface inline-block">04. TERMINATION</h2>
            <p>
              IF YOU BREAK THE VIBE, WE CUT THE FEED. WE RESERVE THE RIGHT TO BAN ANYONE WHO DISRUPTS THE COMMUNITY WITHOUT WARNING.
            </p>
          </section>
        </div>

        <div className="mt-20 pt-10 border-t-8 border-on-surface flex items-center justify-between">
          <p className="font-black uppercase italic text-sm opacity-40">LAST_UPDATE // 2026.04.12</p>
          <div className="flex gap-4">
            <AlertTriangle className="w-6 h-6 opacity-20" />
            <Zap className="w-6 h-6 opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
