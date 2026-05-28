// Soloconnect Cybernetic Sound FX synthesizer using Web Audio API
let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser security policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playSound = (type: 'hover' | 'click' | 'success' | 'alert' | 'startup' | 'shutdown') => {
  const isSoundEnabled = localStorage.getItem('sound_fx_enabled') !== 'false';
  if (!isSoundEnabled) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
      case 'hover': {
        // Ultra-short high register cyber tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      }
      case 'click': {
        // Short snappy low-bit square click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'success': {
        // Legendary retro sci-fi dual tone arpeggio sweep
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.06, now + idx * 0.06 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.15);

          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.18);
        });
        break;
      }
      case 'alert': {
        // Warning digital dual pulsing tone
        [320, 240].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now);
          osc.frequency.linearRampToValueAtTime(freq - 40, now + 0.25);
          
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

          // Add a simple lowpass filter to make it slightly less harsh but cybernetic
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now);
          osc.stop(now + 0.25);
        });
        break;
      }
      case 'startup': {
        // Neon cyber power up sequence
        const sweepOsc = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        
        sweepOsc.type = 'sine';
        sweepOsc.frequency.setValueAtTime(100, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(880, now + 0.6);
        
        sweepGain.gain.setValueAtTime(0.001, now);
        sweepGain.gain.linearRampToValueAtTime(0.04, now + 0.2);
        sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
        
        sweepOsc.connect(sweepGain);
        sweepGain.connect(ctx.destination);
        sweepOsc.start(now);
        sweepOsc.stop(now + 0.6);
        
        // Final neat chime blip
        setTimeout(() => {
          playSound('success');
        }, 500);
        break;
      }
      case 'shutdown': {
        // Retro power collapse
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
    }
  } catch (error) {
    // Avoid console spam if context couldn't be initialized
    console.debug('Web Audio not fully active yet.', error);
  }
};
