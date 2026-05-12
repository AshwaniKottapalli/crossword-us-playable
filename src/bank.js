// Tile bank — TAP-TO-PLACE.
// Player taps a tile; the game decides which active-word empty cell it
// belongs to. Correct → tile flies to cell with snap juice. Wrong → tile
// wiggles in place, optional cursor cell flashes red.

let bankEl = null;
let tiles = [];     // [{ id, ch, el }]
let opts = null;
let flying = false; // true while a tile is mid-flight (block extra taps)
let nextId = 1;

export function renderBank(letters, options) {
  opts = options;
  bankEl = document.getElementById('bank');
  bankEl.innerHTML = '';
  tiles = [];
  flying = false;
  for (const ch of letters) {
    const id = 't' + (nextId++);
    const el = document.createElement('div');
    el.className = 'tile';
    el.textContent = ch;
    el.dataset.ch = ch;
    el.dataset.id = id;
    el.addEventListener('pointerdown', onTileTap);
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

function onTileTap(e) {
  if (flying) return;
  const el = e.currentTarget;
  if (el.classList.contains('gone')) return;
  e.preventDefault();
  const tile = tiles.find(t => t.el === el);
  if (!tile) return;

  opts?.onDragStart?.(); // unlock audio on first interaction

  const target = opts?.findCellForLetter?.(tile.ch) || null;
  if (target) flyToCell(tile, target);
  else        wrongTap(tile);
}

function flyToCell(tile, target) {
  const stage = document.getElementById('stage');
  const cellEl = document.querySelector(`.cell.empty[data-r="${target.r}"][data-c="${target.c}"]`);
  if (!stage || !cellEl) return;

  flying = true;
  const stageRect = stage.getBoundingClientRect();
  const tileRect = tile.el.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();

  // ghost clone overlays the bank tile
  const ghost = tile.el.cloneNode(true);
  ghost.classList.add('dragging');
  ghost.style.position = 'absolute';
  ghost.style.left = (tileRect.left - stageRect.left) + 'px';
  ghost.style.top  = (tileRect.top  - stageRect.top)  + 'px';
  ghost.style.width  = tileRect.width  + 'px';
  ghost.style.height = tileRect.height + 'px';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '50';
  stage.appendChild(ghost);
  tile.el.style.opacity = '0.25';

  // fly to the cell — squash on land
  requestAnimationFrame(() => {
    ghost.style.transition =
      'left .24s cubic-bezier(.34,1.56,.64,1),' +
      'top .24s cubic-bezier(.34,1.56,.64,1),' +
      'width .24s ease, height .24s ease';
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

function wrongTap(tile) {
  const cursor = opts?.getCursorCell?.();
  const cellEl = cursor ? document.querySelector(`.cell[data-r="${cursor.r}"][data-c="${cursor.c}"]`) : null;
  const stage = document.getElementById('stage');
  // no cursor cell (puzzle done, edge case) — just wiggle in bank
  if (!cursor || !cellEl || !stage) {
    tile.el.classList.remove('wiggle');
    void tile.el.offsetWidth;
    tile.el.classList.add('wiggle');
    setTimeout(() => tile.el.classList.remove('wiggle'), 320);
    opts?.onWrongDrop?.();
    return;
  }

  flying = true;
  const stageRect = stage.getBoundingClientRect();
  const tileRect = tile.el.getBoundingClientRect();
  const cellRect = cellEl.getBoundingClientRect();

  const ghost = tile.el.cloneNode(true);
  ghost.classList.add('dragging');
  ghost.style.position = 'absolute';
  ghost.style.left = (tileRect.left - stageRect.left) + 'px';
  ghost.style.top  = (tileRect.top  - stageRect.top)  + 'px';
  ghost.style.width  = tileRect.width  + 'px';
  ghost.style.height = tileRect.height + 'px';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '50';
  stage.appendChild(ghost);
  tile.el.style.opacity = '0.25';

  // 1) fly to cell
  requestAnimationFrame(() => {
    ghost.style.transition = 'left .22s ease-out, top .22s ease-out, width .22s ease-out, height .22s ease-out';
    ghost.style.left = (cellRect.left - stageRect.left) + 'px';
    ghost.style.top  = (cellRect.top  - stageRect.top)  + 'px';
    ghost.style.width  = cellRect.width  + 'px';
    ghost.style.height = cellRect.height + 'px';
  });

  // 2) on arrival: red flash on cell + tile turns red + thud
  setTimeout(() => {
    opts?.onWrongCell?.(cursor.r, cursor.c);
    opts?.onWrongDrop?.();   // audio thud + streak reset
    ghost.style.transition = 'background .12s, color .12s, transform .1s';
    ghost.style.background = 'linear-gradient(180deg, #ff8893 0%, #c8203a 100%)';
    ghost.style.color = '#fff';
    ghost.style.transform = 'scale(1.08)';
    ghost.style.boxShadow = '0 4px 14px rgba(255,40,60,0.7), 0 0 18px rgba(255,40,60,0.6)';
  }, 230);
  setTimeout(() => { ghost.style.transform = 'scale(0.94)'; }, 340);
  setTimeout(() => { ghost.style.transform = 'scale(1)'; }, 430);

  // 3) fly back to the original tile slot
  setTimeout(() => {
    const tRect2 = tile.el.getBoundingClientRect();
    ghost.style.transition =
      'left .3s cubic-bezier(.34,1.56,.64,1), ' +
      'top .3s cubic-bezier(.34,1.56,.64,1), ' +
      'width .25s ease, height .25s ease, ' +
      'background .25s ease, color .25s ease, box-shadow .25s ease, transform .2s ease';
    ghost.style.left = (tRect2.left - stageRect.left) + 'px';
    ghost.style.top  = (tRect2.top  - stageRect.top)  + 'px';
    ghost.style.width  = tileRect.width  + 'px';
    ghost.style.height = tileRect.height + 'px';
    ghost.style.background = '';
    ghost.style.color = '';
    ghost.style.boxShadow = '';
  }, 560);

  // 4) cleanup
  setTimeout(() => {
    ghost.remove();
    tile.el.style.opacity = '';
    flying = false;
  }, 880);
}
