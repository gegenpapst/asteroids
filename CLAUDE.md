# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the game

Open `index.html` directly in any modern browser — no build step, no server, no dependencies.

Controls:
- **Arrow keys / WASD** — rotate and thrust
- **Space / Z** — fire
- **Enter / Space** — start or restart
- **H / ESC** — toggle help screen (pauses game)

## Architecture

Game logic is split across `src/` (vanilla JS + Canvas 2D). `index.html` loads each file as a plain `<script>` in dependency order. `style.css` handles layout only.

| File | Role |
|---|---|
| `src/Globals.js` | Constants, utility functions, `Input` singleton, background/star data |
| `src/Game.js` | State machine, game loop, collision detection, HUD |
| `src/main.js` | Entry point — `Input.init()`, `new Game()`, `requestAnimationFrame` loop |
| `src/entities/Ship.js` | Player ship — movement, firing, power-up timers |
| `src/entities/Asteroid.js` | Destructible rocks — splitting on hit |
| `src/entities/Bullet.js` | Player projectile |
| `src/entities/UfoBullet.js` | UFO projectile (red, slightly slower) |
| `src/entities/Particle.js` | Explosion / thrust trail sparks |
| `src/entities/PowerUp.js` | Collectible pickups (`shield`, `rapid`, `spread`) |
| `src/entities/Ufo.js` | Enemy saucer — sinusoidal movement, fires at ship |
| `src/entities/Sound.js` | Web Audio API wrapper — procedural sounds, no files |

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

Active entities live in `Game` arrays: `bullets`, `asteroids`, `particles`, `powerups`, `ufos`, `ufoBullets`. Each frame they are filtered with `.filter(e => e.update(dt))` and then iterated for draw. The ship is a single nullable field (`this.ship`).

### Power-ups

`PowerUp` has three types: `shield` (cyan hexagon), `rapid` (orange arrows), `spread` (yellow rays).
Spawns at asteroid destruction with 12 % probability (`POWERUP_SPAWN_CHANCE`).
Drifts slowly, rotates, expires after 8 s. On collection, sets the matching timer on `Ship`
(`shieldTimer`, `rapidTimer`, `spreadTimer`) to `POWERUP_DURATION` (5 s).
HUD shows a colour-coded drain bar per active power-up (bottom-right).

### UFO

`Ufo` has two sizes: large (size 0, red, 200 pts) and small (size 1, green, 1000 pts).
Enters from a random edge, travels horizontally with sinusoidal vertical oscillation.
Fires every 1.2–2.5 s; small UFOs aim at the ship (±0.26 rad spread), large ones fire randomly.
Bullets are `UfoBullet` instances (red, radius 3, `BULLET_SPEED * 0.75`).
A new UFO spawns every 25–40 s; at score ≥ 5000 there is a 40 % chance of the small variant.
UFOs persist across level transitions; the UFO hum sound plays as long as any UFO is alive.

### Input system

`Input` is a singleton with two sets: `_held` (keys currently down) and `_pressed` (keys that went down this frame). Call `Input.flush()` at the end of each update frame to clear `_pressed`. Use `wasPressed` for one-shot actions (start/restart); use `isHeld` for continuous actions (thrust, turn, fire).

### Physics

All movement is Euler integration: `pos += vel * dt`. Screen wrapping uses `wrap(v, max)`. Ship friction is applied as `vel *= SHIP_FRICTION^(dt*60)` to make it frame-rate independent.

### Tuning constants

All balance/physics values are declared in `src/Globals.js`:

| Constant | What it controls |
|---|---|
| `SHIP_THRUST`, `SHIP_MAX_SPEED`, `SHIP_FRICTION` | Ship feel |
| `SHIP_ROTATION` | Turn speed (rad/s) |
| `BULLET_SPEED`, `BULLET_LIFE`, `FIRE_RATE` | Weapon feel |
| `ASTEROID_RADIUS`, `ASTEROID_SPEED`, `ASTEROID_SCORE` | Asteroid balance (indexed by size 0–2) |
| `INITIAL_ROCKS`, `MAX_ROCKS_PER_LEVEL` | Difficulty ramp |
| `EXTRA_LIFE_SCORE` | Bonus life threshold |
| `UFO_RADIUS`, `UFO_SPEED`, `UFO_SCORE` | UFO size/speed/points (indexed by size 0–1) |
| `POWERUP_DURATION`, `POWERUP_SPAWN_CHANCE`, `POWERUP_TYPES` | Power-up balance |

### Audio

`Sound` wraps Web Audio API. Each sound is a short oscillator node created on demand — no audio files. The game's "heartbeat" throb (`Sound.throb`) accelerates as asteroid count rises, driven by `Game.beatInterval`.

### Scoring and persistence

Hi-score is stored in `localStorage` under the key `ast_hi`. Extra lives are awarded every `EXTRA_LIFE_SCORE` points.
