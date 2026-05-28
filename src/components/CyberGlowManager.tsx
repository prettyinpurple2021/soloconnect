import React, { useState, useEffect } from 'react';
import { playSound } from '../lib/sounds';

interface Particle {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  dx: string;
  dy: string;
  rot: string;
}

export function CyberGlowManager() {
  const [crtEnabled, setCrtEnabled] = useState(() => {
    return localStorage.getItem('crt_mode_enabled') !== 'false';
  });

  const [particles, setParticles] = useState<Particle[]>([]);
  const [particleCounter, setParticleCounter] = useState(0);

  // Synchronize CRT status with root HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (crtEnabled) {
      root.classList.add('crt-active');
    } else {
      root.classList.remove('crt-active');
    }
    localStorage.setItem('crt_mode_enabled', crtEnabled ? 'true' : 'false');
  }, [crtEnabled]);

  // Listen to custom toggle events
  useEffect(() => {
    const handleCrtToggle = () => {
      setCrtEnabled(prev => !prev);
    };

    window.addEventListener('TOGGLE_CRT_MONITOR', handleCrtToggle);
    return () => {
      window.removeEventListener('TOGGLE_CRT_MONITOR', handleCrtToggle);
    };
  }, []);

  // Global click listener to play audio click and spawn beautiful neobrutalist sparks
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // 1. Play click sound
      playSound('click');

      // 2. Spawn kinetic sparks near the cursor position
      const target = e.target as HTMLElement;
      const isInteractive = 
        target && (
          target.tagName === 'BUTTON' || 
          target.tagName === 'A' || 
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' || 
          target.closest('a') || 
          target.closest('button') || 
          target.classList.contains('cursor-pointer')
        );

      const sparkleCount = isInteractive ? 8 : 4;
      const particleOptions = ['✦', '★', '⚡', '01', 'Y2K', 'SYS', '▲', '◆', '◆'];
      const colorOptions = ['#FFACE4', '#A5F3FC', '#C4B5FD', '#22c55e', '#facc15'];

      const newSparks: Particle[] = [];
      let baseCounter = particleCounter;

      for (let i = 0; i < sparkleCount; i++) {
        const angle = (Math.PI * 2 / sparkleCount) * i + (Math.random() * 0.4 - 0.2);
        const distance = 30 + Math.random() * 50;
        const dx = `${Math.cos(angle) * distance}px`;
        const dy = `${Math.sin(angle) * distance - 20}px`; // Drift slightly upward too
        const rot = `${(Math.random() * 360 - 180)}deg`;
        const text = particleOptions[Math.floor(Math.random() * particleOptions.length)];
        const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];

        newSparks.push({
          id: baseCounter++,
          x: e.clientX,
          y: e.clientY,
          text,
          color,
          dx,
          dy,
          rot,
        });
      }

      setParticleCounter(baseCounter);
      setParticles(prev => [...prev, ...newSparks]);

      // Prune old particles shortly after animation finishes
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newSparks.find(ns => ns.id === p.id)));
      }, 700);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [particleCounter]);

  return (
    <>
      {/* Visual Scanline Grid Layer */}
      {crtEnabled && (
        <>
          <div className="crt-overlay" />
          <div className="crt-vignette" />
        </>
      )}

      {/* Floating Kinetic Particles Portal */}
      <div className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden">
        {particles.map(p => (
          <span
            key={p.id}
            className="cyber-particle select-none"
            style={{
              left: p.x,
              top: p.y,
              color: p.color,
              fontSize: '14px',
              // Custom CSS Variables consumed by keyframe drift
              ['--dx' as any]: p.dx,
              ['--dy' as any]: p.dy,
              ['--rot' as any]: p.rot,
            }}
          >
            {p.text}
          </span>
        ))}
      </div>
    </>
  );
}
