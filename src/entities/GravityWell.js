import { clamp, TAU } from "../utils.js";
import {
  WW,
  WH,
  GRAVITY_WELL_RADIUS,
  GRAVITY_WELL_REACH,
  GRAVITY_WELL_STRENGTH,
  GRAVITY_WELL_DRIFT_SPEED,
} from "../Globals.js";
import { Matter } from "../physics.js";

// A drifting black hole. It deals no contact damage — its only effect is a
// radial attraction applied to the ship, bullets and asteroids inside its reach,
// turning the field into a slingshot tool and a positioning hazard.
// Indestructible: update() always returns true; lifetime is managed by Game per level.
export class GravityWell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this._t = 0;

    const angle = Math.random() * TAU;
    this.vx = Math.cos(angle) * GRAVITY_WELL_DRIFT_SPEED;
    this.vy = Math.sin(angle) * GRAVITY_WELL_DRIFT_SPEED;
  }

  get radius() {
    return GRAVITY_WELL_RADIUS;
  }

  // Drift across the world, bouncing off the edges (margin keeps the core on-screen).
  update(dt) {
    this._t += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const margin = GRAVITY_WELL_RADIUS * 3;
    if (this.x < margin || this.x > WW - margin) {
      this.vx *= -1;
      this.x = clamp(this.x, margin, WW - margin);
    }
    if (this.y < margin || this.y > WH - margin) {
      this.vy *= -1;
      this.y = clamp(this.y, margin, WH - margin);
    }
    return true;
  }

  // Apply the gravitational pull to a single target. Acceleration falls off
  // linearly to zero at REACH; uniform (mass-independent) so everything "falls" alike.
  // Euler targets (ship, bullets) carry vx/vy in px/s; Matter bodies (asteroids)
  // carry velocity in px/frame, hence the /60 conversion.
  pull(target, dt, isBody) {
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const d = Math.hypot(dx, dy);
    if (d > GRAVITY_WELL_REACH || d < 1) return;

    const accel = GRAVITY_WELL_STRENGTH * clamp(1 - d / GRAVITY_WELL_REACH, 0, 1);
    const dv = accel * dt; // px/s added this frame
    const ux = dx / d;
    const uy = dy / d;

    if (isBody) {
      const v = target.body.velocity;
      Matter.Body.setVelocity(target.body, {
        x: v.x + (ux * dv) / 60,
        y: v.y + (uy * dv) / 60,
      });
    } else {
      target.vx += ux * dv;
      target.vy += uy * dv;
    }
  }

  // Plasma / Magenta double-ring with inward-spiralling accretion sparks.
  draw(ctx) {
    const r = GRAVITY_WELL_RADIUS;
    const t = this._t;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Soft radial glow behind the rings.
    const glow = ctx.createRadialGradient(0, 0, r * 1.5, 0, 0, r * 2.7);
    glow.addColorStop(0, "rgba(200,100,255,0.16)");
    glow.addColorStop(1, "rgba(200,100,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.7, 0, TAU);
    ctx.fill();

    // Conic-gradient ring helper (rot rotates the gradient seam).
    const ring = (rad, lw, stops, blur, glowColor, rot) => {
      ctx.save();
      ctx.rotate(rot);
      const g = ctx.createConicGradient ? ctx.createConicGradient(0, 0, 0) : null;
      if (g) {
        g.addColorStop(0, stops[0]);
        g.addColorStop(0.5, stops[1]);
        g.addColorStop(1, stops[2]);
        ctx.strokeStyle = g;
      } else {
        ctx.strokeStyle = glowColor;
      }
      ctx.lineWidth = lw;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = blur;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, TAU);
      ctx.stroke();
      ctx.restore();
    };

    // Outer violet ring (thin, slow, counter-rotating) + inner magenta ring (thick, fast).
    ring(r * 2.0, 3, ["#a3f", "#e9f", "#a3f"], 12, "#b5f", t * -0.5);
    ring(r * 1.45, 6, ["#f2c", "#fbf", "#f2c"], 18, "#f4d", t * 1.0);

    // Accretion sparks spiralling inward — phase-offset orbits at shrinking radius.
    const SPARKS = 7;
    for (let s = 0; s < SPARKS; s++) {
      const phase = (s / SPARKS) * TAU;
      const orbit = (t * 1.6 + phase) % TAU;
      const spiral = r * 1.1 + r * 0.9 * ((1 + Math.sin(t * 0.9 + phase)) / 2);
      ctx.beginPath();
      ctx.arc(Math.cos(orbit) * spiral, Math.sin(orbit) * spiral, 1.6, 0, TAU);
      ctx.fillStyle = "#fbf";
      ctx.shadowColor = "#f4d";
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Black core with a thin bright photon ring hugging the event horizon.
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r + 1, 0, TAU);
    ctx.strokeStyle = "#fdf";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#fdf";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}
