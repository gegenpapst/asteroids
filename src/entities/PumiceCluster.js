'use strict';

class PumiceCluster {
    constructor(x, y) {
        this.x         = x;
        this.y         = y;
        this.radius    = rand(22, 54);
        this._cellR    = this.radius * 0.22;
        this._blur     = Math.round(this._cellR * 0.75);
        this._pad      = this._blur * 3 + 4;
        this.cells     = this._generateCells();
        const size     = Math.ceil((this.radius + this._pad) * 2);
        this._offCanvas    = Object.assign(document.createElement('canvas'), { width: size, height: size });
        this._offCtx       = this._offCanvas.getContext('2d');
        this._contrastCanvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
        this._contrastCtx    = this._contrastCanvas.getContext('2d');
    }

    _generateCells() {
        const cellR   = this.radius * 0.22;
        const spacing = cellR * 1.65;
        const rowH    = spacing * 0.866;  // sqrt(3)/2 für Hex-Packing
        const span    = Math.ceil(this.radius * 2 / rowH) + 1;
        const cells   = [];
        for (let row = 0; row < span; row++) {
            const cy0  = this.y - this.radius + row * rowH;
            const xOff = (row % 2) * spacing / 2;
            for (let col = 0; col < span; col++) {
                const cx0 = this.x - this.radius + col * spacing + xOff;
                if (Math.hypot(cx0 - this.x, cy0 - this.y) >= this.radius - cellR * 0.3) continue;
                const x = cx0 + rand(-1.5, 1.5);
                const y = cy0 + rand(-1.5, 1.5);
                const r = cellR * rand(0.85, 1.15);
                const body = Matter.Bodies.circle(x, y, r, {
                    isStatic: true, friction: 0, frictionAir: 0, restitution: 1, label: 'pumice-cell',
                });
                cells.push({ x, y, r, body, alive: true });
            }
        }
        return cells;
    }

    get alive() { return this.cells.some(c => c.alive); }

    get collisionRadius() { return this.radius * 0.75; }

    findHit(wx, wy, br) {
        return this.cells.filter(c => c.alive && dist({ x: wx, y: wy }, c) < c.r + br);
    }

    update() { return true; }

    draw() {
        const alive = this.cells.filter(c => c.alive);
        if (!alive.length) return;

        const offCtx = this._offCtx;
        const size   = this._offCanvas.width;
        const ox     = this.x - size / 2;
        const oy     = this.y - size / 2;

        offCtx.fillStyle = '#050210';
        offCtx.fillRect(0, 0, size, size);

        offCtx.filter    = `blur(${this._blur}px)`;
        offCtx.fillStyle = 'rgb(145, 145, 158)';  // Steingrau
        for (const c of alive) {
            offCtx.beginPath();
            offCtx.arc(c.x - ox, c.y - oy, c.r * 1.25, 0, TAU);
            offCtx.fill();
        }
        offCtx.filter = 'none';

        // Bake contrast into secondary canvas so main canvas needs no filter
        const cc = this._contrastCtx;
        cc.clearRect(0, 0, size, size);
        cc.filter = 'contrast(6)';   // Steingrau: weicherer Schwellwert
        cc.drawImage(this._offCanvas, 0, 0);
        cc.filter = 'none';

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(this._contrastCanvas, ox, oy);
        ctx.restore();
    }
}

if (typeof module !== 'undefined') module.exports = { PumiceCluster };
