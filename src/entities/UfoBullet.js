"use strict";

class UfoBullet extends Bullet {
  draw(ctx) {
    const alpha = clamp((this.life / this.maxLife) * 2, 0, 1);
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, TAU);
    ctx.fillStyle = `rgba(255,80,80,${alpha})`;
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

if (typeof module !== "undefined") module.exports = { UfoBullet };
