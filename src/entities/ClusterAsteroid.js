'use strict';

class ClusterAsteroid {
    constructor(x, y, size = 0) {
        this.x    = x;
        this.y    = y;
        this.size = size;

        this.radius = ASTEROID_RADIUS[size];
        this.score  = ASTEROID_SCORE[size];

        const a     = rand(0, TAU);
        const speed = ASTEROID_SPEED[size] * rand(0.7, 1.35);
        this.vx       = Math.cos(a) * speed;
        this.vy       = Math.sin(a) * speed;
        this.rot      = rand(0, TAU);
        this.rotSpeed = rand(-1.2, 1.2) * (size + 1) * 0.38;

        this._cellR     = this.radius * 0.24;
        this._cells     = this._generateCells();
        this._offCanvas = this._buildOffCanvas();

        this.body = Matter.Bodies.circle(x, y, this.radius, {
            friction: 0, frictionAir: 0, restitution: 1, label: 'cluster-asteroid',
            plugin: { wrap: { min: { x: 0, y: 0 }, max: { x: W, y: H } } },
        });
        Matter.Body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });
    }

    _generateCells() {
        const cellR   = this._cellR;
        const spacing = cellR * 1.65;
        const rowH    = spacing * 0.866;
        const span    = Math.ceil(this.radius * 2 / rowH) + 1;
        const cells   = [];
        for (let row = 0; row < span; row++) {
            const dy0  = -this.radius + row * rowH;
            const xOff = (row % 2) * spacing / 2;
            for (let col = 0; col < span; col++) {
                const dx0 = -this.radius + col * spacing + xOff;
                if (Math.hypot(dx0, dy0) >= this.radius - cellR * 0.3) continue;
                cells.push({
                    dx: dx0 + rand(-1.5, 1.5),
                    dy: dy0 + rand(-1.5, 1.5),
                    r:  cellR * rand(0.85, 1.15),
                });
            }
        }
        return cells;
    }

    _buildOffCanvas() {
        const blur = Math.round(this._cellR * 0.75);
        const pad  = blur * 3 + 4;
        const sz   = Math.ceil((this.radius + pad) * 2);
        const oc   = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
        const oct  = oc.getContext('2d');
        const half = sz / 2;

        oct.fillStyle = '#050210';
        oct.fillRect(0, 0, sz, sz);

        oct.filter    = `blur(${blur}px)`;
        oct.fillStyle = 'rgb(155, 140, 118)';
        for (const c of this._cells) {
            oct.beginPath();
            oct.arc(half + c.dx, half + c.dy, c.r * 1.25, 0, TAU);
            oct.fill();
        }
        oct.filter = 'none';
        return oc;
    }

    update(dt) {
        this.rot += this.rotSpeed * dt;
        return true;
    }

    draw() {
        const sz = this._offCanvas.width;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.filter = 'contrast(14)';
        ctx.drawImage(this._offCanvas, -sz / 2, -sz / 2);
        ctx.filter = 'none';
        ctx.restore();
    }

    split() {
        if (this.size >= 2) return [];
        const offset = ASTEROID_RADIUS[this.size + 1];
        const perp   = rand(0, TAU);
        const ox = Math.cos(perp) * offset, oy = Math.sin(perp) * offset;
        return [
            new ClusterAsteroid(this.x + ox, this.y + oy, this.size + 1),
            new ClusterAsteroid(this.x - ox, this.y - oy, this.size + 1),
        ];
    }
}

if (typeof module !== 'undefined') module.exports = { ClusterAsteroid };
