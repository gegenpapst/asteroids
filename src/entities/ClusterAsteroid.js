"use strict";

// Metaball variant of the asteroid — inherits lifecycle from AsteroidBase, adds cells + metaball render.
class ClusterAsteroid extends AsteroidBase {
  static _label = "cluster-asteroid";
  static _rotBase = 1.2;

  // color: optional override; defaults to the standard steel-blue asteroid tint.
  //   Pass a {center, body} object to enable radial gradient fill (e.g. satellite split children).
  constructor(x, y, size = 0, angle = null, maxBumps = 7, color = "rgb(100, 140, 185)") {
    super(x, y, size, angle, maxBumps);
    if (color && typeof color === "object") {
      this._gradientCenter = color.center;
      this._gradientBody = color.body;
      this._offCanvas = null;
    } else {
      this._gradientCenter = null;
      this._gradientBody = null;
      // Use physics bump positions but uniform visual radius for all cells.
      // The physics body (core + bumps) drives collision; visuals use a
      // consistent cell size so no single blob dominates the silhouette.
      const cellR =
        this._bumps.length > 0
          ? this._bumps.reduce((s, b) => s + b.br, 0) / this._bumps.length
          : this._coreR * 0.55;
      const cells = [{ dx: 0, dy: 0, r: cellR }];
      for (const b of this._bumps) cells.push({ dx: b.dx, dy: b.dy, r: cellR });
      this._offCanvas = buildMetaballCanvas(cells, color, this.radius, cellR, 14, 0.55);
    }
  }

  get collisionRadius() {
    // 0 bumps = full circle, scale down with bump count
    return this.radius * (0.9 - (0.25 * Math.min(this.bumpCount, 7)) / 7);
  }

  draw() {
    if (this._gradientCenter) {
      // Radial gradient fill: bright center → dark edge (used by satellite split children)
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, TAU);
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      grad.addColorStop(0, this._gradientCenter);
      grad.addColorStop(0.45, this._gradientCenter);
      grad.addColorStop(1, this._gradientBody);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = this._gradientCenter;
      ctx.lineWidth = 1;
      ctx.shadowColor = this._gradientCenter;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
      return;
    }
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
