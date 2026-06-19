import { TAU } from "../utils.js";
import {
  SATURN_RADIUS,
  SATURN_RING1_INNER,
  SATURN_RING1_OUTER,
  SATURN_RING2_INNER,
  SATURN_RING2_OUTER,
  SATURN_RING_TILT,
  SATURN_SWING_SPEED,
  SATURN_SWING_AMP,
  SATURN_ALPHA,
} from "../Globals.js";

export class BackgroundSaturn {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this._t = 0;
    this._angle = 0;
  }

  update(dt) {
    this._t += dt;
    this._angle = Math.sin(this._t * SATURN_SWING_SPEED) * SATURN_SWING_AMP;
    return true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = SATURN_ALPHA;

    this._drawRingHalf(ctx, Math.PI, TAU);

    const grad = ctx.createRadialGradient(
      -SATURN_RADIUS * 0.15,
      -SATURN_RADIUS * 0.25,
      SATURN_RADIUS * 0.05,
      0,
      0,
      SATURN_RADIUS,
    );
    grad.addColorStop(0, "#c8891a");
    grad.addColorStop(0.5, "#7a420a");
    grad.addColorStop(1, "#2d1503");
    ctx.beginPath();
    ctx.arc(0, 0, SATURN_RADIUS, 0, TAU);
    ctx.fillStyle = grad;
    ctx.fill();

    this._drawRingHalf(ctx, 0, Math.PI);

    ctx.restore();
  }

  _drawRingHalf(ctx, startA, endA) {
    ctx.save();
    ctx.rotate(this._angle);
    ctx.scale(1, SATURN_RING_TILT);
    ctx.shadowColor = "#ffcc44";
    ctx.shadowBlur = 22;
    ctx.strokeStyle = "#ffcc44";
    ctx.lineWidth = (SATURN_RING1_OUTER - SATURN_RING1_INNER) * 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, (SATURN_RING1_INNER + SATURN_RING1_OUTER) / 2, startA, endA);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.save();
    ctx.rotate(this._angle);
    ctx.scale(1, SATURN_RING_TILT);
    ctx.shadowColor = "#ff8800";
    ctx.shadowBlur = 28;
    ctx.strokeStyle = "#ff8800";
    ctx.lineWidth = (SATURN_RING2_OUTER - SATURN_RING2_INNER) * 0.7;
    ctx.beginPath();
    ctx.arc(0, 0, (SATURN_RING2_INNER + SATURN_RING2_OUTER) / 2, startA, endA);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
