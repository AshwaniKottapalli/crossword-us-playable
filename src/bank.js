// Tile bank — HYBRID tap-or-drag.
//
// On pointerdown a ghost clone is spawned over the tile and the pointer is tracked.
// If movement > 8px before release → DRAG mode (ghost follows pointer, release-point
// determines target). Otherwise → TAP mode (auto-route to the cursor cell).
//
// Correctness check is the same in both modes: only the next-empty cell of the
// active word, and only when the tapped/dropped letter matches that cell's expected
// char, counts as correct. Strict cursor order.

const DRAG_THRESHOLD = 8; // px

let bankEl = null;
let tiles = [];     // [{ id, ch, el }]
let opts = null;
let flying = false; // true during in-flight animation
let dragState = null;
let nextId = 1;

export function renderBank(letters, options) {
  opts = options;
  bankEl = document.getElementById('bank');
  bankEl.innerHTML = '';
  tiles = [];
  flying = false;
  dragState = null;
  for (const ch of letters) {
    const id = 't' + (nextId++);
    const el = document.createElement('div');
    el.className = 'tile';
    el.textContent = ch;
    el.dataset.ch = ch;
    el.dataset.id = id;
    el.addEventListener('pointerdown', onPointerDown);
    bankEl.appendChild(el);
    tiles.push({ id, ch, el });
  }
}

export function tileWithChar(ch) {
  return tiles.find(t => t.ch === ch && !t.el.classList.contains('gone')) || null;
}

export function clearBank() {
  if (bankEl) bankEl.innerHTML = '';
  tiles = [];
}

export function tileRect(tile) { return tile.el.getBoundingClientRect(); }
export function targetTile(tile, on) { tile.el.classList.toggle('target', !!on); }
export function clearAllTargets() { tiles.forEach(t => t.el.classList.remove('target')); }

function onPointerDown(e) {
  if (flying) return;
  const el = e.currentTarget;
  if (el.classList.contains('gone')) return;
  e.preventDefault();
  const tile = tiles.find(t => t.el === el);
  if (!tile) return;

  opts?.onDragStart?.(); // unlock audio on first interaction

  const stage = document.getElementById('stage');
  const stageRect = stage.getBoundingClientRect();
  const tileRect = tile.el.getBoundingClientRect();

  const ghost = tile.el.cloneNode(true);
  ghost.classList.add('dragging');
  ghost.style.position = 'absolute';
  const homeLeft = tileRect.left - stageRect.left;
  const homeTop  = tileRect.top  - stageRect.top;
  ghost.style.left = homeLeft + 'px';
  ghost.style.top  = homeTop  + 'px';
  ghost.style.width  = tileRect.width  + 'px';
  ghost.style.height = tileRect.height + 'px';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '50';
  stage.appendChild(ghost);
  tile.el.style.opacity = '0.25';

  dragState = {
    tile, ghost,
    startX: e.clientX, startY: e.clientY,
    offX: e.clientX - tileRect.left,
    offY: e.clientY - tileRect.top,
    homeLeft, homeTop,
    tileW: tileRect.width, tileH: tileRect.height,
    isDrag: false,
  };

  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup',   onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

function onPointerMove(e) {
  if (!dragState) return;
  const dx = e.clientX - dragState.startX;
  const dy = e.clientY - dragState.startY;
  if (!dragState.isDrag && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
    dragState.isDrag = true;
  }
  if (dragState.isDrag) {
    e.preventDefault();
    const stage = document.getElementById('stage');
    const stageRect = stage.getBoundingClientRect();
    dragState.ghost.style.left = (e.clientX - stageRect.left - dragState.offX) + 'px';
    dragState.ghost.style.top  = (e.clientY - stageRect.top  - dragState.offY) + 'px';
  }
}

function onPointerUp(e) {
  if (!dragState) return;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup',   onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);

  const s = dragState;
  dragState = null;

  if (!s.isDrag) {
    // ---- TAP MODE ----
    const target = opts?.findCellForLetter?.(s.tile.ch);
    if (target) {
      flying = true;
      flyGhostToCell(s.tile, s.ghost, target);
    } else {
      flying = true;
      rejectThroughCursor(s.tile, s.ghost, s);
    }
    return;
  }

  // ---- DRAG MODE ----
  const cellEl = cellUnderPoint(e.clientX, e.clientY);
  const cursor = opts?.getCursorCell?.();
  if (cellEl && cellEl.classList.contains('empty')) {
    const r = +cellEl.dataset.r, c = +cellEl.dataset.c;
    if (cursor && r === cursor.r && c === cursor.c && cursor.ch === s.tile.ch) {
      flying = true;
      flyGhostToCell(s.tile, s.ghost, cursor);
      return;
    }
    // wrong: flash the cell they tried
    opts?.onWrongCell?.(r, c);
  } else if (cursor) {
    // off-grid → just flash the cursor cell to remind where it should go
    opts?.onWrongCell?.(cursor.r, cursor.c);
  }
  // spring back from drop point to bank slot
  flying = true;
  springGhostHome(s.tile, s.ghost, s);
  opts?.onWrongDrop?.();
}

// ----- shared animation helpers -----

function flyGhostToCell(tile, ghost, target) {
  const stage = document.getElementById('stage');
  const cellEl = document.querySelector(`.cell.empty[data-r="${target.r}"][data-c="${target.c}"]`);
  if (!stage || !cellEl) { flying = false; ghost.remove(); tile.el.style.opacity = ''; return; }
  const stageRect = stage.getBoundingClientRect();
  const cellRect  = cellEl.getBoundingClientRect();

  requestAnimationFrame(() => {
    ghost.style.transition =
      'left .22s cubic-bezier(.34,1.56,.64,1),' +
      'top .22s cubic-bezier(.34,1.56,.64,1),' +
      'width .22s ease, height .22s ease';
    ghost.style.left = (cellRect.left - stageRect.left) + 'px';
    ghost.style.top  = (cellRect.top  - stageRect.top)  + 'px';
    ghost.style.width  = cellRect.width  + 'px';
    ghost.style.height = cellRect.height + 'px';
  });
  setTimeout(() => {
    ghost.style.transition = 'transform .09s ease-out';
    ghost.style.transform = 'scale(1.25, 0.78)';
  }, 220);
  setTimeout(() => {
    ghost.style.transition = 'transform .12s ease-out';
    ghost.style.transform = 'scale(1, 1)';
  }, 310);
  setTimeout(() => {
    ghost.remove();
    tile.el.style.opacity = '';
    tile.el.classList.add('gone');
    flying = false;
    opts?.onCorrect?.(target.r, target.c, tile.ch, tile);
  }, 440);
}

// TAP-wrong: fly to cursor cell, red flash, then back to bank slot
function rejectThroughCursor(tile, ghost, s) {
  const cursor = opts?.getCursorCell?.();
  const stage = document.getElementById('stage');
  const cellEl = cursor ? document.querySelector(`.cell[data-r="${cursor.r}"][data-c="${cursor.c}"]`) : null;
  if (!cursor || !cellEl || !stage) {
    // fallback wiggle in bank
    tile.el.classList.remove('wiggle');
    void tile.el.offsetWidth;
    tile.el.classList.add('wiggle');
    setTimeout(() => tile.el.classList.remove('wiggle'), 320);
    ghost.remove();
    tile.el.style.opacity = '';
    flying = false;
    opts?.onWrongDrop?.();
    return;
  }
  const stageRect = stage.getBoundingClientRect();
  const cellRect  = cellEl.getBoundingClientRect();

  // fly to cursor cell
  requestAnimationFrame(() => {
    ghost.style.transition = 'left .22s ease-out, top .22s ease-out, width .22s ease-out, height .22s ease-out';
    ghost.style.left = (cellRect.left - stageRect.left) + 'px';
    ghost.style.top  = (cellRect.top  - stageRect.top)  + 'px';
    ghost.style.width  = cellRect.width  + 'px';
    ghost.style.height = cellRect.height + 'px';
  });
  setTimeout(() => {
    opts?.onWrongCell?.(cursor.r, cursor.c);
    opts?.onWrongDrop?.();
    ghost.style.transition = 'background .12s, color .12s, transform .1s';
    ghost.style.background = 'linear-gradient(180deg, #ff8893 0%, #c8203a 100%)';
    ghost.style.color = '#fff';
    ghost.style.transform = 'scale(1.08)';
    ghost.style.boxShadow = '0 4px 14px rgba(255,40,60,0.7), 0 0 18px rgba(255,40,60,0.6)';
  }, 230);
  setTimeout(() => { ghost.style.transform = 'scale(0.94)'; }, 340);
  setTimeout(() => { ghost.style.transform = 'scale(1)'; }, 430);
  // back to bank
  setTimeout(() => {
    ghost.style.transition =
      'left .3s cubic-bezier(.34,1.56,.64,1), top .3s cubic-bezier(.34,1.56,.64,1), ' +
      'width .25s ease, height .25s ease, background .25s ease, color .25s ease, box-shadow .25s ease, transform .2s ease';
    ghost.style.left = s.homeLeft + 'px';
    ghost.style.top  = s.homeTop  + 'px';
    ghost.style.width  = s.tileW + 'px';
    ghost.style.height = s.tileH + 'px';
    ghost.style.background = '';
    ghost.style.color = '';
    ghost.style.boxShadow = '';
  }, 560);
  setTimeout(() => {
    ghost.remove();
    tile.el.style.opacity = '';
    flying = false;
  }, 880);
}

// DRAG-wrong: spring back from wherever the ghost was released
function springGhostHome(tile, ghost, s) {
  ghost.style.transition =
    'left .32s cubic-bezier(.34,1.56,.64,1), top .32s cubic-bezier(.34,1.56,.64,1), ' +
    'width .2s ease, height .2s ease';
  ghost.style.left = s.homeLeft + 'px';
  ghost.style.top  = s.homeTop  + 'px';
  ghost.style.width  = s.tileW + 'px';
  ghost.style.height = s.tileH + 'px';
  setTimeout(() => {
    ghost.remove();
    tile.el.style.opacity = '';
    flying = false;
  }, 360);
}

function cellUnderPoint(x, y) {
  const list = document.elementsFromPoint(x, y);
  return list.find(el => el.classList?.contains('cell')) || null;
}
