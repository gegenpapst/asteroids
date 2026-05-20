'use strict';

class UfoCluster {
    constructor(size, onBullet) {
        this.size      = size;
        this.radius    = UFO_RADIUS[size];
        this.score     = UFO_SCORE[size];
        this._onBullet = onBullet;

        const fromLeft = Math.random() < 0.5;
        this.x         = fromLeft ? -this.radius : W + this.radius;
        this.vx        = fromLeft ? UFO_SPEED[size] : -UFO_SPEED[size];
        this.baseY     = rand(H * 0.12, H * 0.88);
        this.y         = this.baseY;
        this.sineAmp   = rand(60, 130);
        this.sineFreq  = rand(0.7, 1.3);
        this.sineT     = 0;
        this.fireTimer = rand(1.5, 3.0);

        this._offCanvas = this._buildOffCanvas();
    }

    _buildOffCanvas() {
        const r     = this.radius;
        const cellR = Math.max(2, Math.round(r * 0.28));
        const blur  = Math.max(2, Math.round(cellR * 0.85));
        const pad   = blur * 3 + 4;
        const sz    = Math.ceil((r + pad) * 2);
        const half  = sz / 2;

        // Generate cells for disc + dome regions
        const spacing = cellR * 1.65;
        const rowH    = spacing * 0.866;
        const span    = Math.ceil(sz / rowH) + 1;
        const cells   = [];
        for (let row = 0; row < span; row++) {
            const dy   = -half + row * rowH;
            const xOff = (row % 2) * spacing / 2;
            for (let col = 0; col < span; col++) {
                const dx = -half + col * spacing + xOff;
                const inDisc = (dx / r) ** 2 + ((dy - r * 0.15) / (r * 0.38)) ** 2 < 1;
                const inDome = (dx / (r * 0.52)) ** 2 + ((dy - r * 0.05) / (r * 0.38)) ** 2 < 1
                    && dy < r * 0.05;
                if (!inDisc && !inDome) continue;
                cells.push({
                    dx: dx + rand(-1, 1),
                    dy: dy + rand(-1, 1),
                    r:  cellR * rand(0.85, 1.15),
                });
            }
        }

        // Pass 1: blur canvas
        const col      = this.size === 0 ? 'rgb(80, 200, 100)' : 'rgb(200, 80, 80)';
        const blur_oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
        const blur_ctx = blur_oc.getContext('2d');
        blur_ctx.fillStyle = '#050210';
        blur_ctx.fillRect(0, 0, sz, sz);
        blur_ctx.filter    = `blur(${blur}px)`;
        blur_ctx.fillStyle = col;
        for (const c of cells) {
            blur_ctx.beginPath();
            blur_ctx.arc(half + c.dx, half + c.dy, c.r * 1.25, 0, TAU);
            blur_ctx.fill();
        }
        blur_ctx.filter = 'none';

        // Pass 2: bake contrast
        const oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
        const oct = oc.getContext('2d');
        oct.filter = 'contrast(14)';
        oct.drawImage(blur_oc, 0, 0);
        return oc;
    }

    update(dt, ship) {
        this.x     += this.vx * dt;
        this.sineT += dt;
        this.y      = clamp(
            this.baseY + Math.sin(this.sineT * this.sineFreq) * this.sineAmp,
            this.radius, H - this.radius
        );

        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this._fire(ship);
            this.fireTimer = rand(1.2, 2.5);
        }

        if (this.vx > 0 && this.x > W + this.radius * 2) return false;
        if (this.vx < 0 && this.x < -this.radius * 2)    return false;
        return true;
    }

    _fire(ship) {
        let angle;
        if (this.size === 1 && ship) {
            angle = Math.atan2(ship.y - this.y, ship.x - this.x) + rand(-0.26, 0.26);
        } else {
            angle = rand(0, TAU);
        }
        const spd = BULLET_SPEED * 0.75;
        this._onBullet(new UfoBullet(
            this.x, this.y,
            Math.cos(angle) * spd, Math.sin(angle) * spd
        ));
    }

    draw() {
        const sz  = this._offCanvas.width;
        const col = this.size === 0 ? '#4f8' : '#f55';

        // Metaball body
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(this.x, this.y);
        ctx.drawImage(this._offCanvas, -sz / 2, -sz / 2);
        ctx.restore();

        // Blinking cabin light
        if (Math.floor(Date.now() / 350) % 2) {
            const r = this.radius;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            ctx.arc(0, -r * 0.2, r * 0.13, 0, TAU);
            ctx.fillStyle   = col;
            ctx.shadowColor = col;
            ctx.shadowBlur  = 10;
            ctx.fill();
            ctx.restore();
        }
    }
}

if (typeof module !== 'undefined') module.exports = { UfoCluster };
