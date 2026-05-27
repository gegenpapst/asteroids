"use strict";

// Gebundener Asteroid — an einem Sonnensystem-Ankerpunkt per Matter.Constraint aufgehängt.
// Immer Teil eines SolarSystem (parentSystem != null, isSatellite=true).
// Split-Kinder sind reguläre freie AsteroidPoly-Instanzen (kein Constraint).
class SatelliteAsteroidPoly extends AsteroidPoly {
  static _label = "satellite-asteroid";

  constructor(x, y, ax, ay, parentSystem = null, size = 1, maxBumps = 7) {
    super(x, y, size, null, maxBumps, SATELLITE_COLORS[4].center);

    this.parentSystem = parentSystem;
    this.isSatellite = parentSystem != null;
    this.anchorX = ax;
    this.anchorY = ay;

    // Tangentialgeschwindigkeit senkrecht zur Radialen Anker→Asteroid
    const dx = x - ax;
    const dy = y - ay;
    const len = Math.hypot(dx, dy) || 1;
    const sign = Math.random() < 0.5 ? 1 : -1;
    this.vx = (-dy / len) * sign * (parentSystem ? SOLAR_ORBIT_SPEED : PENDULUM_INIT_SPEED);
    this.vy = (dx / len) * sign * (parentSystem ? SOLAR_ORBIT_SPEED : PENDULUM_INIT_SPEED);
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

  // Override: plugin.wrap deaktiviert — Constraint würde beim Wrap reißen
  _makeBody() {
    return super._makeBody(false);
  }

  // Split children are free-floating AsteroidPoly instances that inherit the Wraith color.
  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset;
    const oy = Math.sin(perp) * offset;
    const col = SATELLITE_COLORS[4];
    return [
      new AsteroidPoly(
        this.x + ox,
        this.y + oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
        this.maxBumps,
        col,
      ),
      new AsteroidPoly(
        this.x - ox,
        this.y - oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
        this.maxBumps,
        col,
      ),
    ];
  }

  draw() {
    // Tether + anchor dot
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

    // Polygon with radial gradient fill: dark edge → bright Wraith center
    const { center, body } = SATELLITE_COLORS[4];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.beginPath();
    const { a: a0, r: r0 } = this.verts[0];
    ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    for (let i = 1; i < this.verts.length; i++) {
      const { a, r } = this.verts[i];
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    grad.addColorStop(0, center);
    grad.addColorStop(0.45, center);
    grad.addColorStop(1, body);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = center;
    ctx.lineWidth = 1;
    ctx.shadowColor = center;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { SatelliteAsteroidPoly };
