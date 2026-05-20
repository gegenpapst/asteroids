'use strict';

// Metaball-Variante des Asteroiden — erbt Lifecycle von AsteroidBase, ergänzt Cells + Metaball-Render.
class ClusterAsteroid extends AsteroidBase {
    static _label   = 'cluster-asteroid';
    static _rotBase = 1.2;

    constructor(x, y, size = 0, angle = null) {
        super(x, y, size, angle);
        const cellR     = this.radius * CLUSTER_CELL_FACTOR;
        const cells     = generateHexCells(this.radius, cellR);
        this._offCanvas = buildMetaballCanvas(cells, 'rgb(100, 140, 185)', this.radius, cellR);  // Eis
    }

    get collisionRadius() { return this.radius * CLUSTER_COLLISION_FACTOR; }

    draw() {
        const sz = this._offCanvas.width;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.drawImage(this._offCanvas, -sz / 2, -sz / 2);
        ctx.restore();
    }
}

if (typeof module !== 'undefined') module.exports = { ClusterAsteroid };
