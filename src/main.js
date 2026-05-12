import { CONFIG } from './config.js';
import * as UI from './ui.js';
import * as Particles from './particles.js';
import * as Game from './game.js';

function boot() {
  // backdrop image (optional — falls back to dark navy bg)
  UI.setBackdrop(CONFIG.theme.backdrop);

  UI.initUI();
  Particles.initParticles();
  Game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
