"use strict";

// Metaball-Variante des Pendel-Asteroiden — erbt Cluster-Rendering von ClusterAsteroid,
// ergänzt Seil + Anker + Matter.Constraint.
// Unterschiede zu ClusterAsteroid:
//   - kein matter-wrap (Teleport würde Constraint zerreißen)
//   - initiale Tangentialgeschwindigkeit statt zufälliger Richtung
//   - split() gibt freie ClusterAsteroid-Kinder zurück (kein Constraint)
//   - draw() zeichnet Metaball-Blob zuerst, dann Seil + Anker darüber
class PendulumClusterAsteroid extends ClusterAsteroid {
  static _label = "pendulum-asteroid";

  constructor(x, y, size = 0, angle = null, anchorX = W / 2, anchorY = H / 2) {
    super(x, y, size, angle);

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

  // Override: kein plugin.wrap — Pendel-Asteroiden dürfen nicht über den Rand warpen.
  _makeBody() {
    const r = this.radius;
    this._coreR = r * 0.46;
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
      label: PendulumClusterAsteroid._label,
      // Kein plugin.wrap
    });
    Matter.Body.setPosition(body, { x: this.x, y: this.y });
    return body;
  }

  // Override: Kinder sind freie ClusterAsteroid-Instanzen ohne Constraint.
  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset;
    const oy = Math.sin(perp) * offset;
    return [
      new ClusterAsteroid(
        this.x + ox,
        this.y + oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
      ),
      new ClusterAsteroid(
        this.x - ox,
        this.y - oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
      ),
    ];
  }

  // Override: Metaball-Blob zuerst zeichnen, dann Seil + Anker darüber legen,
  // damit das Seil nicht vom Blob verdeckt wird.
  draw() {
    super.draw(); // ClusterAsteroid: Metaball-Blob mit screen-Blend

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
  }
}

if (typeof module !== "undefined") module.exports = { PendulumClusterAsteroid };
