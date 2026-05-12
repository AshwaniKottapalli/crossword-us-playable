// G = cell helper. _ = off-grid (no cell rendered).
// `prefilled:true` means the cell is locked (shown from the start).
// Cells that are part of player-fill words but cross locked words are still prefilled — the locked word "wins".
const G = (ch, prefilled, num) => ({ ch, prefilled, num: num || null });
const _ = null;

// Main playable puzzle. 11 rows x 11 cols.
// Locked words: BOSTON, SANTAFE, DENVER (and crossings into other words).
// Player-fill words: NEWYORK, ATLANTA, AUSTIN, PHOENIX, NASHVILLE.
//   NEWYORK shares N with SANTAFE → only E-W-Y-O-R-K to fill.
//   ATLANTA shares A with SANTAFE → only A-T-L-N-T-A to fill.
//   AUSTIN shares A (first) with ATLANTA — both player-fill, single tile.
//   AUSTIN's last letter N shares with NASHVILLE's first letter N — single tile.
//   PHOENIX shares N with DENVER → only P-H-O-E-I-X to fill.
//   NASHVILLE shares last E with DENVER → only N-A-S-H-V-I-L-L to fill.
export const PUZZLE = {
  rows: 11,
  cols: 11,
  cells: [
    // row 0 — BOSTON
    [_, G('B',true,1), G('O',true), G('S',true,2), G('T',true), G('O',true), G('N',true), _, _, _, _],
    // row 1 — SANTAFE letter
    [_, _, _, G('A',true), _, _, _, _, _, _, _],
    // row 2 — NEWYORK (3 Across). First N locked (SANTAFE), E + R pre-revealed.
    [_, _, _, G('N',true,3), G('E',true), G('W',false), G('Y',false), G('O',false), G('R',true), G('K',false), _],
    // row 3 — SANTAFE letter
    [_, _, _, G('T',true), _, _, _, _, _, _, _],
    // row 4 — ATLANTA (4 Across). A0 + A6 pre-revealed (gives shape), middle player-fill.
    [G('A',true,4), G('T',false), G('L',false), G('A',true), G('N',false), G('T',false), G('A',true), _, _, _, _],
    // row 5 — AUSTIN U pre-revealed + SANTAFE F + DENVER D
    [G('U',true), _, _, G('F',true), _, _, _, _, G('D',true,5), _, _],
    // row 6 — AUSTIN S + SANTAFE E + DENVER E
    [G('S',false), _, _, G('E',true), _, _, _, _, G('E',true), _, _],
    // row 7 — AUSTIN T + PHOENIX (6 Across). H + I pre-revealed.
    [G('T',false), _, _, _, G('P',false,6), G('H',true), G('O',false), G('E',false), G('N',true), G('I',true), G('X',false)],
    // row 8 — AUSTIN I pre-revealed + DENVER V
    [G('I',true), _, _, _, _, _, _, _, G('V',true), _, _],
    // row 9 — NASHVILLE (7 Across). A (pos 1) + V (pos 4) pre-revealed.
    [G('N',false,7), G('A',true), G('S',false), G('H',false), G('V',true), G('I',false), G('L',false), G('L',false), G('E',true), _, _],
    // row 10 — DENVER R
    [_, _, _, _, _, _, _, _, G('R',true), _, _],
  ],
  words: [
    { id: 'NEWYORK',   row: 2, col: 3, dir: 'across', hint: 'ALBANY' },
    { id: 'ATLANTA',   row: 4, col: 0, dir: 'across', hint: 'GEORGIA' },
    { id: 'AUSTIN',    row: 4, col: 0, dir: 'down',   hint: 'TEXAS' },
    { id: 'PHOENIX',   row: 7, col: 4, dir: 'across', hint: 'ARIZONA' },
    { id: 'NASHVILLE', row: 9, col: 0, dir: 'across', hint: 'TENNESSEE' },
  ],
};

// Static blurred grid shown behind the CTA card.
export const TEASE = {
  rows: 9,
  cols: 11,
  cells: [
    [_, _, G('H',true), G('A',true), G('R',true), G('T',true), G('F',true), G('O',true), G('R',true), G('D',true), _],
    [_, _, _, _, _, G('R',true), _, _, _, _, _],
    [G('A',true), G('L',true), G('B',true), G('A',true), G('N',true), G('Y',true), _, G('D',true), _, _, _],
    [_, _, _, _, _, _, _, G('O',true), _, _, _],
    [_, _, _, _, G('J',true), G('U',true), G('N',true), G('E',true), G('A',true), G('U',true), _],
    [_, _, _, _, _, _, _, G('S',true), _, _, _],
    [G('R',true), G('A',true), G('L',true), G('E',true), G('I',true), G('G',true), G('H',true), _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, G('P',true), G('I',true), G('E',true), G('R',true), G('R',true), G('E',true), _, _],
  ],
};

// Cells of a word, in order.
export function wordCells(puzzle, w) {
  const len = wordLength(puzzle, w);
  const cells = [];
  for (let i = 0; i < len; i++) {
    const r = w.dir === 'down' ? w.row + i : w.row;
    const c = w.dir === 'across' ? w.col + i : w.col;
    cells.push({ r, c, cell: puzzle.cells[r][c] });
  }
  return cells;
}

export function wordLength(puzzle, w) {
  let n = 0;
  let r = w.row, c = w.col;
  while (r < puzzle.rows && c < puzzle.cols && puzzle.cells[r][c]) {
    n++;
    if (w.dir === 'across') c++; else r++;
  }
  return n;
}

// Letters the player needs for this word's empty cells (in left-to-right / top-to-bottom order).
export function lettersForWord(puzzle, w) {
  return wordCells(puzzle, w)
    .filter(({ cell }) => cell && !cell.prefilled)
    .map(({ cell }) => cell.ch);
}

// Build a per-word tile bank: word's needed letters + a single distractor.
const DISTRACTORS = 'UQZXKBJ'.split('');
export function bankForWord(puzzle, word) {
  const needed = lettersForWord(puzzle, word);
  // pick a distractor that's not in `needed`
  const distractor = DISTRACTORS.find(d => !needed.includes(d)) || 'Z';
  return shuffle([...needed, distractor]);
}

function shuffle(a) {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
