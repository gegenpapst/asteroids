---
name: new-entity
description: >
  Design and implement a new visual game object in the Asteroids project —
  ship variant, asteroid style, enemy, obstacle, pickup, or any drawable entity.
  Use this skill whenever the user wants to add any new visual or interactive object
  to the game, even when phrased as "create a new thing that looks like X" or "add
  an enemy that does Y". This skill enforces a structured design-first workflow:
  it interviews the user about movement, collision, and appearance before writing
  a single line of code, then renders 4–8 visual variants in the start-screen
  showcase so the user can choose the best look before the full implementation begins.
---

# New Entity Skill

This skill follows a strict four-phase sequence. **Do not jump ahead** — each phase depends on decisions made in the previous one. The goal is that no code is written before the user has approved the design.

---

## Phase 1 — Design Interview

Before writing any code, gather answers to these three questions. Ask them all at once in a single message; don't send one question at a time.

### 1. Movement
- Does the object move on screen?
- If yes: does it have a fixed direction, random direction, or does it track the player?
- Does it rotate? Independently of movement, or tied to it?
- Speed range (slow drift, fast projectile, orbiting, etc.)?

### 2. Collision behaviour
- Is it purely decorative (no collision)?
- Can bullets destroy it?
- Does it damage or kill the ship on contact?
- Can the ship collect it (like a power-up)?
- Does it interact with other entities (e.g., splits, spawns children)?

### 3. Visual appearance
- Overall shape feel: blobby/organic (→ metaball), geometric/mechanical (→ polygon/sprite), glowing/energy?
- Approximate size relative to the existing asteroids (small, medium, large)?
- Colour palette or theme (e.g., "icy blue", "lava", "neon green")?
- Any animation or effect (pulsing glow, spinning parts, particle trail)?

After receiving answers, **summarise your understanding** in a short paragraph and ask the user to confirm before moving on. If any answer is unclear or contradictory, ask a focused follow-up — one question at a time.

---

## Phase 2 — Specification

Once the design interview is confirmed, write a short spec in your response (not a file). Include:

- **Class name** and file path
- **Constants** that will be added to `Globals.js` (radius, speed, score, etc.)
- **Lifecycle**: when it spawns, when it dies, what happens on death
- **Collision pairs**: which arrays in `Game.js` it interacts with
- **Render approach**: metaball, polygon path, gradient sprite, or combination
- **Showcase plan**: brief description of the 4–8 visual variants to generate

Ask the user to approve the spec. Proceed to Phase 3 only after explicit approval ("ok", "ja", "looks good", etc.).

---

## Phase 3 — Visual Showcase

Generate **4 to 8 distinct visual variants** of the new object and display them in the start-screen showcase. The goal is to let the user pick the best look before any game logic is written.

### How to add variants to the showcase

The start-screen showcase is rendered in `Game.js` inside the `_drawShowcase()` method (called during the `START` state). Each variant is a self-contained anonymous draw block — no class instantiation needed here.

Add a new showcase section at the bottom of `_drawShowcase()`. Lay out the variants in a row or grid. Each variant must:
- Be labelled with a number (1–8) so the user can refer to it
- Show the entity at a representative size and colour
- Demonstrate the key visual trait that distinguishes it from the others (different shape, different colour palette, different glow style, etc.)

The showcase code should be wrapped in a clearly marked block comment:

```js
// --- NEW ENTITY SHOWCASE: <EntityName> ---
// Variants 1–N
```

After pushing the changes, tell the user: "I've added N variants to the start screen. Open `index.html`, look at the showcase, and tell me which number(s) you like best — or describe what you'd like changed."

### Variant principles
- Each variant must be visually distinct (not just a different shade of the same shape)
- Cover the design space: try at least one blobby option, one geometric option, one that leans into the glow/neon aesthetic already in the game, and one that's a bit more unusual
- Do not write entity class code yet — just the raw canvas draw calls for the showcase

---

## Phase 4 — Full Implementation

Once the user picks a variant (or a combination), implement the full entity. Follow these steps in order.

### Step 4a — Entity file

Create `src/entities/<EntityName>.js`. Every entity must follow the standard contract:

```js
"use strict";

class EntityName {
  constructor(x, y /*, ...params */) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    // this.radius, this._life, etc.
  }

  get radius() { return /* constant */; }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // return false when the entity should be removed
    return true;
  }

  draw() {
    // render to module-level ctx
    // translate the chosen showcase variant here — it's already proven to look good
  }
}

if (typeof module !== "undefined") module.exports = { EntityName };
```

Use `wrap(v, max)` from `Globals.js` for screen wrapping. No inline numbers — all tuning values go in `Globals.js`.

### Step 4b — Constants in Globals.js

Add a clearly labelled constant block:

```js
// <EntityName>
const ENTITYNAME_RADIUS = 18;
const ENTITYNAME_SPEED  = 80;
const ENTITYNAME_SCORE  = 250;
```

Export in `module.exports` at the bottom of the file.

### Step 4c — Register in Game.js

1. Add an array if the entity type is new: `this.things = []`
   - Existing arrays: `bullets`, `asteroids`, `particles`, `powerups`, `ufos`, `ufoBullets`
2. Spawn the entity at the right moment (level start, asteroid death, timer, etc.)
3. Update and draw each frame:
   ```js
   this.things = this.things.filter((e) => e.update(dt));
   this.things.forEach((e) => e.draw());
   ```
4. Reset in `_reset()` / `_nextLevel()` as appropriate
5. Remove the showcase block added in Phase 3 (or keep it if the user wants it)

### Step 4d — Collision detection

Wire the entity into the collision section of `Game.js`:

```js
this.bullets = this.bullets.filter((b) => {
  for (const t of this.things) {
    if (Math.hypot(b.x - t.x, b.y - t.y) < b.radius + t.radius) {
      // handle hit
      return false; // remove bullet
    }
  }
  return true;
});
```

Wire ship collision if the entity can harm or be collected.

### Step 4e — VisualMode.js (if applicable)

If the entity is created through the mode factory (like ship, asteroid, UFO), add a `create<EntityName>()` method to `MetaballMode` in `src/VisualMode.js`.

### Step 4f — Prettier

```
npx prettier --write src/entities/<EntityName>.js src/Globals.js src/Game.js
```

Run on every file touched. Run this before and after edits.

### Step 4g — Verify

Open `index.html` in a browser and confirm:
- The entity appears at the expected moment
- Collision with bullets and ship works correctly
- The entity is removed when its lifecycle ends (no leaked objects)
- No console errors
- The chosen visual matches what the user approved in Phase 3

---

## Checklist summary

| Phase | Gate to next phase |
|-------|--------------------|
| 1. Design interview | User confirms the summary of movement + collision + appearance |
| 2. Specification | User explicitly approves the spec |
| 3. Visual showcase | User picks a variant number |
| 4. Implementation | Visual verified in browser, no console errors |
