'use strict';

// Metaball-Variante des statischen Rocks — Glut-Farbe (rot-orange).
class RockCluster {
    constructor(x, y) {
        this.x      = x;
        this.y      = y;
        this.radius = rand(25, 55);

        const cellR     = this.radius * 0.24;
        const cells     = generateHexCells(this.radius, cellR);
        this._offCanvas = buildMetaballCanvas(cells, 'rgb(155, 140, 118)', this.radius, cellR);  // Glut

        this.body = Matter.Bodies.circle(x, y, this.radius, {
            isStatic: true, friction: 0, frictionAir: 0, restitution: 1,
            label: 'rock-cluster',
        });
    }

    get collisionRadius() { return this.radius * 0.65; }

    draw() {
        const sz = this._offCanvas.width;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(this.x, this.y);
        ctx.drawImage(this._offCanvas, -sz / 2, -sz / 2);
        ctx.restore();
    }
}

if (typeof module !== 'undefined') module.exports = { RockCluster };
