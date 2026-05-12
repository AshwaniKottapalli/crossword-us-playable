// Active hint pill — shows clue for current target word.

let pillEl = null;

export function initHint() {
  pillEl = document.getElementById('hint');
}

export function setHint(text) {
  if (!pillEl) initHint();
  pillEl.style.opacity = '0';
  setTimeout(() => {
    pillEl.textContent = 'HINT : ' + text;
    pillEl.style.opacity = '1';
  }, 180);
}

export function hideHint() {
  if (pillEl) pillEl.style.opacity = '0';
}
