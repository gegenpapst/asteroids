'use strict';

class Pumice {
    constructor(x, y) {
        this.x      = x;
        this.y      = y;
        this.radius = rand(22, 54);
        this.cells  = this._generateCells();
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

    findHit(wx, wy, br) {
        return this.cells.filter(c => c.alive && dist({ x: wx, y: wy }, c) < c.r + br);
    }

    update() { return true; }

    draw() {
        for (const c of this.cells) {
            if (!c.alive) continue;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, TAU);
            ctx.fillStyle   = 'rgba(160, 155, 148, 0.55)';
            ctx.strokeStyle = 'rgba(154, 146, 136, 0.7)';
            ctx.lineWidth   = 1.5;
            ctx.shadowColor = '#706860';
            ctx.shadowBlur  = 6;
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur  = 0;
        }
    }
}

if (typeof module !== 'undefined') module.exports = { Pumice };
