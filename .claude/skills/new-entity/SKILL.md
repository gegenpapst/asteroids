---
name: new-entity
description: >
  Scaffold a new game entity in the Asteroids project — asteroid variant,
  obstacle, enemy, pickup, or power-up type. Use this skill whenever the user
  wants to add any new interactive object to the game, even if they phrase it
  as "add a thing that does X" or "create a new rock/enemy/item" without
  explicitly saying "entity". Covers file creation, constants, registration in
  Game.js, collision wiring, and the Metaball render path.
---

# New Entity Skill

## Step 1 — Clarify before writing any code

Ask the user (or infer from context):

1. **Name** — what is the entity called? (used for the class name and filename)
2. **Behaviour** — what does it do? Does it move, shoot, split, drift, rotate, home in?
3. **Lifecycle** — how does it die or expire? (hit by bullet, timeout, collected, flies off screen)
4. **Interactions** — can it be hit by bullets? Can the ship collect it? Does it damage the ship?
5. **Score** — does destroying/collecting it affect the score?

Only proceed once you have answers. Do not guess on interaction or lifecycle — these decide which arrays and collision checks are needed.

## Step 2 — Create the entity file

Create `src/entities/<EntityName>.js` (use the `<EntityName>Cluster.js` naming if the entity follows the metaball/gradient-sprite pattern like the existing Cluster entities).

Every entity must follow this contract:

```js
class EntityName {
  constructor(x, y /*, ...params */) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    // set this.radius, this._life, etc.
  }

  get radius() {
    return /* number */;
  }

  // Return false (or nothing) when the entity should be removed.
  update(dt) {
    // Euler integration: this.pos.x += this.vel.x * dt;
    // wrap(this.pos, canvas.width, canvas.height) if needed
    // return false when dead
  }

  draw() {
    // render to the module-level ctx
  }
}
```

- All tuning values (radius, speed, lifetime, score) must be **named constants** — never inline numbers. Add them in the next step.
- Use `wrap(v, max)` from Globals.js for screen wrapping.
- Match the game's visual style: metaball blobs for amorphous objects (see `ClusterAsteroid.js`), gradient sprites with glow for oriented objects (see `ShipCluster.js`, `UfoCluster.js`).

## Step 3 — Add constants to Globals.js

Open `src/Globals.js` and add a clearly named constant block for the new entity. Group related values together.

```js
// <EntityName>
const ENTITYNAME_RADIUS = 18;
const ENTITYNAME_SPEED = 80;
const ENTITYNAME_SCORE = 250;
```

No magic numbers anywhere in the entity file.

## Step 4 — Register in Game.js

In `Game.js`:

1. **Add an array** if the entity type is new (e.g. `this.mines = []`). Existing arrays: `bullets`, `asteroids`, `particles`, `powerups`, `ufos`, `ufoBullets`.
2. **Spawn** the entity at the right moment (level start, asteroid death, timer, etc.).
3. **Update + draw each frame** — the standard pattern:
   ```js
   this.mines = this.mines.filter((e) => e.update(dt));
   this.mines.forEach((e) => e.draw());
   ```
4. **Reset** the array in `_reset()` / `_nextLevel()` as appropriate.

## Step 5 — Wire collision detection (if interactive)

In `Game.js`'s collision section, add checks for the new entity. The helper pattern already used in the codebase:

```js
// bullet vs mine
this.bullets = this.bullets.filter((b) => {
  for (const mine of this.mines) {
    if (dist(b.pos, mine.pos) < b.radius + mine.radius) {
      // handle hit: remove mine, spawn particles, add score
      return false; // remove bullet
    }
  }
  return true;
});
```

Wire ship collision if the entity can harm or be collected by the ship.

## Step 6 — Register in VisualMode.js (if applicable)

If the entity is created through the mode factory (like ship, asteroid, rock, UFO, pumice, satellite), add a `create<EntityName>()` method to `MetaballMode` in `src/VisualMode.js` and call it via `this.mode.create<EntityName>(...)` in `Game.js`. Entities spawned directly (like bullets and particles) skip this step.

## Step 7 — Prettier

Run Prettier on every file touched:

```
npx prettier --write src/entities/<EntityName>.js src/Globals.js src/Game.js
```

## Step 8 — Verify

Open `index.html` in a browser. Confirm:

- The entity appears at the expected moment.
- Collision with bullets and ship works correctly.
- The entity is removed when its lifecycle ends (no leaked objects).
- No console errors.
