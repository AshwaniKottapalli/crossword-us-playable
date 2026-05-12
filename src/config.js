export const CONFIG = {
  cta: {
    gameName:  'Crossword Go',
    playStore: 'https://play.google.com/store/apps/details?id=in.playsimple.crossword.go&hl=en_IN',
    appStore:  'https://apps.apple.com/us/app/crossword-go/id6739069151',
    headline:  'Install to unlock Level 6',
    sub:       'Reach Level 10 for real — free to play',
    button:    'INSTALL NOW',
  },

  intro: {
    copy:           'Only 1% of Americans can reach Level 5',
    button:         'PROVE IT',
    autoAdvanceMs:  2000,
  },

  win: {
    banner: 'YOU REACHED LEVEL 5! 🎉',
    holdMs: 1400,
  },

  tease: {
    badge:  '🔒 LEVEL 6',
    holdMs: 1000,
  },

  idleHelperMs: 10000,

  theme: {
    backdrop: 'assets/backdrop.jpg',
    hand:     'assets/hand.png',
    logo:     'assets/logo.png',
  },

  audio: {
    voiceIntro: 'assets/audio/voice_intro.mp3',
    voiceWin:   'assets/audio/voice_win.mp3',
    masterGain: 0.5,
    voiceGain:  1.0,
  },
};

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function storeUrl() {
  return isIOS() ? CONFIG.cta.appStore : CONFIG.cta.playStore;
}
