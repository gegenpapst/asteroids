"use strict";

// Satellite asteroid — simple circle body, orbits a SolarSystem center via a constraint.
// Always spawned at size=2 (smallest) — satellites do not split.
class SatelliteClusterAsteroid extends AsteroidBase {
  static _label = "satellite-cluster-asteroid";
  static _rotBase = 1.2;

  constructor(
    x,
    y,
    ax,
    ay,
    parentSystem = null,
    size = 2,
    maxBumps = 7,
    orbitSpeed = SOLAR_ORBIT_SPEED_MIN,
  ) {
    super(x, y, size, null, 0);

    this.parentSystem = parentSystem;
    this.isSatellite = parentSystem != null;
    this.anchorX = ax;
    this.anchorY = ay;

    // Tangential velocity perpendicular to the radial direction anchor→asteroid
    const dx = x - ax;
    const dy = y - ay;
    const len = Math.hypot(dx, dy) || 1;
    const sign = Math.random() < 0.5 ? 1 : -1;
    this.vx = (-dy / len) * sign * (parentSystem ? orbitSpeed : PENDULUM_INIT_SPEED);
    this.vy = (dx / len) * sign * (parentSystem ? orbitSpeed : PENDULUM_INIT_SPEED);
    Matter.Body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });

    const stiffness = parentSystem ? SOLAR_STIFFNESS : PENDULUM_STIFFNESS;
    const damping = parentSystem ? SOLAR_DAMPING : PENDULUM_DAMPING;
    if (parentSystem) {
      // Anchor to the solar system's moving body — bodyB tracks correctly in Matter.js.
      this.constraint = Matter.Constraint.create({
        bodyA: this.body,
        pointA: { x: 0, y: 0 },
        bodyB: parentSystem.body,
        pointB: { x: 0, y: 0 },
        length: Math.hypot(dx, dy),
        stiffness,
        damping,
      });
    } else {
      // Pendulum: fixed world-space anchor point.
      this.constraint = Matter.Constraint.create({
        bodyA: this.body,
        pointA: { x: 0, y: 0 },
        pointB: { x: ax, y: ay },
        length: Math.hypot(dx, dy),
        stiffness,
        damping,
      });
    }
  }

  // Simple circle body — no compound body, no bumps, hitbox matches visual exactly.
  // wrap=false: no plugin.wrap (constraint would snap on screen wrap).
  _makeBody() {
    this._coreR = this.radius;
    this._bumps = [];
    return Matter.Bodies.circle(this.x, this.y, this.radius, {
      friction: 0,
      frictionAir: 0,
      restitution: 1,
      label: this.constructor._label,
    });
  }

  draw(ctx) {
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

    // Radial gradient fill: bright Wraith center → dark edge (matches showcase)
    const { center, body } = SATELLITE_COLORS[4];
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, TAU);
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
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

if (typeof module !== "undefined") module.exports = { SatelliteClusterAsteroid };
