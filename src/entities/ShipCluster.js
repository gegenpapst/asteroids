'use strict';

function _inTri(px, py, ax, ay, bx, by, cx, cy) {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
}

class ShipCluster {
    constructor() {
        this.x            = W / 2;
        this.y            = H / 2;
        this.vx           = 0;
        this.vy           = 0;
        this.angle        = -Math.PI / 2;
        this.invulnerable = INVULNERABLE_TIME;
        this.fireTimer    = 0;
        this.thrusting    = false;
        this.flameT       = 0;
        this.shieldTimer  = 0;
        this.rapidTimer   = 0;
        this.spreadTimer  = 0;
        this.heavyTimer   = 0;

        this._cellR     = Math.round(SHIP_SIZE * 0.19);
        this._cells     = this._generateCells();
        this._offCanvas = this._buildOffCanvas();
    }

    get radius() { return SHIP_SIZE * 0.7; }

    _generateCells() {
        const cellR   = this._cellR;
        const spacing = cellR * 1.65;
        const rowH    = spacing * 0.866;
        const s       = SHIP_SIZE;

        // Elongated ellipse centred slightly toward the tip
        const rx      = s * 0.78;
        const ry      = s * 0.44;
        const xCenter = s * 0.12;

        const span  = Math.ceil(s * 2.2 / rowH) + 2;
        const cells = [];
        for (let row = 0; row < span; row++) {
            const dy   = -s * 1.1 + row * rowH;
            const xOff = (row % 2) * spacing / 2;
            for (let col = 0; col < span; col++) {
                const dx = -s * 1.1 + col * spacing + xOff;
                if ((dx - xCenter) ** 2 / rx ** 2 + dy ** 2 / ry ** 2 >= 1) continue;
                cells.push({
                    dx: dx + rand(-0.8, 0.8),
                    dy: dy + rand(-0.8, 0.8),
                    r:  cellR * rand(0.85, 1.15),
                });
            }
        }
        return cells;
    }

    _buildOffCanvas() {
        const cellR = this._cellR;
        const blur  = Math.max(3, Math.round(cellR * 1.6));
        const pad   = blur * 3 + 4;
        const sz    = Math.ceil((SHIP_SIZE + pad) * 2);
        const half  = sz / 2;

        // Pass 1: blur canvas
        const blur_oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
        const blur_ctx = blur_oc.getContext('2d');
        blur_ctx.fillStyle = '#050210';
        blur_ctx.fillRect(0, 0, sz, sz);
        blur_ctx.filter    = `blur(${blur}px)`;
        blur_ctx.fillStyle = 'rgb(80, 200, 255)';
        for (const c of this._cells) {
            blur_ctx.beginPath();
            blur_ctx.arc(half + c.dx, half + c.dy, c.r * 1.6, 0, TAU);
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

    teleport(x, y) {
        this.x = x;
        this.y = y;
        this.invulnerable = 1.5;
    }

    update(dt) {
        if (this.invulnerable > 0) this.invulnerable -= dt;
        if (this.fireTimer    > 0) this.fireTimer    -= dt;
        if (this.shieldTimer  > 0) this.shieldTimer  -= dt;
        if (this.rapidTimer   > 0) this.rapidTimer   -= dt;
        if (this.spreadTimer  > 0) this.spreadTimer  -= dt;
        if (this.heavyTimer   > 0) this.heavyTimer   -= dt;

        if (Input.left())  this.angle -= SHIP_ROTATION * dt;
        if (Input.right()) this.angle += SHIP_ROTATION * dt;

        if (Input.strafeLeft() || Input.strafeRight()) {
            const dir = Input.strafeLeft() ? 1 : -1;
            const cos = Math.cos(this.angle), sin = Math.sin(this.angle);
            const fwd = this.vx * cos + this.vy * sin;
            const lat = -this.vx * sin + this.vy * cos;
            const maxLat = Math.min(SHIP_STRAFE_SPEED, Math.abs(fwd));
            const newLat = clamp(lat + dir * SHIP_STRAFE_ACCEL * dt, -maxLat, maxLat);
            this.vx = fwd * cos - newLat * sin;
            this.vy = fwd * sin + newLat * cos;
        }

        this.thrusting = Input.up();
        if (this.thrusting) {
            this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
            this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
        }

        const speed = Math.hypot(this.vx, this.vy);
        if (speed > SHIP_MAX_SPEED) {
            const s = SHIP_MAX_SPEED / speed;
            this.vx *= s;
            this.vy *= s;
        }

        const friction = Math.pow(SHIP_FRICTION, dt * 60);
        this.vx *= friction;
        this.vy *= friction;
        const spd = Math.hypot(this.vx, this.vy);
        if (spd > 0 && spd < SHIP_MIN_SPEED) {
            const s = SHIP_MIN_SPEED / spd;
            this.vx *= s;
            this.vy *= s;
        }

        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);

        this.flameT += dt * 18;
    }

    canFire() { return this.fireTimer <= 0 && Input.fire(); }

    fire(bulletLife = BULLET_LIFE) {
        this.fireTimer = this.rapidTimer > 0 ? FIRE_RATE / 2 : FIRE_RATE;
        const tx    = this.x + Math.cos(this.angle) * SHIP_SIZE;
        const ty    = this.y + Math.sin(this.angle) * SHIP_SIZE;
        const power = this.heavyTimer > 0 ? 2 : 1;
        if (this.spreadTimer > 0) {
            return [
                new Bullet(tx, ty, this.vx + Math.cos(this.angle - 0.26) * BULLET_SPEED, this.vy + Math.sin(this.angle - 0.26) * BULLET_SPEED, bulletLife, power),
                new Bullet(tx, ty, this.vx + Math.cos(this.angle)         * BULLET_SPEED, this.vy + Math.sin(this.angle)         * BULLET_SPEED, bulletLife, power),
                new Bullet(tx, ty, this.vx + Math.cos(this.angle + 0.26) * BULLET_SPEED, this.vy + Math.sin(this.angle + 0.26) * BULLET_SPEED, bulletLife, power),
            ];
        }
        return [new Bullet(tx, ty,
            this.vx + Math.cos(this.angle) * BULLET_SPEED,
            this.vy + Math.sin(this.angle) * BULLET_SPEED,
            bulletLife, power,
        )];
    }

    draw() {
        if (this.invulnerable > 0 && Math.floor(this.invulnerable * 8) % 2 === 0) return;

        const sz = this._offCanvas.width;

        // Shield bubble
        if (this.shieldTimer > 0) {
            const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 140);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            ctx.arc(0, 0, SHIP_SIZE * 2.2, 0, TAU);
            ctx.strokeStyle = `rgba(50,210,255,${pulse})`;
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur  = 20;
            ctx.lineWidth   = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Metaball hull
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.drawImage(this._offCanvas, -sz / 2, -sz / 2);
        ctx.restore();

        // Thruster flame
        if (this.thrusting) {
            const flicker  = 0.5 + 0.5 * Math.sin(this.flameT);
            const flameLen = SHIP_SIZE * (0.45 + flicker * 0.55);
            const r = 255, g = (90 + flicker * 120) | 0;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.beginPath();
            ctx.moveTo(-SHIP_SIZE * 0.35, -SHIP_SIZE * 0.2);
            ctx.lineTo(-SHIP_SIZE * 0.35 - flameLen, 0);
            ctx.lineTo(-SHIP_SIZE * 0.35,  SHIP_SIZE * 0.2);
            ctx.strokeStyle = `rgba(${r},${g},0,${0.75 + flicker * 0.25})`;
            ctx.shadowColor = '#f80';
            ctx.shadowBlur  = 14;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
            ctx.restore();
        }
    }
}

if (typeof module !== 'undefined') module.exports = { ShipCluster };
