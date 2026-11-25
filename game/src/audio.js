// All sound is synthesized with WebAudio — no audio files, no network.
// Sizzle is looped filtered noise while a patty cooks; pops, chimes and
// buzzes are short oscillator envelopes. Everything is guarded: if the
// browser blocks audio, the game plays on silently.

let ctx = null;
let sizzleNodes = null;

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
  const c = ensureCtx();
  if (!c) return;
  try {
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    // Audio is garnish; never let it break the game.
  }
}

export const sfx = {
  unlock() {
    const c = ensureCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  },
  place() {
    tone(520, 0.09, 'triangle', 0.18, 0, 340);
  },
  flip() {
    tone(300, 0.12, 'square', 0.1, 0, 720);
  },
  select() {
    tone(660, 0.05, 'sine', 0.1);
  },
  serve() {
    // Cash-register chime: bright ascending arpeggio.
    tone(523, 0.12, 'triangle', 0.2);
    tone(659, 0.12, 'triangle', 0.2, 0.09);
    tone(784, 0.2, 'triangle', 0.22, 0.18);
    tone(1047, 0.28, 'triangle', 0.18, 0.27);
  },
  error() {
    tone(160, 0.22, 'sawtooth', 0.14, 0, 110);
  },
  burn() {
    tone(220, 0.4, 'sawtooth', 0.12, 0, 70);
  },
  tick() {
    tone(880, 0.04, 'sine', 0.07);
  },
  startSizzle() {
    const c = ensureCtx();
    if (!c || sizzleNodes) return;
    try {
      const len = c.sampleRate * 1;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 4200;
      filter.Q.value = 0.6;
      const gain = c.createGain();
      gain.gain.value = 0.045;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
      sizzleNodes = { src, gain };
    } catch {
      sizzleNodes = null;
    }
  },
  stopSizzle() {
    if (!sizzleNodes) return;
    try {
      sizzleNodes.src.stop();
    } catch {
      // Already stopped.
    }
    sizzleNodes = null;
  },
};
