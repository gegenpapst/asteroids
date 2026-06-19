import { TAU } from "../utils.js";
import { SHIP_SIZE, SHIP_SHIELD_FACTOR } from "../Globals.js";
import { ShipBase } from "./ShipBase.js";

// Metaball/cluster variant of the ship — inherits movement/firing from ShipBase, implements only draw().
export class ShipCluster extends ShipBase {
  draw(ctx) {
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 8) % 2 === 0) return;

    const s = SHIP_SIZE;

    if (this.shieldTimer > 0) {
      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 140);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.beginPath();
      ctx.arc(0, 0, s * SHIP_SHIELD_FACTOR, 0, TAU);
      ctx.strokeStyle = `rgba(50,210,255,${pulse})`;
      ctx.shadowColor = "#0ff";
      ctx.shadowBlur = 20;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.55);
    ctx.lineTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.7, s * 0.55);
    ctx.closePath();

    const hg = ctx.createLinearGradient(-s * 0.7, 0, s, 0);
    hg.addColorStop(0, "#050e1c");
    hg.addColorStop(0.55, "#0b1c38");
    hg.addColorStop(1, "#102244");
    ctx.fillStyle = hg;
    ctx.shadowColor = "#28c8ff";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.strokeStyle = "#5cf";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#8df";
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, 0);
    ctx.lineTo(-s * 0.58, -s * 0.44);
    ctx.moveTo(s * 0.1, 0);
    ctx.lineTo(-s * 0.58, s * 0.44);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const cg = ctx.createRadialGradient(s * 0.14, -s * 0.04, 0, s * 0.22, 0, s * 0.2);
    cg.addColorStop(0, "rgba(200,245,255,0.95)");
    cg.addColorStop(1, "rgba(30,100,180,0.2)");
    ctx.beginPath();
    ctx.arc(s * 0.22, 0, s * 0.2, 0, TAU);
    ctx.fillStyle = cg;
    ctx.shadowColor = "#9ef";
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-s * 0.35, 0, s * 0.18, Math.PI * 0.5, Math.PI * 1.5);
    ctx.strokeStyle = "#f90";
    ctx.shadowColor = "#f80";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    if (this.thrusting) {
      const flicker = 0.5 + 0.5 * Math.sin(this.flameT);
      const flameLen = s * (0.45 + flicker * 0.55);
      const r = 255,
        g = (90 + flicker * 120) | 0;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.2);
      ctx.lineTo(-s * 0.35 - flameLen, 0);
      ctx.lineTo(-s * 0.35, s * 0.2);
      ctx.strokeStyle = `rgba(${r},${g},0,${0.75 + flicker * 0.25})`;
      ctx.shadowColor = "#f80";
      ctx.shadowBlur = 14;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}
