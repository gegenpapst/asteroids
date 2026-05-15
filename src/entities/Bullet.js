'use strict';

class Bullet {
    constructor(x, y, vx, vy, life = BULLET_LIFE) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life    = life;
        this.maxLife = life;
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
        ctx.fillStyle   = `rgba(255,255,100,${alpha})`;
        ctx.shadowColor = '#ff8';
        ctx.shadowBlur  = 14;
        ctx.fill();
        ctx.shadowBlur  = 0;
    }
}
