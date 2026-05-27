"use strict";

// Pendel-Asteroid: an einem fixen Ankerpunkt per Matter.Constraint aufgehängt.
// Erbt Compound-Body-Geometrie und Polygon-Rendering von AsteroidPoly.
// Unterschiede zu normalen Asteroiden:
//   - kein matter-wrap (Teleport würde Constraint zerstören)
//   - initiale Tangentialgeschwindigkeit statt zufälliger Richtung
//   - split() erzeugt ebenfalls PendulumAsteroid-Kinder mit leicht versetzten Ankern
//   - draw() zeichnet Seil + Anker vor dem Polygon
class PendulumAsteroid extends AsteroidPoly {
  static _label = "pendulum-asteroid";

  constructor(
    x,
    y,
    size = 0,
    angle = null,
    anchorX = W / 2,
    anchorY = H / 2,
    maxBumps = 7,
  ) {
    super(x, y, size, angle, maxBumps);

    this.anchorX = anchorX;
    this.anchorY = anchorY;

    // Tangentialgeschwindigkeit senkrecht zur Radialen Anker→Asteroid
    const dx = x - anchorX;
    const dy = y - anchorY;
    const len = Math.hypot(dx, dy) || 1;
    const sign = Math.random() < 0.5 ? 1 : -1;
    this.vx = (-dy / len) * sign * PENDULUM_INIT_SPEED;
    this.vy = (dx / len) * sign * PENDULUM_INIT_SPEED;
    Matter.Body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });

    this.constraint = Matter.Constraint.create({
      bodyA: this.body,
      pointA: { x: 0, y: 0 },
      pointB: { x: anchorX, y: anchorY },
      length: Math.hypot(dx, dy),
      stiffness: PENDULUM_STIFFNESS,
      damping: PENDULUM_DAMPING,
    });
  }

  // Override: kein matter-wrap plugin — Teleport würde den Constraint zerreißen.
  _makeBody() {
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
      label: PendulumAsteroid._label,
      // Kein plugin.wrap — Pendel-Asteroiden dürfen nicht über den Bildschirmrand warpen
    });
    Matter.Body.setPosition(body, { x: this.x, y: this.y });
    return body;
  }

  // Override: Kinder sind ebenfalls PendulumAsteroid-Instanzen mit leicht versetzten Ankern,
  // damit sie unabhängig schwingen und sich nicht überlagern.
  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset;
    const oy = Math.sin(perp) * offset;

    // Anker leicht versetzt, damit die Kinder unabhängig schwingen
    const spread = rand(30, 45);
    const aPerp = rand(0, TAU);
    const aox = Math.cos(aPerp) * spread;
    const aoy = Math.sin(aPerp) * spread;

    return [
      new PendulumAsteroid(
        this.x + ox,
        this.y + oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
        this.anchorX + aox,
        this.anchorY + aoy,
        this.maxBumps,
      ),
      new PendulumAsteroid(
        this.x - ox,
        this.y - oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
        this.anchorX - aox,
        this.anchorY - aoy,
        this.maxBumps,
      ),
    ];
  }

  // Override: Seil vom Asteroid zum Anker + Ankerpunkt, dann normales Polygon.
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.anchorX, this.anchorY);
    ctx.strokeStyle = "#556";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(this.anchorX, this.anchorY, 4, 0, TAU);
    ctx.fillStyle = "#778";
    ctx.fill();
    ctx.restore();

    super.draw();
  }
}

if (typeof module !== "undefined") module.exports = { PendulumAsteroid };
