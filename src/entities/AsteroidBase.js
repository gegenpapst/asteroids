"use strict";

// Shared base for asteroid variants (e.g. ClusterAsteroid).
// Contains velocity init, rotation, Matter body, and split logic.
// Subclasses provide `_label` and `_rotBase` via static property and implement `draw()`.
class AsteroidBase {
  static _label = "asteroid"; // Matter body label (subclass-specific)
  static _rotBase = 1.4; // rotation speed range (±)

  constructor(x, y, size = 0, angle = null, maxBumps = 7) {
    this.x = x;
    this.y = y;
    this.size = size;

    this.radius = ASTEROID_RADIUS[size];
    this.score = ASTEROID_SCORE[size];

    const a = angle ?? rand(0, TAU);
    const speed = ASTEROID_SPEED[size] * rand(0.7, 1.35);
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.rot = rand(0, TAU);

    const rotBase = this.constructor._rotBase;
    // 0.38 scale: (size+1) makes larger asteroids spin faster; 0.38 keeps the range playable
    this.rotSpeed = rand(-rotBase, rotBase) * (size + 1) * 0.38;

    this.maxBumps = maxBumps;
    this.bumpCount = randInt(0, maxBumps);

    this.body = this._makeBody();
    Matter.Body.setAngle(this.body, this.rot);
    Matter.Body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });
    Matter.Body.setAngularVelocity(this.body, this.rotSpeed / 60);
    Matter.Body.setMass(this.body, ASTEROID_MASS[size]);
  }

  // Generates bump data: n protrusions evenly distributed around the center.
  _genBumps() {
    const r = this.radius;
    const n = this.bumpCount;
    if (n === 0) return [];
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU + rand(-0.55, 0.55);
      const d = r * rand(0.44, 0.8);
      const br = r * rand(0.35, 0.45);
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, br };
    });
  }

  // Builds a compound body from a small core + widely spaced bumps.
  // Sets this._coreR and this._bumps for subclasses (e.g. metaball cell layout).
  // wrap=false → no plugin.wrap (for constraint-bound subclasses like SatelliteAsteroid).
  _makeBody(wrap = true) {
    const r = this.radius;
    // core shrinks from 85% to 35% of radius as bump count rises 0→7
    this._coreR = r * (0.85 - (0.5 * Math.min(this.bumpCount, 7)) / 7);
    this._bumps = this._genBumps();

    const parts = [Matter.Bodies.circle(0, 0, this._coreR)];
    for (const b of this._bumps) {
      parts.push(Matter.Bodies.circle(b.dx, b.dy, b.br));
    }
    const body = Matter.Body.create({
      parts,
      friction: 0,
      frictionAir: 0,
      restitution: 1,
      label: this.constructor._label,
      ...(wrap ? { plugin: { wrap: { min: { x: 0, y: 0 }, max: { x: WW, y: WH } } } } : {}),
    });
    Matter.Body.setPosition(body, { x: this.x, y: this.y });
    return body;
  }

  // Default: collisionRadius = radius. Subclasses may override.
  get collisionRadius() {
    return this.radius;
  }

  // Called by Game._destroyAsteroid() before removing this asteroid.
  // Removes physics bodies/constraints from the world. Subclasses extend to add cleanup.
  onDestroy(game) {
    if (this.constraint) Matter.World.remove(game.engine.world, this.constraint);
    Matter.World.remove(game.engine.world, this.body);
  }

  update(dt) {
    return true;
  }

  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const Cls = this.constructor; // correct subclass for children
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset,
      oy = Math.sin(perp) * offset;
    return [
      new Cls(this.x + ox, this.y + oy, this.size + 1, safeSplitAngle(bulletAngle), this.maxBumps),
      new Cls(this.x - ox, this.y - oy, this.size + 1, safeSplitAngle(bulletAngle), this.maxBumps),
    ];
  }
}

if (typeof module !== "undefined") module.exports = { AsteroidBase };
