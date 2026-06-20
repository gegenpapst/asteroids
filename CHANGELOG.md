# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — release/2.1.0

### Added

- Screen-feedback "juice": camera shake on explosions and player death, an additive flash when destroying a UFO or solar-system center, and a red damage vignette on player death (`SHAKE_*`, `FLASH_*`, `VIGNETTE_*` constants)
- Bullets now render an additive glow head with a short motion-trail streak; ship thrust gained a layered, gradient flame cone

### Fixed

- Split asteroids now inherit the render style (polygon or metaball) of their parent — previously both halves always defaulted to the same style regardless of what the parent displayed

### Internal

- Extracted `CollisionSystem` class (`src/CollisionSystem.js`): bullet and ship collision logic moved out of `Game.js`
- Extracted `UIRenderer` class (`src/UIRenderer.js`): all HUD and screen renderers (start, help, config, game-over) moved out of `Game.js`
- Added `onDestroy(game)` hook to `AsteroidBase`/`SatelliteClusterAsteroid`: satellite cleanup no longer requires `Game` to inspect entity internals
- Split `Globals.js` into `canvas.js` (canvas setup) and `input.js` (`Input` singleton)
- Extracted `utils.js` (`TAU`, `rand`, `wrap`, `clamp`, `dist`, `safeSplitAngle`)
- `draw(ctx)` now receives `ctx` as a parameter across all entities (no implicit global dependency)
- Removed unused `VisualMode` abstraction (only one render mode remains)
- `Game.js` reduced from 1 536 to 848 lines

---

## [release/2.0.0] — 2025 (b3752c6)

### Added

- Start screen: asteroid style comparison showcase — polygon (A) vs. metaball (B) side by side
- Per-asteroid render style: each asteroid independently uses polygon or metaball rendering

### Changed

- Polygon asteroid physics body now built from actual vertices (`fromVertices`) instead of compound circles — hitbox matches the visual exactly
- Asteroid shape is more irregular: larger bumps, smaller core

### Fixed

- Solar system satellites now use a simple circle body — hitbox matches the visual, no compound body artifacts
- Solar system center moves across the screen and bounces off edges; split children remain bound to it
- Satellite count race condition resolved; satellites are now always the smallest size and do not split

---

## [release/1.0.0] — 2025 (531b720)

Initial stable release.

### Highlights

- Classic Asteroids gameplay: ship, asteroids, UFOs, bullets, lives, hi-score
- Metaball / hex-grid asteroid rendering
- Solar systems: orbiting satellite asteroids tethered to a moving center
- Pumice obstacles: individual destructible cells with their own physics bodies
- Power-ups: Shield, Rapid Fire, Spread Shot, Heavy Shot
- Config screen: Beginner / Novice / Expert presets + detail tuning
- Procedural Web Audio sound (no audio files)
- QWERTZ keyboard support
