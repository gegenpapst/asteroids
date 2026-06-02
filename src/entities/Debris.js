"use strict";

// Debris particle on asteroid death.
// Uses a Matter body for physically correct deceleration (frictionAir);
// wall reflection is handled manually. No collisions with other entities (mask: 0).
class Debris {
  constructor(x, y, vx, vy) {
    this.radius = rand(DEBRIS_RADIUS_MIN, DEBRIS_RADIUS_MAX);
    this.life = DEBRIS_LIFE;
    this.maxLife = DEBRIS_LIFE;
    this.x = x;
    this.y = y;

    // Baked rocky color so it doesn't flicker each frame
    const hue = Math.round(rand(18, 46));
    const lum = Math.round(rand(52, 72));
    this.color = `hsl(${hue},18%,${lum}%)`;

    this.body = Matter.Bodies.circle(x, y, this.radius, {
      friction: 0,
      frictionAir: DEBRIS_FRICTION_AIR,
      restitution: 0,
      label: "debris",
      collisionFilter: { mask: 0 }, // sensor: no collisions with other bodies
    });
    // Matter velocity is in px/frame at 60 fps, matching AsteroidBase convention
    Matter.Body.setVelocity(this.body, { x: vx / 60, y: vy / 60 });
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return false;

    // Bounce off screen edges by flipping velocity component
    const pos = this.body.position;
    const vel = this.body.velocity;
    let px = pos.x,
      py = pos.y,
      vx = vel.x,
      vy = vel.y;
    let bounced = false;
    if (px < this.radius) {
      px = this.radius;
      vx = Math.abs(vx);
      bounced = true;
    }
    if (px > W - this.radius) {
      px = W - this.radius;
      vx = -Math.abs(vx);
      bounced = true;
    }
    if (py < this.radius) {
      py = this.radius;
      vy = Math.abs(vy);
      bounced = true;
    }
    if (py > H - this.radius) {
      py = H - this.radius;
      vy = -Math.abs(vy);
      bounced = true;
    }
    if (bounced) {
      Matter.Body.setPosition(this.body, { x: px, y: py });
      Matter.Body.setVelocity(this.body, { x: vx, y: vy });
    }

    this.x = this.body.position.x;
    this.y = this.body.position.y;
    return true;
  }

  draw() {
    const t = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = t * t * 0.88;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (0.4 + 0.6 * t), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { Debris };
