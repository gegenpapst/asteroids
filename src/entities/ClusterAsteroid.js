"use strict";

// Metaball-Variante des Asteroiden — erbt Lifecycle von AsteroidBase, ergänzt Cells + Metaball-Render.
class ClusterAsteroid extends AsteroidBase {
  static _label = "cluster-asteroid";
  static _rotBase = 1.2;

  constructor(x, y, size = 0, angle = null) {
    super(x, y, size, angle);
    // Mirror the compound body: one core cell + one cell per bump.
    // This ensures the metaball silhouette matches the physics shape.
    const cells = [{ dx: 0, dy: 0, r: this._coreR }];
    for (const b of this._bumps) cells.push({ dx: b.dx, dy: b.dy, r: b.br });
    const avgBumpR =
      this._bumps.reduce((s, b) => s + b.br, 0) / (this._bumps.length || 1);
    this._offCanvas = buildMetaballCanvas(
      cells,
      "rgb(100, 140, 185)",
      this.radius,
      avgBumpR,
      14,
      0.55,
    );
  }

  get collisionRadius() {
    return this.radius * CLUSTER_COLLISION_FACTOR;
  }

  draw() {
    const sz = this._offCanvas.width;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.drawImage(this._offCanvas, -sz / 2, -sz / 2);
    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { ClusterAsteroid };
