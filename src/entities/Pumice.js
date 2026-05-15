'use strict';

class Pumice {
    constructor(x, y) {
        this.x       = x;
        this.y       = y;
        this.radius  = rand(22, 54);
        this.rot     = rand(0, TAU);
        this.verts   = Array.from({ length: 14 }, (_, i) => ({
            a: (TAU / 14) * i + rand(-0.1, 0.1),
            r: this.radius * rand(0.75, 1.20),
        }));
        this.verts.forEach(v => { v.r0 = v.r; });
        this.holes   = [];
        this.hits    = 0;
        this.maxHits = Math.max(6, Math.round(this.radius * 0.45));
        this.alive   = true;
        this.body = Matter.Bodies.circle(x, y, this.radius, {
            isStatic: true, friction: 0, frictionAir: 0, restitution: 1, label: 'pumice',
        });
    }

    get currentRadius() {
        return this.radius * Math.max(0.05, 1 - this.hits / this.maxHits);
    }

    hit(wx, wy) {
        this.hits++;
        this.holes.push({ x: wx, y: wy });

        // Erodiere die 3 Vertices am nächsten zur Einschlagsrichtung
        const angle = Math.atan2(wy - this.y, wx - this.x) - this.rot;
        this.verts
            .map((v, i) => ({ i, d: Math.abs(((v.a - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 3)
            .forEach(({ i }, rank) => {
                this.verts[i].r = Math.max(0, this.verts[i].r * (rank === 0 ? 0.55 : 0.78));
            });

        if (this.hits >= this.maxHits) this.alive = false;
    }

    update() { return true; }

    draw() {
        if (!this.alive) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.beginPath();
        for (let i = 0; i < this.verts.length; i++) {
            const { a, r } = this.verts[i];
            i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                    : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle   = 'rgba(160, 155, 148, 0.6)';
        ctx.strokeStyle = '#9a9288';
        ctx.lineWidth   = 2;
        ctx.shadowColor = '#706860';
        ctx.shadowBlur  = 8;
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Einschusslöcher in Weltkoordinaten
        for (const h of this.holes) {
            ctx.beginPath();
            ctx.arc(h.x, h.y, 3.5, 0, TAU);
            ctx.fillStyle   = 'rgba(20, 15, 10, 0.85)';
            ctx.shadowColor = '#000';
            ctx.shadowBlur  = 4;
            ctx.fill();
            ctx.shadowBlur  = 0;
            ctx.beginPath();
            ctx.arc(h.x, h.y, 3.5, 0, TAU);
            ctx.strokeStyle = 'rgba(200, 190, 180, 0.5)';
            ctx.lineWidth   = 1;
            ctx.stroke();
        }
    }
}

if (typeof module !== 'undefined') module.exports = { Pumice };
