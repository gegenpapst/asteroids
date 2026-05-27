"use strict";

// Gebundener Asteroid — an einem Ankerpunkt per Matter.Constraint aufgehängt.
// Dient als Basis für zwei Rollen:
//   parentSystem != null → Sonnensystem-Satellit (isSatellite=true, zählt NICHT für Level-Clear)
//   parentSystem == null → freier Pendelasteroid (isSatellite=false, zählt für Level-Clear)
//
// Split-Kinder sind stets freie Pendelasteroiden (parentSystem=null) mit leicht versetzten Ankern.
class SatelliteAsteroidPoly extends AsteroidPoly {
  static _label = "satellite-asteroid";

  constructor(x, y, ax, ay, parentSystem = null, size = 1, maxBumps = 7) {
    super(x, y, size, null, maxBumps);

    this.parentSystem = parentSystem;
    this.isSatellite = parentSystem != null;
    this.anchorX = ax;
    this.anchorY = ay;

    // Tangentialgeschwindigkeit senkrecht zur Radialen Anker→Asteroid
    const dx = x - ax;
    const dy = y - ay;
    const len = Math.hypot(dx, dy) || 1;
    const sign = Math.random() < 0.5 ? 1 : -1;
    this.vx =
      (-dy / len) *
      sign *
      (parentSystem ? SOLAR_ORBIT_SPEED : PENDULUM_INIT_SPEED);
    this.vy =
      (dx / len) *
      sign *
      (parentSystem ? SOLAR_ORBIT_SPEED : PENDULUM_INIT_SPEED);
    Matter.Body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });

    const stiffness = parentSystem ? SOLAR_STIFFNESS : PENDULUM_STIFFNESS;
    const damping = parentSystem ? SOLAR_DAMPING : PENDULUM_DAMPING;
    this.constraint = Matter.Constraint.create({
      bodyA: this.body,
      pointA: { x: 0, y: 0 },
      pointB: { x: ax, y: ay },
      length: Math.hypot(dx, dy),
      stiffness,
      damping,
    });
  }

  // Override: kein plugin.wrap — Constraint würde beim Wrap reißen
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
      label: SatelliteAsteroidPoly._label,
    });
    Matter.Body.setPosition(body, { x: this.x, y: this.y });
    return body;
  }

  // Kinder sind stets freie Pendelasteroiden (parentSystem=null), mit versetzten Ankern
  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset;
    const oy = Math.sin(perp) * offset;

    const spread = rand(30, 45);
    const aPerp = rand(0, TAU);
    const aox = Math.cos(aPerp) * spread;
    const aoy = Math.sin(aPerp) * spread;

    return [
      new SatelliteAsteroidPoly(
        this.x + ox,
        this.y + oy,
        this.anchorX + aox,
        this.anchorY + aoy,
        null, // freier Pendelasteroid
        this.size + 1,
        this.maxBumps,
      ),
      new SatelliteAsteroidPoly(
        this.x - ox,
        this.y - oy,
        this.anchorX - aox,
        this.anchorY - aoy,
        null,
        this.size + 1,
        this.maxBumps,
      ),
    ];
  }

  draw() {
    // Sonnensystem-Satelliten: orange; freie Pendel: blaugrau
    const tetherColor = this.parentSystem ? "rgba(255, 140, 60, 0.45)" : "#556";
    const anchorColor = this.parentSystem ? "rgba(255,140,60,0.7)" : "#778";

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.anchorX, this.anchorY);
    ctx.strokeStyle = tetherColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(this.anchorX, this.anchorY, 4, 0, TAU);
    ctx.fillStyle = anchorColor;
    ctx.fill();
    ctx.restore();

    super.draw();
  }
}

if (typeof module !== "undefined") module.exports = { SatelliteAsteroidPoly };
