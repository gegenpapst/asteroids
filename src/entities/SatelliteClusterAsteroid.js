"use strict";

// Metaball-Variante des gebundenen Asteroiden — erbt Cluster-Rendering von ClusterAsteroid.
// parentSystem != null → Sonnensystem-Satellit
// parentSystem == null → freier Pendelasteroid
class SatelliteClusterAsteroid extends ClusterAsteroid {
  static _label = "satellite-cluster-asteroid";

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

  // Override: kein plugin.wrap
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
      label: SatelliteClusterAsteroid._label,
    });
    Matter.Body.setPosition(body, { x: this.x, y: this.y });
    return body;
  }

  // Kinder sind freie Pendelasteroiden (parentSystem=null) mit versetzten Ankern
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
      new SatelliteClusterAsteroid(
        this.x + ox,
        this.y + oy,
        this.anchorX + aox,
        this.anchorY + aoy,
        null,
        this.size + 1,
        this.maxBumps,
      ),
      new SatelliteClusterAsteroid(
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
    super.draw(); // Metaball-Blob

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
  }
}

if (typeof module !== "undefined")
  module.exports = { SatelliteClusterAsteroid };
