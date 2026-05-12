// Tile bank — pointer-event drag/drop into grid cells.
// Public API: renderBank(letters, opts), onCorrect callback wired via opts.

let bankEl = null;
let tiles = [];     // [{ id, ch, el }]
let opts = null;
let dragging = null; // { tile, ghost, origin: {x,y}, pointerId }
let nextId = 1;

export function renderBank(letters, options) {
  opts = options;
  bankEl = document.getElementById('bank');
  bankEl.innerHTML = '';
  tiles = [];
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

export function tileRect(tile) {
  return tile.el.getBoundingClientRect();
}

export function targetTile(tile, on) {
  tile.el.classList.toggle('target', !!on);
}

export function clearAllTargets() {
  tiles.forEach(t => t.el.classList.remove('target'));
}

function onPointerDown(e) {
  if (dragging) return;
  const el = e.currentTarget;
  if (el.classList.contains('gone')) return;
  e.preventDefault();
  const rect = el.getBoundingClientRect();
  const stageRect = document.getElementById('stage').getBoundingClientRect();

  // build a ghost clone overlay
  const ghost = el.cloneNode(true);
  ghost.classList.add('dragging');
  ghost.style.position = 'absolute';
  ghost.style.left = (rect.left - stageRect.left) + 'px';
  ghost.style.top  = (rect.top  - stageRect.top)  + 'px';
  ghost.style.width  = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.pointerEvents = 'none';
  document.getElementById('stage').appendChild(ghost);

  el.style.opacity = '0.25';

  dragging = {
    tile: tiles.find(t => t.el === el),
    ghost,
    pointerId: e.pointerId,
    offX: e.clientX - rect.left,
    offY: e.clientY - rect.top,
    origin: { left: rect.left - stageRect.left, top: rect.top - stageRect.top },
  };

  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  opts?.onDragStart?.();
}

function onPointerMove(e) {
  if (!dragging) return;
  e.preventDefault();
  const stageRect = document.getElementById('stage').getBoundingClientRect();
  const x = e.clientX - stageRect.left - dragging.offX;
  const y = e.clientY - stageRect.top  - dragging.offY;
  dragging.ghost.style.left = x + 'px';
  dragging.ghost.style.top  = y + 'px';

  // optional: highlight cell under pointer
  const cell = cellUnder(e.clientX, e.clientY);
  document.querySelectorAll('.cell.empty.hover').forEach(c => c.classList.remove('hover'));
  if (cell) cell.classList.add('hover');
}

function onPointerUp(e) {
  if (!dragging) return;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  document.querySelectorAll('.cell.empty.hover').forEach(c => c.classList.remove('hover'));

  const { tile, ghost } = dragging;
  const dropCell = cellUnder(e.clientX, e.clientY);
  dragging = null;

  if (dropCell && dropCell.classList.contains('empty')) {
    const r = +dropCell.dataset.r, c = +dropCell.dataset.c;
    const expected = opts?.expectedChar?.(r, c);
    if (expected === tile.ch) {
      // correct drop — animate ghost into cell with squash-stretch, then remove
      const target = dropCell.getBoundingClientRect();
      const stageRect = document.getElementById('stage').getBoundingClientRect();
      ghost.style.transition = 'left .16s ease, top .16s ease, transform .16s ease';
      ghost.style.left = (target.left - stageRect.left) + 'px';
      ghost.style.top  = (target.top  - stageRect.top)  + 'px';
      ghost.style.width  = target.width + 'px';
      ghost.style.height = target.height + 'px';
      // mid-flight: prep for squash on land
      setTimeout(() => {
        ghost.style.transition = 'transform .09s ease-out';
        ghost.style.transform = 'scale(1.25, 0.78)';
      }, 150);
      setTimeout(() => {
        ghost.style.transition = 'transform .12s ease-out';
        ghost.style.transform = 'scale(1, 1)';
      }, 240);
      setTimeout(() => {
        ghost.remove();
        tile.el.style.opacity = '';
        tile.el.classList.add('gone');
        opts?.onCorrect?.(r, c, tile.ch, tile);
      }, 360);
      return;
    } else {
      // wrong cell — flash it red
      opts?.onWrongCell?.(r, c);
    }
  }

  // wrong / off-grid drop — wiggle the ghost then spring back to the tile's home slot.
  ghost.classList.add('wiggle');
  const tRect = tile.el.getBoundingClientRect();
  const stageRect = document.getElementById('stage').getBoundingClientRect();
  ghost.style.transition = 'left .28s cubic-bezier(.34,1.56,.64,1), top .28s cubic-bezier(.34,1.56,.64,1)';
  ghost.style.left = (tRect.left - stageRect.left) + 'px';
  ghost.style.top  = (tRect.top  - stageRect.top)  + 'px';
  setTimeout(() => {
    ghost.remove();
    tile.el.style.opacity = '';
    opts?.onWrongDrop?.();
  }, 320);
}

function cellUnder(x, y) {
  // need to temporarily skip the ghost (it has pointer-events:none already)
  const list = document.elementsFromPoint(x, y);
  return list.find(el => el.classList?.contains('cell') && el.classList.contains('empty')) || null;
}
