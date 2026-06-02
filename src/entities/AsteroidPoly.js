"use strict";

const ASTEROID_COLORS = ["#8899aa", "#99aaaa", "#aabbbb"];

// Polygon variant of the asteroid — inherits lifecycle from AsteroidBase, adds verts + draw().
class AsteroidPoly extends AsteroidBase {
  static _label = "asteroid";
  static _rotBase = 1.6;

  // color: optional override; null = default grey tones.
  //   Pass a {center, body} object to enable radial gradient fill (e.g. satellite split children).
  constructor(x, y, size = 0, angle = null, maxBumps = 7, color = null) {
    super(x, y, size, angle, maxBumps);
    if (color && typeof color === "object") {
      this._color = color.center;
      this._bodyColor = color.body;
    } else {
      this._color = color;
      this._bodyColor = null;
    }
    // Use jagged polygon verts for the classic Asteroids look.
    this.verts = this._makeVerts();
  }

  // Override: classic jagged polygon — ignores the compound-body geometry used by MetaballMode.
  // Random angular jitter + wide radius variance give the traditional Asteroids silhouette.
  _makeVerts() {
    const n = randInt(8, 12);
    return Array.from({ length: n }, (_, i) => ({
      a: (i / n) * TAU + rand(-0.25, 0.25),
      r: this.radius * rand(0.55, 1.0),
    }));
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.beginPath();
    const { a: a0, r: r0 } = this.verts[0];
    ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
    for (let i = 1; i < this.verts.length; i++) {
      const { a, r } = this.verts[i];
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();

    const col = this._color ?? ASTEROID_COLORS[this.size];
    if (this._bodyColor) {
      // Radial gradient fill: bright center → dark edge (used by satellite split children)
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
      grad.addColorStop(0, col);
      grad.addColorStop(0.45, col);
      grad.addColorStop(1, this._bodyColor);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = col;
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { AsteroidPoly };
