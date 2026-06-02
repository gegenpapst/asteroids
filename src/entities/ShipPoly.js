"use strict";

// Polygon variant of the ship — inherits movement/firing from ShipBase, implements only draw().
class ShipPoly extends ShipBase {
  draw() {
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Shield bubble
    if (this.shieldTimer > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 140);
      ctx.beginPath();
      ctx.arc(0, 0, SHIP_SIZE * SHIP_SHIELD_FACTOR, 0, TAU);
      ctx.strokeStyle = `rgba(50,210,255,${pulse})`;
      ctx.shadowColor = "#0ff";
      ctx.shadowBlur = 20;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Hull — bloom pass then main pass on same path
    ctx.beginPath();
    ctx.moveTo(SHIP_SIZE, 0);
    ctx.lineTo(-SHIP_SIZE * 0.65, -SHIP_SIZE * 0.5);
    ctx.lineTo(-SHIP_SIZE * 0.35, 0);
    ctx.lineTo(-SHIP_SIZE * 0.65, SHIP_SIZE * 0.5);
    ctx.closePath();
    ctx.strokeStyle = "#b8f0ff";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#4af";

    ctx.globalAlpha = 0.3;
    ctx.shadowBlur = 35;
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 18;
    ctx.stroke();

    // Thruster flame
    if (this.thrusting) {
      const flicker = 0.5 + 0.5 * Math.sin(this.flameT);
      const flameLen = SHIP_SIZE * (0.45 + flicker * 0.55);
      const r = 255,
        g = (90 + flicker * 120) | 0;
      ctx.beginPath();
      ctx.moveTo(-SHIP_SIZE * 0.35, -SHIP_SIZE * 0.2);
      ctx.lineTo(-SHIP_SIZE * 0.35 - flameLen, 0);
      ctx.lineTo(-SHIP_SIZE * 0.35, SHIP_SIZE * 0.2);
      ctx.strokeStyle = `rgba(${r},${g},0,${0.75 + flicker * 0.25})`;
      ctx.shadowColor = "#f80";
      ctx.shadowBlur = 14;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { ShipPoly };
