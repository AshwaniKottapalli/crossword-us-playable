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
  // Set --cell-size so the grid AND the bank tiles fit horizontally,
  // and the grid fits vertically. Cell-size also bounds the bank tile,
  // which is var(--cell-size) * 1.15 wide.
  const stage = document.getElementById('stage');
  const stageEl = document.getElementById('grid-stage');
  // Use the smaller of stage clientWidth and window.innerWidth — defensive
  // against weird measurement timing on first paint.
  const stageW = Math.min(
    stage ? stage.clientWidth : window.innerWidth,
    window.innerWidth
  );
  const stageH = stageEl ? stageEl.clientHeight : 600;
  const gapPx = 3;
  const padX = 36;   // extra safety margin so cells never touch viewport edge
  const padY = 20;
  const wAvail = Math.max(220, stageW - padX);
  const hAvail = Math.max(220, stageH - padY);
  const byW = Math.floor((wAvail - (puzzle.cols - 1) * gapPx) / puzzle.cols);
  const byH = Math.floor((hAvail - (puzzle.rows - 1) * gapPx) / puzzle.rows);
  const sz = Math.max(16, Math.min(44, byW, byH));
  document.documentElement.style.setProperty('--cell-size', sz + 'px');
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
