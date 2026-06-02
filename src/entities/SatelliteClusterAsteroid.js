"use strict";

// Metaball variant of the satellite asteroid — inherits cluster rendering from ClusterAsteroid.
// Always part of a SolarSystem (parentSystem != null, isSatellite=true).
// Split children are regular free-floating ClusterAsteroid instances (no constraint).
class SatelliteClusterAsteroid extends ClusterAsteroid {
  static _label = "satellite-cluster-asteroid";

  constructor(x, y, ax, ay, parentSystem = null, size = 1, maxBumps = 7) {
    // Pass Wraith color directly to ClusterAsteroid — no manual _offCanvas rebuild needed.
    super(x, y, size, null, maxBumps, SATELLITE_COLORS[4].center);

    this.parentSystem = parentSystem;
    this.isSatellite = parentSystem != null;
    this.anchorX = ax;
    this.anchorY = ay;

    // Tangential velocity perpendicular to the radial direction anchor→asteroid
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

  // Override: plugin.wrap disabled — constraint would snap on screen wrap
  _makeBody() {
    return super._makeBody(false);
  }

  // Split children are free-floating ClusterAsteroid instances that inherit the Wraith color.
  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset;
    const oy = Math.sin(perp) * offset;
    const col = SATELLITE_COLORS[4];
    return [
      new ClusterAsteroid(
        this.x + ox,
        this.y + oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
        this.maxBumps,
        col,
      ),
      new ClusterAsteroid(
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

    // Radial gradient fill: bright Wraith center → dark edge (matches showcase + SatelliteAsteroidPoly)
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
