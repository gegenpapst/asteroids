# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `index.html` directly in any modern browser — no build step, no server, no dependencies.

Controls:
- **Arrow keys / WASD** — rotate and thrust
- **Space / Z** — fire
- **Enter / Space** — start or restart

## Architecture

All game logic lives in `game.js` (~500 lines, vanilla JS + Canvas 2D). `index.html` loads it as a plain `<script>`. `style.css` handles layout only.

### Game state machine

```
START → PLAYING → DEAD → PLAYING  (if lives > 0)
                       → GAMEOVER → START
```

`Game.state` is one of the `STATE` constants. `Game.update(dt)` and `Game.draw()` both branch on state. The main `requestAnimationFrame` loop always calls both regardless of state.

### Entity pattern

Every entity follows the same contract:
- `update(dt)` — advances state; returns `false` (or nothing) when the entity should be removed
- `draw()` — renders to `ctx`; reads from module-level `canvas`/`ctx` globals
- `radius` getter — used for circular collision detection

Active entities live in `Game` arrays (`bullets`, `asteroids`, `particles`). Each frame they are filtered with `.filter(e => e.update(dt))` and then iterated for draw. The ship is a single nullable field (`this.ship`).

### Input system

`Input` is a singleton with two sets: `_held` (keys currently down) and `_pressed` (keys that went down this frame). Call `Input.flush()` at the end of each update frame to clear `_pressed`. Use `wasPressed` for one-shot actions (start/restart); use `isHeld` for continuous actions (thrust, turn, fire).

### Physics

All movement is Euler integration: `pos += vel * dt`. Screen wrapping uses `wrap(v, max)`. Ship friction is applied as `vel *= SHIP_FRICTION^(dt*60)` to make it frame-rate independent.

### Tuning constants

All balance/physics values are declared at the top of `game.js`:

| Constant | What it controls |
|---|---|
| `SHIP_THRUST`, `SHIP_MAX_SPEED`, `SHIP_FRICTION` | Ship feel |
| `SHIP_ROTATION` | Turn speed (rad/s) |
| `BULLET_SPEED`, `BULLET_LIFE`, `FIRE_RATE` | Weapon feel |
| `ASTEROID_RADIUS`, `ASTEROID_SPEED`, `ASTEROID_SCORE` | Asteroid balance (indexed by size 0–2) |
| `INITIAL_ROCKS`, `MAX_ROCKS_PER_LEVEL` | Difficulty ramp |
| `EXTRA_LIFE_SCORE` | Bonus life threshold |

### Audio

`Sound` wraps Web Audio API. Each sound is a short oscillator node created on demand — no audio files. The game's "heartbeat" throb (`Sound.throb`) accelerates as asteroid count rises, driven by `Game.beatInterval`.

### Scoring and persistence

Hi-score is stored in `localStorage` under the key `ast_hi`. Extra lives are awarded every `EXTRA_LIFE_SCORE` points.
