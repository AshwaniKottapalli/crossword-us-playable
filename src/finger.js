// Idle helper — after N ms of zero pointer activity, animate finger from a
// matching bank tile to the next empty cell of the active word. No auto-place.

import { CONFIG } from './config.js';

let timer = null;
let active = false;
let fingerEl = null;
let getActiveWord = null;
let getFingerTarget = null;     // () => ({ tile, cell: {r,c,ch} }) | null
let onTargetTile = null;        // (tile, on) => mark/unmark target style
let onTargetCell = null;        // (r, c, on) => mark/unmark target style

let armed = false;

export function initFinger(opts) {
  fingerEl = document.getElementById('finger');
  getActiveWord = opts.getActiveWord;
  getFingerTarget = opts.getFingerTarget;
  onTargetTile = opts.onTargetTile;
  onTargetCell = opts.onTargetCell;

  // try to load hand image; fall back to emoji
  const img = new Image();
  img.onload = () => {
    fingerEl.classList.remove('emoji');
    fingerEl.textContent = '';
    fingerEl.style.backgroundImage = `url(${CONFIG.theme.hand})`;
    fingerEl.style.backgroundSize = 'contain';
    fingerEl.style.backgroundRepeat = 'no-repeat';
    fingerEl.style.width = '90px';
    fingerEl.style.height = '110px';
  };
  img.onerror = () => { /* keep emoji fallback */ };
  img.src = CONFIG.theme.hand;

  // global pointer listener — any activity resets the idle timer
  document.addEventListener('pointerdown', kick, true);
  document.addEventListener('pointermove', kick, true);
}

export function arm() {
  armed = true;
  kick();
}

export function disarm() {
  armed = false;
  clearTimer();
  hideFinger();
}

function kick() {
  if (!armed) return;
  if (active) hideFinger();
  clearTimer();
  timer = setTimeout(showFinger, CONFIG.idleHelperMs);
}

function clearTimer() {
  if (timer) { clearTimeout(timer); timer = null; }
}

function showFinger() {
  const target = getFingerTarget?.();
  if (!target) return;
  active = true;

  const stage = document.getElementById('stage');
  const sRect = stage.getBoundingClientRect();
  const tileRect = target.tile.el.getBoundingClientRect();

  // place finger near the bank tile
  const x = tileRect.left - sRect.left + tileRect.width * 0.45;
  const y = tileRect.top  - sRect.top  - 20;
  fingerEl.style.left = x + 'px';
  fingerEl.style.top  = y + 'px';
  fingerEl.classList.add('show');

  onTargetTile?.(target.tile, true);
  onTargetCell?.(target.cell.r, target.cell.c, true);

  // animate hand from tile → cell, repeatedly
  loopAnim(target);
}

function loopAnim(target) {
  if (!active) return;
  const stage = document.getElementById('stage');
  const sRect = stage.getBoundingClientRect();
  const tileRect = target.tile.el.getBoundingClientRect();
  const cellEl = document.querySelector(`.cell.empty[data-r="${target.cell.r}"][data-c="${target.cell.c}"]`);
  if (!cellEl) { hideFinger(); return; }
  const cellRect = cellEl.getBoundingClientRect();

  const start = {
    x: tileRect.left - sRect.left + tileRect.width * 0.45,
    y: tileRect.top  - sRect.top  - 20,
  };
  const end = {
    x: cellRect.left - sRect.left + cellRect.width * 0.45,
    y: cellRect.top  - sRect.top  - 20,
  };

  fingerEl.style.transition = 'none';
  fingerEl.style.left = start.x + 'px';
  fingerEl.style.top  = start.y + 'px';
  // force reflow then animate
  void fingerEl.offsetWidth;
  fingerEl.style.transition = 'left 1.1s ease-in-out, top 1.1s ease-in-out, opacity .25s';
  fingerEl.style.left = end.x + 'px';
  fingerEl.style.top  = end.y + 'px';

  setTimeout(() => { if (active) loopAnim(target); }, 1400);
}

function hideFinger() {
  active = false;
  if (fingerEl) fingerEl.classList.remove('show');
  // unmark target style on tile/cell
  document.querySelectorAll('.tile.target').forEach(t => t.classList.remove('target'));
  document.querySelectorAll('.cell.target').forEach(c => c.classList.remove('target'));
}
