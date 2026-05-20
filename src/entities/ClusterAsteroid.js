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
        const half = sz / 2;

        // Pass 1: blur canvas
        const blur_oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
        const blur_ctx = blur_oc.getContext('2d');
        blur_ctx.fillStyle = '#050210';
        blur_ctx.fillRect(0, 0, sz, sz);
        blur_ctx.filter    = `blur(${blur}px)`;
        blur_ctx.fillStyle = 'rgb(100, 140, 185)';  // Eis
        for (const c of this._cells) {
            blur_ctx.beginPath();
            blur_ctx.arc(half + c.dx, half + c.dy, c.r * 1.25, 0, TAU);
            blur_ctx.fill();
        }
        blur_ctx.filter = 'none';

        // Pass 2: bake contrast into a second canvas so draw() needs no filter
        const oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
        const oct = oc.getContext('2d');
        oct.filter = 'contrast(14)';
        oct.drawImage(blur_oc, 0, 0);
        return oc;
    }

    get collisionRadius() { return this.radius * 0.65; }

    update(dt) {
        this.rot += this.rotSpeed * dt;
        return true;
    }

    draw() {
        const sz = this._offCanvas.width;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.drawImage(this._offCanvas, -sz / 2, -sz / 2);
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
