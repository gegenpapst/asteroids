import { rand, TAU, W, H } from "../utils.js";
import {
  SOLAR_CENTER_SCORE,
  SOLAR_CENTER_SPEED,
  SOLAR_TETHER_MAX,
  ASTEROID_RADIUS,
  FLASH_KILL,
  SHAKE_BOOM,
} from "../Globals.js";
import { Particle } from "./Particle.js";
import { Matter } from "../physics.js";

// Central anchor of a solar system.
// Moves across the screen at SOLAR_CENTER_SPEED, bouncing off edges.
// Holds a static Matter.Body so satellite constraints can use bodyB — the reliable
// way to track a moving anchor in Matter.js (mutating constraint.pointB is not stable).
// When all satellites are destroyed, the center explodes and scores SOLAR_CENTER_SCORE.
export class SolarSystem {
  constructor(x, y, totalCount) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this._total = totalCount;
    this._t = 0;

    this.satellites = [];

    const angle = Math.random() * TAU;
    this.vx = Math.cos(angle) * SOLAR_CENTER_SPEED;
    this.vy = Math.sin(angle) * SOLAR_CENTER_SPEED;

    this.body = Matter.Body.create({
      isStatic: true,
      collisionFilter: { mask: 0, category: 0 },
      label: "solar-center",
    });
    Matter.Body.setPosition(this.body, { x, y });
  }

  onSatelliteDestroyed(sat, game) {
    const idx = this.satellites.indexOf(sat);
    if (idx !== -1) this.satellites.splice(idx, 1);
    if (this.satellites.length === 0) this._explode(game);
  }

  _explode(game) {
    this.alive = false;
    Matter.World.remove(game.engine.world, this.body);
    for (let i = 0; i < 28; i++) game.particles.push(new Particle(this.x, this.y, "#f84"));
    for (let i = 0; i < 14; i++) game.particles.push(new Particle(this.x, this.y, "#fff"));
    game.snd.explodeLarge();
    game._addScore(SOLAR_CENTER_SCORE);
    game._addFlash(FLASH_KILL);
    game._addShake(SHAKE_BOOM[0]);
  }

  update(dt) {
    this._t += dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const margin = SOLAR_TETHER_MAX + ASTEROID_RADIUS[0];
    if (this.x < margin || this.x > W - margin) {
      this.vx *= -1;
      this.x = Math.max(margin, Math.min(W - margin, this.x));
    }
    if (this.y < margin || this.y > H - margin) {
      this.vy *= -1;
      this.y = Math.max(margin, Math.min(H - margin, this.y));
    }

    Matter.Body.setPosition(this.body, { x: this.x, y: this.y });

    for (const sat of this.satellites) {
      sat.anchorX = this.x;
      sat.anchorY = this.y;
    }

    return this.alive;
  }

  draw(ctx) {
    if (!this.alive) return;

    const frac = Math.min(1, this.satellites.length / this._total);
    const pulse = 1 + 0.25 * Math.sin(this._t * (8 + (1 - frac) * 12));
    const r = 5 * pulse;
    const g = Math.round(160 * frac);
    const color = `rgb(255, ${g}, 60)`;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, TAU);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + (1 - frac) * 18;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.45, 0, TAU);
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }
}
