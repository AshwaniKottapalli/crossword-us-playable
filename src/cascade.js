import * as Grid from './grid.js';
import * as Particles from './particles.js';

export function celebrateWord(word, audio) {
  audio?.play?.('ding');
  Grid.celebrateWord(word, () => {});
  for (let i = 0; i < word.id.length; i++) {
    const r = word.dir === 'down' ? word.row + i : word.row;
    const c = word.dir === 'across' ? word.col + i : word.col;
    setTimeout(() => {
      const pt = Grid.cellCenter(r, c);
      Particles.emit(pt.x, pt.y, 14, { kind: 'sparkle', size: 4, speed: 110 });
    }, i * 60);
  }
}

export function celebrateAll(audio) {
  audio?.play?.('cheer');
  const stage = document.getElementById('stage');
  const w = stage.clientWidth, h = stage.clientHeight;
  // three fireworks at staggered positions, with confetti weaved in
  const shots = [
    { x: w * 0.30, y: h * 0.35, color: '#bf0a30', delay: 0   },
    { x: w * 0.70, y: h * 0.40, color: '#ffffff', delay: 220 },
    { x: w * 0.50, y: h * 0.28, color: '#002868', delay: 460 },
  ];
  shots.forEach(s => setTimeout(() => Particles.burstFirework(s.x, s.y, { color: s.color }), s.delay));
  setTimeout(() => Particles.burstConfetti(), 150);
  setTimeout(() => Particles.burstConfetti(), 500);
  setTimeout(() => Particles.burstConfetti(), 900);
}
