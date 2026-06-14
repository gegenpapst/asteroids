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
      this._polyVerts = null;
      this._color = null;
      this._renderStyle = 1;
    } else {
      this._gradientCenter = null;
      this._gradientBody = null;
      this._color = color;
      this._offCanvas = null;
      this._renderStyle = Math.random() < 0.5 ? 1 : 2;
      this._polyVerts = this._computePolyVerts();
    }
  }

  // Polygon vertices sorted by angle. Supplements with synthetic points when
  // bump count < 3 so the polygon always has at least 5 vertices.
  _buildPolyVerts() {
    if (this._bumps.length >= 3) {
      return this._bumps
        .slice()
        .sort((a, b) => Math.atan2(a.dy, a.dx) - Math.atan2(b.dy, b.dx))
        .map((b) => ({ x: b.dx, y: b.dy }));
    }
    const items = this._bumps.map((b) => ({
      x: b.dx,
      y: b.dy,
      a: Math.atan2(b.dy, b.dx),
    }));
    const need = 5 - items.length;
    for (let i = 0; i < need; i++) {
      const a = (i / need) * TAU + rand(-0.25, 0.25);
      const d = this._coreR * rand(0.78, 0.98);
      items.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, a });
    }
    return items.sort((a, b) => a.a - b.a).map((v) => ({ x: v.x, y: v.y }));
  }

  // Returns polygon vertices centered around their centroid.
  // Called from constructor after super() has populated _bumps and _coreR.
  _computePolyVerts() {
    const raw = this._buildPolyVerts();
    const cx = raw.reduce((s, v) => s + v.x, 0) / raw.length;
    const cy = raw.reduce((s, v) => s + v.y, 0) / raw.length;
    return raw.map((v) => ({ x: v.x - cx, y: v.y - cy }));
  }

  // Polygon physics body — vertices match the visual polygon exactly.
  // Overrides the compound-circle approach in AsteroidBase.
  _makeBody(wrap = true) {
    const r = this.radius;
    this._coreR = r * (0.85 - (0.5 * Math.min(this.bumpCount, 7)) / 7);
    this._bumps = this._genBumps();
    return Matter.Bodies.fromVertices(this.x, this.y, this._buildPolyVerts(), {
      friction: 0,
      frictionAir: 0,
      restitution: 1,
      label: this.constructor._label,
      ...(wrap ? { plugin: { wrap: { min: { x: 0, y: 0 }, max: { x: W, y: H } } } } : {}),
    });
  }

  get collisionRadius() {
    // 0 bumps = full circle, scale down with bump count
    return this.radius * (0.9 - (0.25 * Math.min(this.bumpCount, 7)) / 7);
  }

  draw(ctx) {
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

    if (this._renderStyle === 1) {
      this._drawPoly(ctx);
    } else {
      if (!this._offCanvas) this._buildMetaball();
      this._drawMetaball(ctx);
    }
  }

  _drawPoly(ctx) {
    const verts = this._polyVerts;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.shadowColor = "rgb(120, 185, 255)";
    ctx.shadowBlur = 20;

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    grad.addColorStop(0, "rgb(185, 220, 255)");
    grad.addColorStop(0.45, "rgb(100, 155, 210)");
    grad.addColorStop(1, "rgb(28, 60, 120)");

    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(175, 225, 255, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  _buildMetaball() {
    const cellR = this.radius * 0.13;
    const cells = generatePolyCells(this._polyVerts, cellR);
    this._offCanvas = buildMetaballCanvas(cells, this._color, this.radius, cellR, 14, 0.72);
  }

  _drawMetaball(ctx) {
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
