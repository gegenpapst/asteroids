'use strict';

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
    }

    get radius() { return SHIP_SIZE * 0.7; }

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

        const s = SHIP_SIZE;

        // Shield bubble
        if (this.shieldTimer > 0) {
            const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 140);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.beginPath();
            ctx.arc(0, 0, s * 2.2, 0, TAU);
            ctx.strokeStyle = `rgba(50,210,255,${pulse})`;
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur  = 20;
            ctx.lineWidth   = 2;
            ctx.stroke();
            ctx.restore();
        }

        // Hull — gradient fill
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.beginPath();
        ctx.moveTo(s, 0);
        ctx.lineTo(-s * 0.7, -s * 0.55);
        ctx.lineTo(-s * 0.35, 0);
        ctx.lineTo(-s * 0.7,  s * 0.55);
        ctx.closePath();

        const hg = ctx.createLinearGradient(-s * 0.7, 0, s, 0);
        hg.addColorStop(0,    '#050e1c');
        hg.addColorStop(0.55, '#0b1c38');
        hg.addColorStop(1,    '#102244');
        ctx.fillStyle   = hg;
        ctx.shadowColor = '#28c8ff';
        ctx.shadowBlur  = 8;
        ctx.fill();

        ctx.strokeStyle = '#5cf';
        ctx.lineWidth   = 1;
        ctx.stroke();

        // Wing panel traces
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#8df';
        ctx.shadowBlur  = 0;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.moveTo(s * 0.1, 0);
        ctx.lineTo(-s * 0.58, -s * 0.44);
        ctx.moveTo(s * 0.1, 0);
        ctx.lineTo(-s * 0.58,  s * 0.44);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Cockpit highlight
        const cg = ctx.createRadialGradient(s * 0.14, -s * 0.04, 0, s * 0.22, 0, s * 0.2);
        cg.addColorStop(0, 'rgba(200,245,255,0.95)');
        cg.addColorStop(1, 'rgba(30,100,180,0.2)');
        ctx.beginPath();
        ctx.arc(s * 0.22, 0, s * 0.2, 0, TAU);
        ctx.fillStyle   = cg;
        ctx.shadowColor = '#9ef';
        ctx.shadowBlur  = 8;
        ctx.fill();

        // Engine arc
        ctx.beginPath();
        ctx.arc(-s * 0.35, 0, s * 0.18, Math.PI * 0.5, Math.PI * 1.5);
        ctx.strokeStyle = '#f90';
        ctx.shadowColor = '#f80';
        ctx.shadowBlur  = 10;
        ctx.lineWidth   = 2;
        ctx.stroke();

        ctx.restore();

        // Thruster flame
        if (this.thrusting) {
            const flicker  = 0.5 + 0.5 * Math.sin(this.flameT);
            const flameLen = s * (0.45 + flicker * 0.55);
            const r = 255, g = (90 + flicker * 120) | 0;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.beginPath();
            ctx.moveTo(-s * 0.35, -s * 0.2);
            ctx.lineTo(-s * 0.35 - flameLen, 0);
            ctx.lineTo(-s * 0.35,  s * 0.2);
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
