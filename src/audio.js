// Web Audio with iOS-friendly lazy init.
//
// iOS Safari refuses to unlock an AudioContext that was created outside a
// user gesture, no matter how many times you call resume(). So the context
// must be CREATED inside the first user gesture, then primed with a silent
// buffer, then resumed. All three steps run synchronously in unlock().
//
// Hardware mute switch: iOS Web Audio respects the physical ring/silent
// toggle. There is no software workaround. If the user is on silent mode,
// nothing here plays — that's expected.

import { CONFIG } from './config.js';

let ctx = null;
let master = null;
let buffers = new Map();
let queue = [];
let inited = false;

export function initAudio() {
  // Deliberately empty. AudioContext is created lazily inside unlock()
  // so that creation happens within a user gesture (iOS requirement).
}

// Call this from a user-gesture handler (pointerdown / touchstart / click).
export function unlock() {
  if (inited && ctx && ctx.state === 'running') return;

  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = CONFIG.audio.masterGain;
      master.connect(ctx.destination);

      ctx.onstatechange = () => {
        if (ctx.state === 'running') drain();
      };

      // start loading voice files now that we have a context
      loadFile('voice_intro', CONFIG.audio.voiceIntro);
      loadFile('voice_win',   CONFIG.audio.voiceWin);
    }

    // iOS silent prime — a 1-sample buffer played inside the gesture
    // fully unlocks the context. Doing this on every unlock() is harmless
    // and helps recover from suspended states (e.g. tab backgrounded).
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);

    if (ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && typeof p.then === 'function') p.catch(() => {});
    }

    inited = true;
    // immediately try to drain the queue (some browsers report 'running' synchronously)
    drain();
  } catch (e) { /* silent fallback */ }
}

export function play(name) {
  if (!ctx || !inited || ctx.state !== 'running') {
    queue.push(name);
    return;
  }
  if (name.startsWith('voice')) {
    if (buffers.has(name)) playBuffer(buffers.get(name), CONFIG.audio.voiceGain);
    else queue.push(name);
    return;
  }
  switch (name) {
    case 'pop':   return tone({ f: 660, dur: 0.08, type: 'square', g: 0.45, slide: 220 });
    case 'thud':  return tone({ f: 110, dur: 0.12, type: 'sine',   g: 0.5,  slide: -40 });
    case 'ding':  return chord([880, 1320], 0.18, 'triangle', 0.4);
    case 'cheer': return chord([523, 659, 784, 1046], 0.45, 'sine', 0.4);
    case 'tick':  return tone({ f: 1200, dur: 0.04, type: 'square', g: 0.25 });
  }
}

function drain() {
  if (!ctx || ctx.state !== 'running') return;
  const q = queue.slice(); queue = [];
  q.forEach(name => play(name));
}

function tone({ f, dur, type = 'sine', g = 0.3, slide = 0 }) {
  const o = ctx.createOscillator();
  const ga = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, ctx.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), ctx.currentTime + dur);
  ga.gain.setValueAtTime(0, ctx.currentTime);
  ga.gain.linearRampToValueAtTime(g, ctx.currentTime + 0.005);
  ga.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(ga).connect(master);
  o.start();
  o.stop(ctx.currentTime + dur + 0.02);
}

function chord(freqs, dur, type, g) {
  freqs.forEach((f, i) => setTimeout(() => tone({ f, dur, type, g }), i * 40));
}

async function loadFile(name, url) {
  if (!ctx || !url) return;
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return;
    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(ab);
    buffers.set(name, buf);
    // drain any plays of this name that were queued while the buffer was loading
    if (queue.includes(name) && ctx.state === 'running') {
      queue = queue.filter(n => n !== name);
      playBuffer(buf, CONFIG.audio.voiceGain);
    }
  } catch (e) { /* silent fallback */ }
}

function playBuffer(buf, g = 1) {
  const src = ctx.createBufferSource();
  const ga = ctx.createGain();
  ga.gain.value = g;
  src.buffer = buf;
  src.connect(ga).connect(master);
  src.start();
}
