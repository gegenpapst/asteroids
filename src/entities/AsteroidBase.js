"use strict";

// Gemeinsame Basis für AsteroidPoly und ClusterAsteroid.
// Enthält Velocity-Init, Rotation, Matter-Body, Split-Logik.
// Subklassen liefern `_label` und `_rotBase` via static-Property und implementieren `draw()`.
class AsteroidBase {
  static _label = "asteroid"; // Matter-Body Label (subklassen-spezifisch)
  static _rotBase = 1.4; // Bereich der Rotationsgeschwindigkeit (±)

  constructor(x, y, size = 0, angle = null) {
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

    this.body = Matter.Bodies.circle(x, y, this.radius, {
      friction: 0,
      frictionAir: 0,
      restitution: 1,
      label: this.constructor._label,
      plugin: { wrap: { min: { x: 0, y: 0 }, max: { x: W, y: H } } },
    });
    Matter.Body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });
    Matter.Body.setMass(this.body, ASTEROID_MASS[size]);
  }

  // Default: collisionRadius = radius. Subklassen können überschreiben.
  get collisionRadius() {
    return this.radius;
  }

  update(dt) {
    this.rot += this.rotSpeed * dt;
    return true;
  }

  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const Cls = this.constructor; // korrekte Subklasse für Kinder
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset,
      oy = Math.sin(perp) * offset;
    return [
      new Cls(
        this.x + ox,
        this.y + oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
      ),
      new Cls(
        this.x - ox,
        this.y - oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
      ),
    ];
  }
}

if (typeof module !== "undefined") module.exports = { AsteroidBase };
