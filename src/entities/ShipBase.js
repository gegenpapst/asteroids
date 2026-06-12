"use strict";

// Shared base for ship variants (e.g. ShipCluster).
// Handles movement, firing, power-up timers and teleport.
// Subklassen implementieren nur draw().
class ShipBase {
  constructor() {
    this.x = W / 2;
    this.y = H / 2;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.invulnerable = INVULNERABLE_TIME;
    this.fireTimer = 0;
    this.thrusting = false;
    this.flameT = 0;
    this.shieldTimer = 0;
    this.rapidTimer = 0;
    this.spreadTimer = 0;
    this.heavyTimer = 0;

    // Matter body — sensor by default (mask:0).
    // Switched to colliding automatically when shield is active + not invulnerable.
    this._shieldActive = false;
    this.body = Matter.Bodies.circle(this.x, this.y, SHIP_SIZE * SHIP_HULL_FACTOR, {
      friction: 0,
      frictionAir: 0,
      restitution: 0.85,
      label: "ship",
      collisionFilter: { mask: 0 },
    });
  }

  get radius() {
    return SHIP_SIZE * SHIP_HULL_FACTOR;
  }
  get hitRadius() {
    return this.shieldTimer > 0 ? SHIP_SIZE * SHIP_SHIELD_FACTOR : this.radius;
  }

  teleport(x, y) {
    this.x = x;
    this.y = y;
    this.invulnerable = 1.5;
  }

  update(dt) {
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.rapidTimer > 0) this.rapidTimer -= dt;
    if (this.spreadTimer > 0) this.spreadTimer -= dt;
    if (this.heavyTimer > 0) this.heavyTimer -= dt;

    // Enable real Matter collisions only while shield is active and not invulnerable.
    // Sensor (mask:0) otherwise — prevents Matter from pushing a dying ship.
    const shielded = this.shieldTimer > 0 && this.invulnerable <= 0;
    if (shielded !== this._shieldActive) {
      Matter.Body.set(this.body, "collisionFilter", shielded ? {} : { mask: 0 });
      this._shieldActive = shielded;
    }

    if (Input.left()) this.angle -= SHIP_ROTATION * dt;
    if (Input.right()) this.angle += SHIP_ROTATION * dt;

    if (Input.strafeLeft() || Input.strafeRight()) {
      const dir = Input.strafeLeft() ? -1 : 1;
      const cos = Math.cos(this.angle),
        sin = Math.sin(this.angle);
      const fwd = this.vx * cos + this.vy * sin;
      const lat = -this.vx * sin + this.vy * cos;
      const maxLat = Math.min(SHIP_STRAFE_SPEED, Math.abs(fwd));
      const newLat = clamp(lat + dir * SHIP_STRAFE_ACCEL * dt, -maxLat, maxLat);
      this.vx = fwd * cos - newLat * sin;
      this.vy = fwd * sin + newLat * cos;
    }

    this.thrusting = Input.up();
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
      this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
    }

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > SHIP_MAX_SPEED) {
      const s = SHIP_MAX_SPEED / speed;
      this.vx *= s;
      this.vy *= s;
    }

    const friction = Math.pow(SHIP_FRICTION, dt * 60);
    this.vx *= friction;
    this.vy *= friction;
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > 0 && spd < SHIP_MIN_SPEED) {
      const s = SHIP_MIN_SPEED / spd;
      this.vx *= s;
      this.vy *= s;
    }

    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);

    this.flameT += dt * 18;
  }

  canFire() {
    return this.fireTimer <= 0 && Input.fire();
  }

  fire(bulletLife = BULLET_LIFE) {
    this.fireTimer = this.rapidTimer > 0 ? FIRE_RATE / 2 : FIRE_RATE;
    const tx = this.x + Math.cos(this.angle) * SHIP_SIZE;
    const ty = this.y + Math.sin(this.angle) * SHIP_SIZE;
    const power = this.heavyTimer > 0 ? 2 : 1;
    if (this.spreadTimer > 0) {
      const sa = BULLET_SPREAD_ANGLE;
      return [
        new Bullet(
          tx,
          ty,
          this.vx + Math.cos(this.angle - sa) * BULLET_SPEED,
          this.vy + Math.sin(this.angle - sa) * BULLET_SPEED,
          bulletLife,
          power,
        ),
        new Bullet(
          tx,
          ty,
          this.vx + Math.cos(this.angle) * BULLET_SPEED,
          this.vy + Math.sin(this.angle) * BULLET_SPEED,
          bulletLife,
          power,
        ),
        new Bullet(
          tx,
          ty,
          this.vx + Math.cos(this.angle + sa) * BULLET_SPEED,
          this.vy + Math.sin(this.angle + sa) * BULLET_SPEED,
          bulletLife,
          power,
        ),
      ];
    }
    return [
      new Bullet(
        tx,
        ty,
        this.vx + Math.cos(this.angle) * BULLET_SPEED,
        this.vy + Math.sin(this.angle) * BULLET_SPEED,
        bulletLife,
        power,
      ),
    ];
  }
}

if (typeof module !== "undefined") module.exports = { ShipBase };
