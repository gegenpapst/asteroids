import { rand, TAU } from "../utils.js";
import {
  TURRET_RADIUS,
  TURRET_HP,
  TURRET_FIRE_MIN,
  TURRET_FIRE_MAX,
  TURRET_ROT_SPEED,
  TURRET_BULLET_SPEED,
} from "../Globals.js";
import { UfoBullet } from "./UfoBullet.js";

// Stationary enemy turret.
// Fires UfoBullets in random directions at irregular intervals.
// Takes TURRET_HP hits to destroy; shrinks visually with each hit.
// Kills the ship on contact.
// draw() uses bare `ctx` from global scope (Phase 1 constraint — no ctx parameter).
export class Turret {
  constructor(x, y, onBullet) {
    this.x = x;
    this.y = y;
    this._onBullet = onBullet;
    this.hp = TURRET_HP;
    this._fireTimer = rand(TURRET_FIRE_MIN, TURRET_FIRE_MAX);
    this._t = 0;
    this._rot = rand(0, TAU);
    const dir = Math.random() < 0.5 ? 1 : -1;
    this._rotSpeed = dir * rand(TURRET_ROT_SPEED * 0.6, TURRET_ROT_SPEED * 1.4);
  }

  get radius() {
    return TURRET_RADIUS * (this.hp / TURRET_HP);
  }

  hit() {
    this.hp = Math.max(0, this.hp - 1);
    return this.hp === 0;
  }

  update(dt) {
    this._t += dt;
    this._rot += this._rotSpeed * dt;
    this._fireTimer -= dt;
    if (this._fireTimer <= 0) {
      const angle = rand(0, TAU);
      this._onBullet(
        new UfoBullet(
          this.x,
          this.y,
          Math.cos(angle) * TURRET_BULLET_SPEED,
          Math.sin(angle) * TURRET_BULLET_SPEED,
        ),
      );
      this._fireTimer = rand(TURRET_FIRE_MIN, TURRET_FIRE_MAX);
    }
    return true;
  }

  draw() {
    const r = this.radius;
    const spikes = 6;
    const dmgFrac = 1 - this.hp / TURRET_HP;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this._rot);

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i * Math.PI) / spikes - Math.PI / 2;
      const sr = i % 2 === 0 ? r : r * 0.48;
      const px = Math.cos(a) * sr;
      const py = Math.sin(a) * sr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, "#6b0000");
    grad.addColorStop(1, "#ff7070");
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = "#ff2020";
    ctx.shadowBlur = 4 + dmgFrac * 20;
    ctx.strokeStyle = `rgba(255,120,120,${0.4 + dmgFrac * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}
