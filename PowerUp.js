'use strict';

class PowerUp {
    constructor(x, y, type) {
        this.x        = x;
        this.y        = y;
        this.type     = type;
        this.vx       = rand(-20, 20);
        this.vy       = rand(-20, 20);
        this.rot      = 0;
        this.rotSpeed = 1.5;
        this.life     = 8.0;
        this.radius   = 12;
    }

    update(dt) {
        this.x    = wrap(this.x + this.vx * dt, W);
        this.y    = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpeed * dt;
        this.life -= dt;
        return this.life > 0;
    }

    draw() {
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 330);
        const r     = this.radius;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = pulse;

        if (this.type === 'shield') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * TAU - Math.PI / 6;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.strokeStyle = '#4cf';
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur  = 16;
            ctx.lineWidth   = 1.8;
            ctx.stroke();
        } else if (this.type === 'rapid') {
            ctx.strokeStyle = '#f84';
            ctx.shadowColor = '#f80';
            ctx.shadowBlur  = 16;
            ctx.lineWidth   = 2;
            for (const ox of [-5, 3]) {
                ctx.beginPath();
                ctx.moveTo(ox,      -r * 0.6);
                ctx.lineTo(ox + 7,   0);
                ctx.lineTo(ox,       r * 0.6);
                ctx.stroke();
            }
        } else {
            ctx.strokeStyle = '#ff4';
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur  = 16;
            ctx.lineWidth   = 1.8;
            for (const a of [-0.42, 0, 0.42]) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
