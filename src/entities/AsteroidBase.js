"use strict";

// Shared base for AsteroidPoly and ClusterAsteroid.
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
  // Shared by _makeBody() and _makeVerts().
  _genBumps() {
    const r = this.radius;
    const n = this.bumpCount;
    if (n === 0) return [];
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU + rand(-0.55, 0.55);
      const d = r * rand(0.44, 0.8);
      const br = r * rand(0.28, 0.34);
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, br };
    });
  }

  // Builds a compound body from a small core + widely spaced bumps.
  // Sets this._coreR and this._bumps so _makeVerts() can access them.
  // wrap=false → no plugin.wrap (for constraint-bound subclasses like SatelliteAsteroid).
  _makeBody(wrap = true) {
    const r = this.radius;
    this._coreR = r * (1.0 - (0.54 * Math.min(this.bumpCount, 7)) / 7);
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
      ...(wrap ? { plugin: { wrap: { min: { x: 0, y: 0 }, max: { x: W, y: H } } } } : {}),
    });
    Matter.Body.setPosition(body, { x: this.x, y: this.y });
    return body;
  }

  // Derives polygon vertices from the compound body geometry (ray-circle intersection
  // + smooth shoulder). Each ray finds the outermost intersection; rays that narrowly
  // miss a bump get a quadratic transition zone so no deep dents appear between bumps
  // (would otherwise look like a star).
  _makeVerts(n = 18) {
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * TAU;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let maxR = this._coreR;
      for (const b of this._bumps) {
        const proj = b.dx * cos + b.dy * sin;
        const bDistSq = b.dx * b.dx + b.dy * b.dy;
        const c = bDistSq - b.br * b.br;
        const disc = proj * proj - c;
        if (disc >= 0) {
          // Ray hits bump — outer intersection point
          const t = proj + Math.sqrt(disc);
          if (t > maxR) maxR = t;
        } else if (proj > 0) {
          // Ray narrowly misses bump — smooth shoulder fills the transition.
          // perp = perpendicular distance from ray origin to bump center
          const perp = Math.sqrt(bDistSq - proj * proj);
          const miss = perp - b.br; // how far the ray passes beside the bump
          if (miss < b.br) {
            const f = 1 - miss / b.br; // linear falloff 1→0 over one bump-radius width
            const bumpOuter = Math.sqrt(bDistSq) + b.br;
            const contrib = this._coreR + (bumpOuter - this._coreR) * f * f;
            if (contrib > maxR) maxR = contrib;
          }
        }
      }
      return { a: angle, r: maxR };
    });
  }

  // Default: collisionRadius = radius. Subclasses may override.
  get collisionRadius() {
    return this.radius;
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
