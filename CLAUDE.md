# Playable Ad — Claude Working Doc

A starter contract for building HTML5 playable ads with Claude — **2D (word/puzzle/match-3) or 3D (runner/action/sandbox)**, picked per project. Copy this file into the root of every new playable project. It tells Claude *what* we're building, *how* we build it, and *how I prefer to work*.

---

## 1. What we're building

A **playable ad** — either **2D** (word, match-3, puzzle, hidden-object, idle-clicker) or **3D** (runner, sandbox, action, physics). Short-form interactive HTML5 advertisement that runs in mobile browsers / ad-network sandboxes (Google Ads, Meta, IronSource, AppLovin, Mintegral, TikTok, Snapchat). Typically:

- Portrait orientation, 9:16
- 15–60 seconds of gameplay (shorter for word/puzzle, longer for 3D action)
- One short mechanic loop, easy to learn
- Always funnels to a store-install CTA
- Total deliverable: a single self-contained HTML or zipped folder, **under 5 MB** for most networks (Snapchat is tightest at ~2.5 MB)

**Pick 2D vs 3D by genre, not by default.** If the real game is flat (crossword, word, match-3, casual puzzle) → 2D. If the real game has perspective/depth/physics → 3D. Mismatched stack = bait-and-switch with the real game = lower CVR.

The goal is conversion (install rate), not gameplay depth.

---

## 2. Tech stack

### Shared (both 2D and 3D)

| Concern | Choice | Why |
|---|---|---|
| Audio | **Web Audio API** — procedural SFX + optional file-loaded voiceover | Zero asset cost for SFX, files only for voice/music |
| UI overlays | **DOM + CSS** | Easier to style, faster to iterate, smaller than canvas/3D text |
| Dev server | `python3 serve.py 8080` (custom static server with `Cache-Control: no-store`) | ES modules cache aggressively in browsers; this kills the cache |
| Module system | Vanilla ES modules (`<script type="module">`), no bundler | Smallest payload, no toolchain |
| Deploy | **GitHub Pages** for quick previews; later **single-file HTML bundle** for ad networks | Free hosting; ad networks require self-contained deliverable |

### 2D playables (word, puzzle, match-3, casual)

| Concern | Choice | Why |
|---|---|---|
| Rendering | **DOM + CSS Grid** for game board/tiles, **Canvas2D** for particles/fx overlay | Crosswords/match-3 are literally CSS grids; DOM hit-testing is free; CSS animations are GPU-accelerated |
| Particles | Custom Canvas2D particle system with multiple sub-channels (sparkle / confetti / glow) | One canvas overlay covering the stage; zero shaders |
| Assets | **Inline SVG** for clue icons / decorative art; PNG/WebP for the few raster needs | Tiny, scalable, themeable via CSS |
| Animation | CSS keyframes + transitions for tiles/banners/finger; JS-driven only for choreographed sequences (cascades) | Hand off to GPU wherever possible |

### 3D playables (runner, action, sandbox, physics)

| Concern | Choice | Why |
|---|---|---|
| 3D engine | **Three.js** (vanilla, ES modules via import map, no bundler) | Smallest payload, full control, no toolchain |
| Asset format | **GLB** for models (embedded textures), **FBX** only for animation clips | Cleanest export from Blender; Mixamo for animations |
| Particles | Custom **THREE.Points** system with multiple sub-channels (sparkle / dust / confetti) | One shader, three blend modes, zero asset cost |
| Sky | Procedural gradient sphere as fallback, equirectangular JPG/HDR if provided | Skips a 200 KB+ HDR until needed |

---

## 3. Project structure

### 2D layout (word / puzzle / match-3)

```
.
├── index.html              entrypoint, DOM grid container, letter/tile bank, CTA overlay
├── src/
│   ├── main.js             boot: resolve theme, build game, wire input
│   ├── game.js             state machine + update loop (e.g. INTRO → PLAYING → CASCADE → WIN → CTA)
│   ├── grid.js             game board renderer (CSS grid cells, animations)
│   ├── puzzle.js / config  puzzle data (cells, words, levels)
│   ├── bank.js             tile/letter bank + input
│   ├── cascade.js          choreographed chain reactions (the "wow" moment)
│   ├── particles.js        Canvas2D multi-channel particle system
│   ├── ui.js               tutorial finger, banners, score, CTA card
│   ├── audio.js            Web Audio (procedural + optional buffer playback)
│   ├── icons.js            inline SVG asset registry
│   └── config.js           SINGLE source of truth for all tunables
├── assets/
│   ├── icons/              raster overrides if SVG isn't enough
│   ├── ui/                 logo, CTA button bg, star badge
│   ├── themes/<name>/      per-theme overrides — palette/icons/copy
│   └── audio/              voice/music MP3 (optional)
├── serve.py                static server with no-cache headers
└── CLAUDE.md               this file
```

### 3D layout (runner / action / sandbox)

```
.
├── index.html              entrypoint, import map, UI overlay DOM
├── src/
│   ├── main.js             renderer, scene, lighting, post-FX, sky/backdrop
│   ├── game.js             state machine + main update loop
│   ├── player.js           character loading, animation mixer, controls
│   ├── level.js            level mesh builders from config
│   ├── plankSystem.js      gameplay-specific systems (replace per game)
│   ├── ui.js               loading / tutorial / CTA overlays
│   ├── audio.js            Web Audio engine (procedural + buffer playback)
│   ├── particles.js        THREE.Points multi-channel particle system
│   ├── sky.js              procedural gradient sky
│   ├── toon.js             cel-shading utilities (Material → MeshToonMaterial)
│   ├── mathGate.js         per-game obstacle prefabs (rename per project)
│   └── config.js           SINGLE source of truth for all tunables
├── assets/
│   ├── models/             *.glb (preferred) and *.fbx
│   ├── animations/         per-clip FBX from Mixamo
│   ├── textures/           common textures (icon, logo, etc.)
│   ├── themes/<name>/      per-theme overrides — backdrop/plank/path/voice
│   ├── audio/              voice/music MP3
│   └── ui/                 tutorial sprites if PNG-based
├── vendor/                 Three.js + addons (vendored at packaging time)
├── serve.py                static server with no-cache headers
└── CLAUDE.md               this file
```

---

## 4. Architecture conventions

- **`config.js` is the single source of truth**. Every tunable — speeds, colors, level layout, branding, theme paths, UI text — lives here. New features add a config entry first, then wire the code to read it.
- **Theme system**: URL `?theme=NAME` switches between bundles defined in `CONFIG.themes`. Each theme overrides: backdrop image, plank/path textures, intro/end voiceover. `getActiveTheme()` resolves on boot, all loaders read from it.
- **Async loaders auto-fallback**: every texture/audio load does a `fetch(url, { method: 'HEAD' })` check first. If the file isn't there, log and silently fall back. Never crash on a missing optional asset.
- **State machine in `game.js`**: explicit STATE constants (INTRO, PLAYING, WIN, FAIL, 'cta-shown'). Single `update(dt)` loop branches on state.
- **Callbacks over events** for cross-module hooks: `player.onMoveStart`, `player.onReady`, `plankSystem.onBridgePlank`. Simple, debuggable, no event bus.
- **Letterbox to portrait**: viewport always renders inside a 9:16 box centered on screen. `getViewSize()` returns container dims (not window dims). Resize listeners + `ResizeObserver` on `#app`.
- **Procedural-first**: any asset that *can* be drawn at runtime (skies, particles, simple sprites, **clue icons via inline SVG**) should be. Add real files only when procedural isn't enough.
- **2D-specific**: prefer DOM/CSS over Canvas2D for anything hit-testable or text-based (tiles, cells, banners). Canvas2D earns its place only for overlays that need free-form drawing (particles, custom shapes). Never reach for 3D in a 2D ad — it's a CVR hazard.

---

## 5. UX patterns

- **No "Tap to Play" splash**. Loading screen → game starts immediately with bear in idle + tutorial overlay.
- **Tutorial dismisses on first interaction** — drag, key, tap. Auto-fires audio unlock at the same time.
- **CTA appears on BOTH win and fail** — fail also offers a secondary "Try Again" link. Always funnels toward install.
- **Audio unlock**: Web Audio context is created on game start (suspended on web, often pre-unlocked in ad networks). Globally listen for `pointerdown` / `keydown` / `touchstart` to call `ctx.resume()`. Queue any `play()` calls made while suspended; drain on `statechange === 'running'`.
- **Bear/character paused** during tutorial via a flag the `update` loop respects (`tutorialPaused`). Same pattern for climbing or any other "frozen" state.
- **Camera follows with `.lerp(target, 0.12)`** — never rigid. Camera shake = additive random offset for N frames after impact events.
- **Voice always optional**: ship procedural SFX that work without files. Drop in `voice_intro.mp3` / `voice_end.mp3` later.


---

## 7. Audio conventions

- Procedural SFX for: pickup, gate_pos, gate_neg, thud, shatter, win, fail
- File-loaded MP3s for: `voice_intro`, `voice_end`, optional `music`
- `audio.play(name)` prefers a loaded buffer; falls back to procedural recipe; queues if context still suspended
- Voice files come from `getActiveTheme().intro_voice` / `.end_voice` — themed per variant
- Master gain `0.5`; voice gain `1.0`; procedural SFX baked in via `_tone` envelope per-recipe

---

## 8. Coding rules

- **No comments that restate the code.** Explain *why* (a hidden constraint, a subtle invariant, an incident that drove the decision). Otherwise: no comment.
- **No dead code, no "removed" stubs, no backwards-compat shims.** Delete and move on.
- **Don't add error handling for impossible cases.** Trust framework guarantees. Validate at system boundaries only.
- **Prefer editing over creating** new files. New files have a real reason.
- **Single-responsibility modules.** `player.js` doesn't know about gates. `game.js` orchestrates.
- **Tunables live in `config.js`**, behavior in code. If you find yourself hardcoding a magic number, move it to config first.
- **File-reference format**: when pointing at code, use `[filename.js:42](src/filename.js#L42)` so I can click through in my IDE.

---

## 9. How I want Claude to work with me

### Communication

- **Be direct.** Skip the "Great question!" / "I'll help you with that" preamble. Just do the thing.
- **Short, dense responses.** Two sentences > two paragraphs when the answer is simple.
- **Honest reads** — when I ask "should I do X?", give me a real recommendation with the main tradeoff. Don't hedge.
- **Strong opinions when asked, neutral when not.** If I ask "what should we do?", answer. If I ask "what are the options?", list them.
- **Plain text by default**; markdown only when it actually aids scanning (tables, code, lists of options).

### Pacing

- **TodoWrite for multi-step tasks** so I can see progress. Update it as you complete steps.
- **AskUserQuestion when there's a branching decision** I'd actually want to weigh in on. Don't ask about things you can decide yourself.
- **Max 4 questions per batch.** Don't death-by-1000-questions me.

### Quality

- **Don't over-engineer.** A bug fix doesn't need a refactor. A one-shot doesn't need a helper.
- **Don't add features I didn't ask for.** If you think something should also be done, *suggest* it after.
- **Don't ship partial work.** Either the change is complete or it's flagged as in-progress.
- **Test the syntax** before declaring done — `node --check src/*.js`.

### Safety

- **Never destructive git ops** (`reset --hard`, `push --force`, `branch -D`, `rm` of tracked files) without explicit ask.
- **Don't push to remote** unless I asked you to.
- **Don't commit unless I asked** — and never `--amend` an already-pushed commit.
- **`.claude/` and `.DS_Store` always ignored.**

### Decisions

- **Default to portrait 9:16** unless I say otherwise.
- **Default to <2.5 MB** target size — Snapchat is the tightest network.
- **Default to GitHub Pages preview** for sharing builds.
- **Default to GLB > FBX** for new models (3D projects).
- **Default to 2D for word/puzzle/match-3 genres**; 3D only when the real game is 3D.

---

## 10. Common workflows

### Adding a new theme variant

1. Drop into `assets/themes/<name>/`: `backdrop.jpg`, `plank.jpg`, `path.jpg`, optionally `voice_intro.mp3` + `voice_end.mp3`.
2. Add an entry to `CONFIG.themes` in `config.js`.
3. Visit `?theme=<name>` — auto-loads.

### Adding a new SFX

1. If it can be procedural: add a recipe method in `audio.js` (`_yourSound()`) and route it from `play(name)` switch.
2. If it must be a file: drop at `assets/audio/<name>.mp3`, call `audio.loadFile(name, url)` once, then `audio.play(name)` plays it.

### Adding a new gameplay event particle

1. Pick a kind (`sparkle` / `dust` / `confetti`).
2. Call `this.particles.emit(position, count, { kind, color, size, speed, gravity, lifetime, upBias, spread })` at the event site.
3. If new kind needed, add a new `SubSystem` in `particles.js` with its own texture + blend mode.

### Shipping to an ad network

1. Verify size under network limit (`du -sh .` minus `.git`).
2. Bundle vendor Three.js inline (single-file build).
3. Add network-specific adapter (Meta `FbPlayableAd.onCTAClick`, Google `clickTag`, IronSource MRAID).
4. Test on real device, both iOS Safari and Android Chrome.
5. Zip the build folder if the network wants a zip; otherwise single self-contained `index.html`.

---

## 11. Don't waste tokens on

- Restating what I just said
- Apologizing for previous mistakes — fix them and move on
- Explaining well-known Three.js / Web Audio basics
- "Let me know if you have any questions!" closers
- Asking permission for trivial reversible edits
