'use strict';

class PumicePoly {
    constructor(x, y) {
        this.x       = x;
        this.y       = y;
        this.radius  = rand(PUMICE_POLY_RADIUS_MIN, PUMICE_POLY_RADIUS_MAX);
        this.rot     = rand(0, TAU);
        this.hits    = 0;
        this.maxHits = Math.round(10 + (this.radius - 28) / 22 * 5); // 10 (small) – 15 (large)
        this._alive  = true;
        const n = randInt(11, 17);
        this.verts = Array.from({ length: n }, (_, i) => ({
            a: (i / n) * TAU + rand(-0.08, 0.08),
            r: this.radius * rand(0.82, 1.08),
        }));
        // Sort verts by normalized angle for stable interpolation in radiusAtAngle
        this.verts.sort((a, b) => this._normAngle(a.a) - this._normAngle(b.a));
        this.body = this._makeBody();
    }

    _normAngle(a) { return ((a % TAU) + TAU) % TAU; }

    // Polygon's outline radius at the given LOCAL angle (relative to pumice rotation)
    radiusAtAngle(localAngle) {
        const target = this._normAngle(localAngle);
        const n = this.verts.length;
        for (let i = 0; i < n; i++) {
            const v1 = this.verts[i];
            const v2 = this.verts[(i + 1) % n];
            const a1 = this._normAngle(v1.a);
            let span = this._normAngle(v2.a) - a1;
            if (span <= 0) span += TAU;
            let off = target - a1;
            if (off < 0) off += TAU;
            if (off <= span) {
                const t = off / span;
                return v1.r * (1 - t) + v2.r * t;
            }
        }
        return this.radius;
    }

    collidesWithCircle(wx, wy, r) {
        const dx = wx - this.x, dy = wy - this.y;
        const d  = Math.hypot(dx, dy);
        if (d === 0) return true;
        const polyR = this.radiusAtAngle(Math.atan2(dy, dx) - this.rot);
        return d < polyR + r;
    }

    _makeBody() {
        return Matter.Bodies.circle(this.x, this.y, this.radius, {
            isStatic: true, friction: 0, frictionAir: 0, restitution: 1, label: 'pumice-poly',
        });
    }

    get alive() { return this._alive; }

    hit(wx, wy) {
        const worldAngle = Math.atan2(wy - this.y, wx - this.x);
        const localHit   = worldAngle - this.rot;
        const dentRange  = 1.0;
        const dentDepth  = this.radius * 0.38;
        for (const v of this.verts) {
            let da = ((v.a - localHit + Math.PI * 3) % TAU) - Math.PI;
            da = Math.abs(da);
            if (da < dentRange) {
                const factor = 1 - da / dentRange;
                v.r = Math.max(this.radius * 0.08, v.r - dentDepth * factor);
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
