'use strict';

const ASTEROID_COLORS = ['#8899aa', '#99aaaa', '#aabbbb'];

class Asteroid {
    constructor(x, y, size = 0, angle = null) {
        this.x    = x;
        this.y    = y;
        this.size = size;

        this.radius = ASTEROID_RADIUS[size];
        this.score  = ASTEROID_SCORE[size];

        const a     = angle ?? rand(0, TAU);
        const speed = ASTEROID_SPEED[size] * rand(0.7, 1.35);
        this.vx       = Math.cos(a) * speed;
        this.vy       = Math.sin(a) * speed;
        this.rot      = rand(0, TAU);
        this.rotSpeed = rand(-1.6, 1.6) * (size + 1) * 0.38;

        const n = randInt(7, 13);
        this.verts = Array.from({ length: n }, (_, i) => {
            const baseAngle = (i / n) * TAU;
            const jitter    = (TAU / n) * rand(-0.38, 0.38);
            return {
                a: baseAngle + jitter,
                r: this.radius * rand(0.62, 1.28),
            };
        });
    }

    update(dt) {
        this.x   = wrap(this.x + this.vx * dt, W);
        this.y   = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpeed * dt;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);

        ctx.beginPath();
        const { a: a0, r: r0 } = this.verts[0];
        ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
        for (let i = 1; i < this.verts.length; i++) {
            const { a, r } = this.verts[i];
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();

        const col = ASTEROID_COLORS[this.size];
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = col;
        ctx.shadowBlur  = 7;
        ctx.stroke();
        ctx.restore();
    }

    split() {
        if (this.size >= 2) return [];
        return [
            new Asteroid(this.x, this.y, this.size + 1, rand(0, TAU)),
            new Asteroid(this.x, this.y, this.size + 1, rand(0, TAU)),
        ];
    }
}

if (typeof module !== 'undefined') module.exports = { Asteroid };
