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

export function setBackdrop(url) {
  const img = new Image();
  img.onload = () => {
    document.getElementById('stage').style.backgroundImage = `url(${url})`;
  };
  img.onerror = () => { /* keep procedural background */ };
  img.src = url;
}
