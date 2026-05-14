'use strict';

class Ship {
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
    }

    get radius() { return SHIP_SIZE * 0.7; }

    update(dt) {
        if (this.invulnerable > 0) this.invulnerable -= dt;
        if (this.fireTimer    > 0) this.fireTimer    -= dt;
        if (this.shieldTimer  > 0) this.shieldTimer  -= dt;
        if (this.rapidTimer   > 0) this.rapidTimer   -= dt;
        if (this.spreadTimer  > 0) this.spreadTimer  -= dt;

        if (Input.left())  this.angle -= SHIP_ROTATION * dt;
        if (Input.right()) this.angle += SHIP_ROTATION * dt;

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

    fire() {
        this.fireTimer = this.rapidTimer > 0 ? FIRE_RATE / 2 : FIRE_RATE;
        const tx = this.x + Math.cos(this.angle) * SHIP_SIZE;
        const ty = this.y + Math.sin(this.angle) * SHIP_SIZE;
        if (this.spreadTimer > 0) {
            return [
                new Bullet(tx, ty, this.vx + Math.cos(this.angle - 0.26) * BULLET_SPEED, this.vy + Math.sin(this.angle - 0.26) * BULLET_SPEED),
                new Bullet(tx, ty, this.vx + Math.cos(this.angle)         * BULLET_SPEED, this.vy + Math.sin(this.angle)         * BULLET_SPEED),
                new Bullet(tx, ty, this.vx + Math.cos(this.angle + 0.26) * BULLET_SPEED, this.vy + Math.sin(this.angle + 0.26) * BULLET_SPEED),
            ];
        }
        return [new Bullet(tx, ty,
            this.vx + Math.cos(this.angle) * BULLET_SPEED,
            this.vy + Math.sin(this.angle) * BULLET_SPEED,
        )];
    }

    draw() {
        if (this.invulnerable > 0 && Math.floor(this.invulnerable * 8) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Shield bubble
        if (this.shieldTimer > 0) {
            const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 140);
            ctx.beginPath();
            ctx.arc(0, 0, SHIP_SIZE * 2.2, 0, TAU);
            ctx.strokeStyle = `rgba(50,210,255,${pulse})`;
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur  = 20;
            ctx.lineWidth   = 2;
            ctx.stroke();
        }

        // Hull — bloom pass then main pass on same path
        ctx.beginPath();
        ctx.moveTo( SHIP_SIZE,          0);
        ctx.lineTo(-SHIP_SIZE * 0.65,  -SHIP_SIZE * 0.5);
        ctx.lineTo(-SHIP_SIZE * 0.35,   0);
        ctx.lineTo(-SHIP_SIZE * 0.65,   SHIP_SIZE * 0.5);
        ctx.closePath();
        ctx.strokeStyle = '#b8f0ff';
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = '#4af';

        ctx.globalAlpha = 0.3;
        ctx.shadowBlur  = 35;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 18;
        ctx.stroke();

        // Thruster flame
        if (this.thrusting) {
            const flicker  = 0.5 + 0.5 * Math.sin(this.flameT);
            const flameLen = SHIP_SIZE * (0.45 + flicker * 0.55);
            const r = 255, g = (90 + flicker * 120) | 0;
            ctx.beginPath();
            ctx.moveTo(-SHIP_SIZE * 0.35, -SHIP_SIZE * 0.2);
            ctx.lineTo(-SHIP_SIZE * 0.35 - flameLen, 0);
            ctx.lineTo(-SHIP_SIZE * 0.35,  SHIP_SIZE * 0.2);
            ctx.strokeStyle = `rgba(${r},${g},0,${0.75 + flicker * 0.25})`;
            ctx.shadowColor = '#f80';
            ctx.shadowBlur  = 14;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }
}
