'use strict';

// Polygon-Variante des UFOs — erbt Bewegung/Schießen von UfoBase, implementiert nur draw().
class Ufo extends UfoBase {
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const r   = this.radius;
        const col = this.size === 0 ? '#4f8' : '#f55';
        const glw = this.size === 0 ? '#2d6' : '#f00';

        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.8;
        ctx.shadowColor = glw;
        ctx.shadowBlur  = 14;

        // Body
        ctx.beginPath();
        ctx.ellipse(0, r * 0.15, r, r * 0.38, 0, 0, TAU);
        ctx.stroke();

        // Dome
        ctx.beginPath();
        ctx.ellipse(0, r * 0.05, r * 0.52, r * 0.38, 0, Math.PI, 0);
        ctx.stroke();

        // Blinking cabin light
        if (Math.floor(Date.now() / 350) % 2) {
            ctx.beginPath();
            ctx.arc(0, -r * 0.2, r * 0.13, 0, TAU);
            ctx.fillStyle  = col;
            ctx.shadowBlur = 10;
            ctx.fill();
        }

        ctx.restore();
    }
}

if (typeof module !== 'undefined') module.exports = { Ufo };
