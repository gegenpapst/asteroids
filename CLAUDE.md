# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Coding conventions

- **Comments always in English** — no German comments, no mixed-language comments
- **Format before editing** — run `npx prettier --write <file>` on every file before making changes to it

## Task recipes

Before starting work, identify the category and follow the checklist. Two categories have dedicated
skills that must be invoked:

| Category                                                   | How to start               |
| ---------------------------------------------------------- | -------------------------- |
| **New entity** (asteroid variant, obstacle, enemy, pickup) | Run `/new-entity` skill    |
| **Config screen change**                                   | Run `/config-change` skill |
| **Bug fix**                                                | See checklist below        |
| **Refactoring**                                            | See checklist below        |
| **Visual change**                                          | See checklist below        |
| **New game mechanic**                                      | See checklist below        |

### Bug fix

1. Write the exact reproduction steps before touching any code
2. Identify root cause, not just symptom — read the full call chain
3. After the fix: run the original reproduction sequence and confirm it no longer triggers
4. Check whether the fix could introduce a regression in adjacent logic

### Refactoring

1. Is there test coverage for the code being moved or renamed? If not: write tests first
2. Check every reference to renamed/moved symbols — especially in `Game.js` where closed-over
   locals and `this.*` properties look identical but have different scope
3. No behaviour change: verify the game starts, plays through a level, and transitions to the next
4. Run Prettier on all touched files

### Visual change

1. If an offscreen canvas (`_offCanvas`) is involved: ensure it is invalidated and rebuilt
2. Do split children inherit the updated visual correctly?
3. Does the start-screen showcase need updating to match?

### New game mechanic

1. Which `STATE` values does it run in? Update the state machine comment if needed
2. Every tuning value must be a named constant in `Globals.js` — no magic numbers inline
3. Does it interact with score, lives, or level progression? Check all three
4. Write a test or add a manual verification note in the commit message

## Running the game

Open `index.html` directly in any modern browser — no build step, no server, no dependencies.

Controls:

- **Arrow keys / WASD** — rotate and thrust
- **Space / Z** — fire
- **Enter / Space** — start or restart
- **H / ESC** — toggle help screen (pauses game)

## Architecture

Game logic is split across `src/` (vanilla JS + Canvas 2D). `index.html` loads each file as a plain `<script>` in dependency order. `style.css` handles layout only.

| File                                                  | Role                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/Globals.js`                                      | Constants, utility functions, `Input` singleton, background/star data     |
| `src/Game.js`                                         | State machine, game loop, collision detection, HUD                        |
| `src/main.js`                                         | Entry point — `Input.init()`, `new Game()`, `requestAnimationFrame` loop  |
| `src/VisualMode.js`                                   | `MetaballMode` factory — provides entity classes to `Game`                |
| `src/entities/ShipBase.js` / `ShipCluster.js`         | Player ship — movement, firing, power-up timers; gradient-sprite render   |
| `src/entities/AsteroidBase.js` / `ClusterAsteroid.js` | Destructible rocks — splitting on hit; metaball render                    |
| `src/entities/Bullet.js`                              | Player projectile                                                         |
| `src/entities/UfoBullet.js`                           | UFO projectile (red, slightly slower)                                     |
| `src/entities/Particle.js`                            | Explosion / thrust trail sparks                                           |
| `src/entities/PowerUp.js`                             | Collectible pickups (`shield`, `rapid`, `spread`)                         |
| `src/entities/UfoBase.js` / `UfoCluster.js`           | Enemy saucer — sinusoidal movement, fires at ship; gradient-sprite render |
| `src/entities/Sound.js`                               | Web Audio API wrapper — procedural sounds, no files                       |

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

| Constant                                                    | What it controls                            |
| ----------------------------------------------------------- | ------------------------------------------- |
| `SHIP_THRUST`, `SHIP_MAX_SPEED`, `SHIP_FRICTION`            | Ship feel                                   |
| `SHIP_ROTATION`                                             | Turn speed (rad/s)                          |
| `BULLET_SPEED`, `BULLET_LIFE`, `FIRE_RATE`                  | Weapon feel                                 |
| `ASTEROID_RADIUS`, `ASTEROID_SPEED`, `ASTEROID_SCORE`       | Asteroid balance (indexed by size 0–2)      |
| `INITIAL_ROCKS`, `MAX_ROCKS_PER_LEVEL`                      | Difficulty ramp                             |
| `EXTRA_LIFE_SCORE`                                          | Bonus life threshold                        |
| `UFO_RADIUS`, `UFO_SPEED`, `UFO_SCORE`                      | UFO size/speed/points (indexed by size 0–1) |
| `POWERUP_DURATION`, `POWERUP_SPAWN_CHANCE`, `POWERUP_TYPES` | Power-up balance                            |

### Audio

`Sound` wraps Web Audio API. Each sound is a short oscillator node created on demand — no audio files. The game's "heartbeat" throb (`Sound.throb`) accelerates as asteroid count rises, driven by `Game.beatInterval`.

### Scoring and persistence

Hi-score is stored in `localStorage` under the key `ast_hi`. Extra lives are awarded every `EXTRA_LIFE_SCORE` points.
