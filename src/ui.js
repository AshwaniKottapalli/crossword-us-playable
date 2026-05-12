// Overlay cards: intro / win banner / CTA. Pure DOM toggles.

import { CONFIG, storeUrl } from './config.js';
import { renderTease } from './grid.js';
import { TEASE } from './puzzles.js';

export function initUI() {
  // wire intro button
  const introBtn = document.getElementById('intro-btn');
  // copy from config
  document.querySelector('#intro .copy').innerHTML =
    `Only <span class="pct">1%</span> of Americans can reach <br/>Level 5`;
  introBtn.textContent = CONFIG.intro.button;

  document.getElementById('win-text').textContent = CONFIG.win.banner;
  document.getElementById('lock-badge').textContent = CONFIG.tease.badge;
  document.getElementById('cta-headline').textContent = CONFIG.cta.headline;
  document.getElementById('cta-sub').textContent = CONFIG.cta.sub;
  document.getElementById('cta-btn').textContent = CONFIG.cta.button;

  // try to set logo background, fallback to text
  const logoEl = document.getElementById('cta-logo');
  const img = new Image();
  img.onload = () => {
    logoEl.style.backgroundImage = `url(${CONFIG.theme.logo})`;
  };
  img.onerror = () => {
    logoEl.classList.add('fallback');
    logoEl.textContent = CONFIG.cta.gameName;
  };
  img.src = CONFIG.theme.logo;
}

export function showIntro(onDismiss) {
  const el = document.getElementById('intro');
  el.classList.add('show');
  const dismiss = () => {
    el.removeEventListener('pointerdown', dismiss);
    clearTimeout(timer);
    el.classList.remove('show');
    onDismiss();
  };
  el.addEventListener('pointerdown', dismiss);
  const timer = setTimeout(dismiss, CONFIG.intro.autoAdvanceMs);
}

export function showWinBanner(onDone) {
  const el = document.getElementById('win-banner');
  el.classList.add('show');
  setTimeout(() => {
    el.classList.remove('show');
    onDone && onDone();
  }, CONFIG.win.holdMs);
}

export function showCTA() {
  // swap visible grid to the tease grid behind the CTA
  // hide hint pill + bank + header
  document.getElementById('hint').style.opacity = '0';
  document.getElementById('bank').style.opacity = '0';

  // render tease into the grid container
  const gridEl = document.getElementById('grid');
  renderTease(TEASE, gridEl);

  setTimeout(() => {
    const cta = document.getElementById('cta');
    cta.classList.add('show');
    document.getElementById('cta-btn').addEventListener('pointerdown', onInstall, { once: true });
  }, CONFIG.tease.holdMs);
}

function onInstall() {
  const url = storeUrl();
  if (typeof window.clickTag === 'string')        window.open(window.clickTag, '_blank');
  else if (window.FbPlayableAd?.onCTAClick)       window.FbPlayableAd.onCTAClick();
  else                                            window.open(url, '_blank');
}

let lastPraise = null;
export function popPraise() {
  const el = document.getElementById('praise');
  if (!el) return;
  const list = CONFIG.praise;
  let next;
  do { next = list[(Math.random() * list.length) | 0]; }
  while (list.length > 1 && next === lastPraise);
  lastPraise = next;
  el.textContent = next;
  // restart animation
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

export function setStreak(n) {
  const el = document.getElementById('streak');
  if (!el) return;
  if (n <= 0) {
    el.classList.remove('show', 'fire', 'bump');
    return;
  }
  el.textContent = n >= 4 ? '🔥 ON FIRE!' : `🔥 ×${n}`;
  el.classList.toggle('fire', n >= 4);
  el.classList.add('show');
  // restart bump animation
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

export function shakeStage() {
  const stage = document.getElementById('stage');
  if (!stage) return;
  stage.classList.remove('shake');
  void stage.offsetWidth;
  stage.classList.add('shake');
  setTimeout(() => stage.classList.remove('shake'), 200);
}

export function ringBurstAt(r, c) {
  const cellEl = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`) ||
                 document.querySelector(`.cell.correct[data-r="${r}"][data-c="${c}"]`);
  const stage = document.getElementById('stage');
  if (!stage) return;
  // fall back: find cell by coordinates from the grid layout
  const sRect = stage.getBoundingClientRect();
  let cx, cy;
  if (cellEl) {
    const rect = cellEl.getBoundingClientRect();
    cx = rect.left - sRect.left + rect.width / 2;
    cy = rect.top  - sRect.top  + rect.height / 2;
  } else {
    return;
  }
  const ring = document.createElement('div');
  ring.className = 'ring-burst';
  ring.style.left = cx + 'px';
  ring.style.top  = cy + 'px';
  ring.style.transform = 'translate(-50%,-50%) scale(0.4)';
  stage.appendChild(ring);
  setTimeout(() => ring.remove(), 600);
}

export function flashCellWrong(r, c) {
  const cellEl = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
  if (!cellEl) return;
  cellEl.classList.remove('wrong-flash');
  void cellEl.offsetWidth;
  cellEl.classList.add('wrong-flash');
  setTimeout(() => cellEl.classList.remove('wrong-flash'), 450);
}

export function setBackdrop(url) {
  const img = new Image();
  img.onload = () => {
    document.getElementById('stage').style.backgroundImage = `url(${url})`;
  };
  img.onerror = () => { /* keep procedural background */ };
  img.src = url;
}
