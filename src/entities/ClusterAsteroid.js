"use strict";

// Metaball-Variante des Asteroiden — erbt Lifecycle von AsteroidBase, ergänzt Cells + Metaball-Render.
class ClusterAsteroid extends AsteroidBase {
  static _label = "cluster-asteroid";
  static _rotBase = 1.2;

  constructor(x, y, size = 0, angle = null, maxBumps = 7) {
    super(x, y, size, angle, maxBumps);
    // Mirror the compound body: one core cell + one cell per bump.
    // This ensures the metaball silhouette matches the physics shape.
    const cells = [{ dx: 0, dy: 0, r: this._coreR }];
    for (const b of this._bumps) cells.push({ dx: b.dx, dy: b.dy, r: b.br });
    const blurBase =
      this._bumps.length > 0
        ? this._bumps.reduce((s, b) => s + b.br, 0) / this._bumps.length
        : this._coreR * 0.4;
    this._offCanvas = buildMetaballCanvas(
      cells,
      "rgb(100, 140, 185)",
      this.radius,
      blurBase,
      14,
      0.55,
    );
  }

  get collisionRadius() {
    // 0 bumps = full circle, scale down with bump count
    return this.radius * (0.9 - (0.25 * Math.min(this.bumpCount, 7)) / 7);
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
