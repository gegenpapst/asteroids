'use strict';

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        const a   = rand(0, TAU);
        const spd = rand(35, PARTICLE_SPEED);
        this.vx      = Math.cos(a) * spd;
        this.vy      = Math.sin(a) * spd;
        this.life    = rand(0.3, PARTICLE_LIFE);
        this.maxLife = this.life;
        this.size    = rand(1, 3.5);
        this.color   = color ?? `hsl(${rand(18, 52)},100%,60%)`;
    }

    update(dt) {
        this.x    = wrap(this.x + this.vx * dt, W);
        this.y    = wrap(this.y + this.vy * dt, H);
        this.vx  *= 0.97;
        this.vy  *= 0.97;
        this.life -= dt;
        return this.life > 0;
    }

    draw() {
        const t = this.life / this.maxLife;
        ctx.globalAlpha = t * t;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * t, 0, TAU);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}
