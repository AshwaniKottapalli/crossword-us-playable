// State machine: LOADING → INTRO → PLAYING → WIN → CTA.

import { PUZZLE, bankForWord } from './puzzles.js';
import * as Grid from './grid.js';
import * as Bank from './bank.js';
import * as Hint from './hint.js';
import * as Finger from './finger.js';
import * as Cascade from './cascade.js';
import * as Audio from './audio.js';
import * as UI from './ui.js';

const STATE = { LOADING:'LOADING', INTRO:'INTRO', PLAYING:'PLAYING', WIN:'WIN', CTA:'CTA' };
let state = STATE.LOADING;
let activeWord = null;
let streak = 0;
const completedWords = new Set();

export function start() {
  Audio.initAudio();
  document.addEventListener('pointerdown', () => Audio.unlock(), { once: true });
  setState(STATE.INTRO);
}

function setState(next) {
  state = next;
  switch (state) {
    case STATE.INTRO:    enterIntro();   break;
    case STATE.PLAYING:  enterPlaying(); break;
    case STATE.WIN:      enterWin();     break;
    case STATE.CTA:      enterCta();     break;
  }
}

function enterIntro() {
  Audio.play('voice_intro');     // queues until audio context unlocks
  UI.showIntro(() => {
    Audio.unlock();
    setState(STATE.PLAYING);
  });
}

function enterPlaying() {
  Hint.initHint();
  const gridEl = document.getElementById('grid');
  Grid.renderGrid(PUZZLE, gridEl);

  Finger.initFinger({
    getActiveWord:  () => activeWord,
    getFingerTarget,
    onTargetTile:   (tile, on) => Bank.targetTile(tile, on),
    onTargetCell:   (r, c, on) => {
      const el = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
      if (el) el.classList.toggle('target', on);
    },
  });

  advanceActiveWord();
  Finger.arm();
}

function getFingerTarget() {
  if (!activeWord) return null;
  const next = Grid.findFirstEmptyOf(activeWord);
  if (!next) return null;
  const tile = Bank.tileWithChar(next.ch);
  if (!tile) return null;
  return { tile, cell: next };
}

function advanceActiveWord() {
  const next = PUZZLE.words.find(w => !completedWords.has(w.id) && !Grid.isWordComplete(w));
  activeWord = next || null;
  Grid.setActiveWord(activeWord);
  if (activeWord) {
    Hint.setHint(activeWord.hint);
    Bank.renderBank(bankForWord(PUZZLE, activeWord), {
      expectedChar: (r, c) => Grid.expectedChar(r, c),
      onCorrect:    onCorrectDrop,
      onWrongCell:  (r, c) => UI.flashCellWrong(r, c),
      onWrongDrop:  () => { Audio.play('thud'); streak = 0; UI.setStreak(0); },
      onDragStart:  () => Audio.unlock(),
    });
  } else {
    Hint.hideHint();
    Bank.clearBank();
  }
}

function onCorrectDrop(r, c, ch, tile) {
  Audio.play('pop');
  Grid.markCorrect(r, c, ch);
  UI.ringBurstAt(r, c);
  UI.shakeStage();
  streak++;
  UI.setStreak(streak);

  // detect newly-completed words (a drop may complete more than one word via crossings)
  let praisedThisDrop = false;
  for (const w of PUZZLE.words) {
    if (completedWords.has(w.id)) continue;
    if (Grid.isWordComplete(w)) {
      completedWords.add(w.id);
      Cascade.celebrateWord(w, Audio);
      if (!praisedThisDrop) {
        // delay so the praise lands AFTER the cell cascade kicks in,
        // and isn't drowned out by the ring burst + shake on the same frame.
        setTimeout(() => UI.popPraise(), 280);
        praisedThisDrop = true;
      }
    }
  }

  if (completedWords.size === PUZZLE.words.length) {
    setTimeout(() => setState(STATE.WIN), 900);
    return;
  }

  if (activeWord && completedWords.has(activeWord.id)) {
    setTimeout(advanceActiveWord, 800);
  }
}

function enterWin() {
  Finger.disarm();
  Audio.play('voice_win');
  Cascade.celebrateAll(Audio);
  UI.showWinBanner(() => setState(STATE.CTA));
}

function enterCta() {
  UI.showCTA();
}
