"use strict";

class Bullet {
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
    if (this.power === 2) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 5, 0, TAU);
      ctx.fillStyle = `rgba(255,90,30,${alpha})`;
      ctx.shadowColor = "#f40";
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2.5, 0, TAU);
      ctx.fillStyle = `rgba(255,255,100,${alpha})`;
      ctx.shadowColor = "#ff8";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

if (typeof module !== "undefined") module.exports = { Bullet };
