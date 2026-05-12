// Canvas2D multi-channel particle system.
// Channels: sparkle (additive yellow), confetti (vivid alpha).

let canvas, ctx;
let particles = [];
let last = 0;
let rafId = 0;

export function initParticles() {
  canvas = document.getElementById('fx');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  loop(performance.now());
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const stage = document.getElementById('stage');
  const w = stage.clientWidth, h = stage.clientHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function emit(x, y, count, opts = {}) {
  const kind = opts.kind || 'sparkle';
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const speed = (opts.speed || 90) * (0.4 + Math.random() * 0.8);
    const upBias = opts.upBias ?? (kind === 'confetti' ? 0.6 : 0.3);
    particles.push({
      x, y,
      vx: Math.cos(ang) * speed * (opts.spread ?? 1),
      vy: Math.sin(ang) * speed - upBias * 180,
      g: opts.gravity ?? (kind === 'confetti' ? 380 : 160),
      life: 0,
      max: (opts.lifetime ?? (kind === 'confetti' ? 1.6 : 0.9)),
      size: (opts.size ?? (kind === 'confetti' ? 6 : 4)) * (0.6 + Math.random()*0.6),
      color: pickColor(opts.color, kind),
      kind,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 8,
    });
  }
}

export function burstConfetti() {
  const stage = document.getElementById('stage');
  const w = stage.clientWidth;
  for (let i = 0; i < 80; i++) {
    emit(Math.random() * w, -10, 1, {
      kind: 'confetti',
      speed: 60,
      upBias: -0.4,
      gravity: 320,
      spread: 1.2,
      lifetime: 2.2,
      size: 7,
    });
  }
}

function pickColor(c, kind) {
  if (c) return c;
  if (kind === 'confetti') {
    const pal = ['#bf0a30', '#ffffff', '#002868', '#e8eaf6'];
    return pal[(Math.random() * pal.length) | 0];
  }
  return '#ffd84a';
}

// Expanding ring of sparkles for the fireworks finale.
export function burstFirework(x, y, opts = {}) {
  const count = opts.count ?? 24;
  const speed = opts.speed ?? 240;
  const color = opts.color || pickColor(null, 'confetti');
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2;
    particles.push({
      x, y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      g: 60,
      life: 0,
      max: 1.1,
      size: 4,
      color,
      kind: 'sparkle',
      rot: 0, vrot: 0,
    });
  }
  // small delayed secondary fan
  setTimeout(() => {
    for (let i = 0; i < count / 2; i++) {
      const ang = Math.random() * Math.PI * 2;
      particles.push({
        x, y,
        vx: Math.cos(ang) * speed * 0.55,
        vy: Math.sin(ang) * speed * 0.55,
        g: 140,
        life: 0,
        max: 1.4,
        size: 3,
        color: '#ffd84a',
        kind: 'sparkle',
        rot: 0, vrot: 0,
      });
    }
  }, 120);
}

function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  step(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function step(dt) {
  for (const p of particles) {
    p.life += dt;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
  }
  particles = particles.filter(p => p.life < p.max);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = Math.max(0, a);
    if (p.kind === 'sparkle') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      // cross-flare
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x - p.size * 2, p.y); ctx.lineTo(p.x + p.size * 2, p.y);
      ctx.moveTo(p.x, p.y - p.size * 2); ctx.lineTo(p.x, p.y + p.size * 2);
      ctx.stroke();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
