'use strict';

class PumicePoly {
    constructor(x, y) {
        this.x       = x;
        this.y       = y;
        this.radius  = rand(28, 50);
        this.rot     = rand(0, TAU);
        this.hits    = 0;
        this.maxHits = 5;
        this._alive  = true;
        const n = randInt(11, 17);
        this.verts = Array.from({ length: n }, (_, i) => ({
            a: (i / n) * TAU + rand(-0.08, 0.08),
            r: this.radius * rand(0.82, 1.08),
        }));
        this.body = this._makeBody();
    }

    _makeBody() {
        return Matter.Bodies.circle(this.x, this.y, this.radius, {
            isStatic: true, friction: 0, frictionAir: 0, restitution: 1, label: 'pumice-poly',
        });
    }

    get alive() { return this._alive; }

    hit(wx, wy) {
        const shrink = 0.86;
        this.radius *= shrink;
        for (const v of this.verts) v.r *= shrink;

        const worldAngle = Math.atan2(wy - this.y, wx - this.x);
        const localHit   = worldAngle - this.rot;
        const dentRange  = 0.55;
        const dentDepth  = this.radius * 0.35;
        for (const v of this.verts) {
            let da = ((v.a - localHit + Math.PI * 3) % TAU) - Math.PI;
            da = Math.abs(da);
            if (da < dentRange) {
                const factor = 1 - da / dentRange;
                v.r = Math.max(this.radius * 0.2, v.r - dentDepth * factor);
            }
        }

        this.hits++;
        const oldBody = this.body;
        if (this.hits >= this.maxHits) {
            this._alive = false;
            this.body   = null;
            return { destroyed: true, oldBody, newBody: null };
        }
        this.body = this._makeBody();
        return { destroyed: false, oldBody, newBody: this.body };
    }

    update() { return this._alive; }

    draw() {
        if (!this._alive) return;
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
        ctx.fillStyle   = 'rgba(168, 162, 152, 0.7)';
        ctx.strokeStyle = 'rgba(210, 202, 190, 0.95)';
        ctx.lineWidth   = 1.8;
        ctx.shadowColor = '#706860';
        ctx.shadowBlur  = 8;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

if (typeof module !== 'undefined') module.exports = { PumicePoly };
