'use strict';

class Rock {
    constructor(x, y) {
        this.x      = x;
        this.y      = y;
        this.radius = rand(22, 54);
        this.rot    = rand(0, TAU);
        this.verts  = Array.from({ length: 16 }, (_, i) => ({
            a: (TAU / 16) * i + rand(-0.08, 0.08),
            r: this.radius * rand(0.80, 1.15),
        }));
        this.body = Matter.Bodies.circle(x, y, this.radius, {
            isStatic: true, friction: 0, frictionAir: 0, restitution: 1, label: 'rock',
        });
    }

    update() { return true; }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.beginPath();
        for (let i = 0; i < this.verts.length; i++) {
            const { a, r } = this.verts[i];
            const px = Math.cos(a) * r;
            const py = Math.sin(a) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle   = 'rgba(72, 54, 36, 0.45)';
        ctx.strokeStyle = '#7a5c3a';
        ctx.lineWidth   = 2.5;
        ctx.shadowColor = '#4a3820';
        ctx.shadowBlur  = 10;
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

if (typeof module !== 'undefined') module.exports = { Rock };
