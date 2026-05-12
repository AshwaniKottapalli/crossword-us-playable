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
  Particles.burstConfetti();
  setTimeout(() => Particles.burstConfetti(), 350);
  setTimeout(() => Particles.burstConfetti(), 750);
}
