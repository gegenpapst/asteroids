import { wrap, clamp, TAU } from "../utils.js";
import { WW, WH, BULLET_LIFE, BULLET_TRAIL_TIME } from "../Globals.js";

export class Bullet {
  constructor(x, y, vx, vy, life = BULLET_LIFE, power = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.power = power;
  }

  get radius() {
    return this.power === 2 ? 5 : 3;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, WW);
    this.y = wrap(this.y + this.vy * dt, WH);
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = clamp((this.life / this.maxLife) * 2, 0, 1);
    const heavy = this.power === 2;
    const r = heavy ? 5 : 2.5;
    const rgb = heavy ? "255,90,30" : "255,255,100";
    const glow = heavy ? "#f40" : "#ff8";

    ctx.save();
    // Additive blending makes overlapping glow/trail layers read as light, not paint.
    ctx.globalCompositeOperation = "lighter";

    // Motion streak: a short fading tail trailing the bullet along its velocity vector.
    // Derived from velocity (not stored history) so screen-wrapping can't stretch it.
    const tx = this.x - this.vx * BULLET_TRAIL_TIME;
    const ty = this.y - this.vy * BULLET_TRAIL_TIME;
    const trail = ctx.createLinearGradient(tx, ty, this.x, this.y);
    trail.addColorStop(0, `rgba(${rgb},0)`);
    trail.addColorStop(1, `rgba(${rgb},${alpha * 0.5})`);
    ctx.strokeStyle = trail;
    ctx.lineWidth = r * 1.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Glowing head.
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    ctx.shadowColor = glow;
    ctx.shadowBlur = heavy ? 22 : 14;
    ctx.fill();

    ctx.restore();
  }
}
