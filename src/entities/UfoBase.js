'use strict';

// Gemeinsame Basis für Ufo und UfoCluster.
// Bewegung (sinusoidale Vertikale), Schießen (size-abhängig: gezielt vs. zufällig).
// Subklassen implementieren nur draw().
class UfoBase {
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
}

if (typeof module !== 'undefined') module.exports = { UfoBase };
