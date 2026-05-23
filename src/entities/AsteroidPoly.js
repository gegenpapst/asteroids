"use strict";

const ASTEROID_COLORS = ["#8899aa", "#99aaaa", "#aabbbb"];

// Polygon-Variante des Asteroiden — erbt Lifecycle von AsteroidBase, ergänzt verts + draw().
class AsteroidPoly extends AsteroidBase {
  static _label = "asteroid";
  static _rotBase = 1.6;

  constructor(x, y, size = 0, angle = null) {
    super(x, y, size, angle);
    // Verts direkt aus der Compound-Body-Geometrie ableiten —
    // damit Optik und Physik dieselbe Form haben.
    this.verts = this._makeVerts(randInt(16, 22));
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

    const col = ASTEROID_COLORS[this.size];
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = col;
    ctx.shadowBlur = 7;
    ctx.stroke();
    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { AsteroidPoly };
