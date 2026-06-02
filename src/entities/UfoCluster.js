"use strict";

// Cluster variant of the UFO — inherits movement/firing from UfoBase, implements only draw().
class UfoCluster extends UfoBase {
  draw() {
    const r = this.radius;
    // size 0 = large green UFO, size 1 = small red UFO
    const col =
      this.size === 0
        ? { h: "#5fa", s: "#4f8", d: "#0d2018", dd: "#06100d" }
        : { h: "#f88", s: "#f55", d: "#200808", dd: "#100404" };

    ctx.save();
    ctx.translate(this.x, this.y);

    // Disc hull — linear gradient top-to-bottom
    const dg = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5);
    dg.addColorStop(0, col.d);
    dg.addColorStop(0.45, col.dd);
    dg.addColorStop(1, col.dd);
    ctx.beginPath();
    ctx.ellipse(0, r * 0.14, r, r * 0.34, 0, 0, TAU);
    ctx.fillStyle = dg;
    ctx.shadowColor = col.s;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.strokeStyle = col.h;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Concentric disc rings
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = col.s;
    ctx.lineWidth = 0.7;
    ctx.shadowBlur = 0;
    for (const rx of [r * 0.65, r * 0.32]) {
      ctx.beginPath();
      ctx.ellipse(0, r * 0.14, rx, rx * 0.34, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Dome — radial gradient
    const dcg = ctx.createRadialGradient(-r * 0.1, -r * 0.12, 0, 0, 0, r * 0.52);
    dcg.addColorStop(0, this.size === 0 ? "rgba(100,255,160,0.6)" : "rgba(255,120,120,0.6)");
    dcg.addColorStop(0.5, this.size === 0 ? "rgba(20,100,50,0.3)" : "rgba(120,20,20,0.3)");
    dcg.addColorStop(1, "rgba(5,5,5,0.05)");
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.5, r * 0.38, 0, Math.PI, TAU);
    ctx.fillStyle = dcg;
    ctx.shadowColor = col.s;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.strokeStyle = col.h;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Animated light strip
    const t = Date.now() / 260;
    const nLights = this.size === 0 ? 5 : 3;
    for (let i = 0; i < nLights; i++) {
      const lit = Math.floor(t + i) % 3 === 0;
      ctx.beginPath();
      ctx.arc(
        (i - (nLights - 1) / 2) * r * (this.size === 0 ? 0.42 : 0.5),
        r * 0.15,
        r * 0.09,
        0,
        TAU,
      );
      ctx.fillStyle = lit ? col.h : col.dd;
      ctx.shadowColor = col.s;
      ctx.shadowBlur = lit ? 10 : 0;
      ctx.fill();
    }

    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { UfoCluster };
