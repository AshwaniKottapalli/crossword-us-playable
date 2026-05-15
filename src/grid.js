import { wordCells } from './puzzles.js';

// Map of "r,c" -> { el, cell }
const nodes = new Map();
let activePuzzle = null;
let gridEl = null;

export function renderGrid(puzzle, mountEl) {
  activePuzzle = puzzle;
  gridEl = mountEl;
  gridEl.innerHTML = '';
  gridEl.classList.remove('tease');
  gridEl.style.gridTemplateColumns = `repeat(${puzzle.cols}, var(--cell-size))`;
  gridEl.style.gridTemplateRows    = `repeat(${puzzle.rows}, var(--cell-size))`;
  nodes.clear();

  fitCellSize(puzzle);

  for (let r = 0; r < puzzle.rows; r++) {
    for (let c = 0; c < puzzle.cols; c++) {
      const cell = puzzle.cells[r][c];
      const el = document.createElement('div');
      el.className = 'cell';
      el.style.gridColumn = String(c + 1);
      el.style.gridRow    = String(r + 1);
      if (!cell) {
        el.classList.add('off');
      } else if (cell.prefilled) {
        el.classList.add('prefilled');
        el.textContent = cell.ch;
      } else {
        el.classList.add('empty');
        el.dataset.r = String(r);
        el.dataset.c = String(c);
      }
      if (cell?.num) {
        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = String(cell.num);
        el.appendChild(num);
      }
      gridEl.appendChild(el);
      nodes.set(key(r, c), { el, cell });
    }
  }
}

// Static tease render — every cell shown as filled, no interaction.
export function renderTease(tease, mountEl) {
  gridEl = mountEl;
  gridEl.innerHTML = '';
  gridEl.classList.add('tease');
  gridEl.style.gridTemplateColumns = `repeat(${tease.cols}, var(--cell-size))`;
  gridEl.style.gridTemplateRows    = `repeat(${tease.rows}, var(--cell-size))`;
  nodes.clear();
  fitCellSize(tease);
  for (let r = 0; r < tease.rows; r++) {
    for (let c = 0; c < tease.cols; c++) {
      const cell = tease.cells[r][c];
      const el = document.createElement('div');
      el.className = 'cell';
      el.style.gridColumn = String(c + 1);
      el.style.gridRow    = String(r + 1);
      if (!cell) el.classList.add('off');
      else { el.classList.add('prefilled'); el.textContent = cell.ch; }
      gridEl.appendChild(el);
    }
  }
}

function fitCellSize(puzzle) {
  const rows = puzzle?.rows || 11;
  const cols = puzzle?.cols || 11;

  // Combine every width/height measurement we have and pick the SMALLEST.
  // Different sources lie in different webviews (WhatsApp inflates 100vw,
  // some browsers report clientWidth larger than visible, etc.) — taking
  // the min defends against any one of them overshooting.
  const wCandidates = [
    window.visualViewport?.width,
    window.innerWidth,
    document.documentElement.clientWidth,
  ].filter(v => typeof v === 'number' && v > 0);
  const hCandidates = [
    window.visualViewport?.height,
    window.innerHeight,
    document.documentElement.clientHeight,
  ].filter(v => typeof v === 'number' && v > 0);
  const vw = wCandidates.length ? Math.min(...wCandidates) : 360;
  const vh = hCandidates.length ? Math.min(...hCandidates) : 640;

  // Reserved vertical overhead for the rest of the UI on a portrait phone:
  //   ~90 header (with safe-area) + ~50 hint + ~80 bank + ~30 margins = 250
  // Plus 20 more so cells don't kiss the edges visually.
  const VERTICAL_OVERHEAD = 270;
  const HORIZONTAL_PAD = 16;

  const availW = Math.min(vw, 540) - HORIZONTAL_PAD;
  const availH = vh - VERTICAL_OVERHEAD;

  const gap = 3;
  const byW = Math.floor((availW - (cols - 1) * gap) / cols);
  const byH = Math.floor((availH - (rows - 1) * gap) / rows);

  // Floor 16px so cells stay readable; cap 44px so desktop doesn't look silly.
  const sz = Math.max(16, Math.min(44, byW, byH));
  document.documentElement.style.setProperty('--cell-size', sz + 'px');
}

// Re-fit on rotation, keyboard show/hide, browser chrome show/hide.
function onViewportChange() {
  if (activePuzzle) fitCellSize(activePuzzle);
}
window.addEventListener('resize', onViewportChange);
window.addEventListener('orientationchange', onViewportChange);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', onViewportChange);
}

export function cellAt(r, c) {
  return nodes.get(key(r, c));
}

export function cellElAt(r, c) {
  const n = nodes.get(key(r, c));
  return n ? n.el : null;
}

// Returns center coords of a cell relative to the stage element.
export function cellCenter(r, c) {
  const stage = document.getElementById('stage');
  const sRect = stage.getBoundingClientRect();
  const n = nodes.get(key(r, c));
  if (!n) return { x: 0, y: 0 };
  const rect = n.el.getBoundingClientRect();
  return {
    x: rect.left - sRect.left + rect.width / 2,
    y: rect.top  - sRect.top  + rect.height / 2,
  };
}

// Mark cells of a word as the active (current target) word.
export function setActiveWord(word) {
  // clear previous
  for (const { el } of nodes.values()) el.classList.remove('active');
  if (!word) return;
  for (const { r, c } of wordCells(activePuzzle, word)) {
    const n = nodes.get(key(r, c));
    if (n) n.el.classList.add('active');
  }
}

export function setCursor(r, c) {
  for (const { el } of nodes.values()) el.classList.remove('cursor');
  if (r == null || c == null) return;
  const n = nodes.get(key(r, c));
  if (n) n.el.classList.add('cursor');
}

export function clearCursor() {
  for (const { el } of nodes.values()) el.classList.remove('cursor');
}

export function markCorrect(r, c, ch) {
  const n = nodes.get(key(r, c));
  if (!n) return;
  n.el.classList.remove('empty');
  n.el.classList.add('correct');
  // append letter text (preserve number span)
  const num = n.el.querySelector('.num');
  n.el.textContent = ch;
  if (num) n.el.appendChild(num);
  n.cell.filled = true;
}

export function isCellFilled(r, c) {
  const n = nodes.get(key(r, c));
  if (!n || !n.cell) return false;
  return n.cell.prefilled || n.cell.filled;
}

export function expectedChar(r, c) {
  const n = nodes.get(key(r, c));
  return n?.cell?.ch || null;
}

export function getPuzzle() { return activePuzzle; }

export function findFirstEmptyOf(word) {
  for (const { r, c, cell } of wordCells(activePuzzle, word)) {
    if (!cell.prefilled && !cell.filled) return { r, c, ch: cell.ch };
  }
  return null;
}

export function isWordComplete(word) {
  return findFirstEmptyOf(word) === null;
}

export function celebrateWord(word, onDone) {
  const cells = wordCells(activePuzzle, word);
  cells.forEach(({ r, c }, i) => {
    const n = nodes.get(key(r, c));
    if (!n) return;
    setTimeout(() => {
      n.el.classList.add('celebrate');
      setTimeout(() => n.el.classList.remove('celebrate'), 600);
    }, i * 60);
  });
  setTimeout(() => onDone && onDone(), cells.length * 60 + 600);
}

function key(r, c) { return r + ',' + c; }

// Run an initial fit at module-load time so --cell-size is correct even
// before the grid mounts (the intro card / preload phases will use it for
// any debug rendering and the value is ready when renderGrid() fires).
fitCellSize({ rows: 11, cols: 11 });
