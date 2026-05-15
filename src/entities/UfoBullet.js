'use strict';

class UfoBullet {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life    = BULLET_LIFE;
        this.maxLife = BULLET_LIFE;
    }

    get radius() { return 3; }

    update(dt) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.life -= dt;
        return this.life > 0;
    }

    draw() {
        const alpha = clamp(this.life / this.maxLife * 2, 0, 1);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, TAU);
        ctx.fillStyle   = `rgba(255,80,80,${alpha})`;
        ctx.shadowColor = '#f00';
        ctx.shadowBlur  = 12;
        ctx.fill();
        ctx.shadowBlur  = 0;
    }
}

if (typeof module !== 'undefined') module.exports = { UfoBullet };
