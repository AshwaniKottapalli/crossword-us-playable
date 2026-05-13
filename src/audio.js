// Web Audio: procedural SFX recipes + optional file-loaded voice.
// All play() calls before unlock are queued; drained on statechange = running.

import { CONFIG } from './config.js';

let ctx = null;
let master = null;
let buffers = new Map();
let queue = [];           // names waiting on ctx.resume() or buffer load
let unlocked = false;

export function initAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = CONFIG.audio.masterGain;
    master.connect(ctx.destination);
    ctx.onstatechange = () => {
      if (ctx.state === 'running' && !unlocked) {
        unlocked = true;
        const q = queue.slice(); queue = [];
        q.forEach(name => play(name));
      }
    };
    // try to load voice files (optional)
    loadFile('voice_intro', CONFIG.audio.voiceIntro);
    loadFile('voice_win',   CONFIG.audio.voiceWin);
  } catch (e) { /* no audio — silent fallback */ }
}

export function unlock() {
  if (!ctx) return;
  // iOS Safari: a one-shot silent buffer played within a user gesture is the
  // most reliable way to fully unlock the audio context. Just calling resume()
  // sometimes leaves the context in a half-unlocked state.
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch (e) { /* ignore */ }
  if (ctx.state === 'suspended') {
    const p = ctx.resume();
    // some browsers return a Promise; treat both paths the same
    if (p && typeof p.then === 'function') p.catch(() => {});
  }
}

export function play(name) {
  if (!ctx) return;
  if (ctx.state !== 'running') { queue.push(name); return; }
  // voice files: if buffer not loaded yet, queue for load completion
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
    // drain any queued plays of this name
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
