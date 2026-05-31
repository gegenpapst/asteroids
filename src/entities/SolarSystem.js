"use strict";

// Central anchor of a solar system.
// Tracks the number of living satellite asteroids; when all are destroyed it explodes,
// scores SOLAR_CENTER_SCORE points and removes itself from the game.
class SolarSystem {
  constructor(x, y, totalCount) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this._total = totalCount;
    this._remaining = totalCount;
    this._t = 0;
  }

  /** Called by Game.js when a satellite belonging to this system is destroyed. */
  onSatelliteDestroyed(game) {
    this._remaining = Math.max(0, this._remaining - 1);
    if (this._remaining === 0) this._explode(game);
  }

  _explode(game) {
    this.alive = false;
    for (let i = 0; i < 28; i++) game.particles.push(new Particle(this.x, this.y, "#f84"));
    for (let i = 0; i < 14; i++) game.particles.push(new Particle(this.x, this.y, "#fff"));
    game.snd.explodeLarge();
    game._addScore(SOLAR_CENTER_SCORE);
  }

  update(dt) {
    this._t += dt;
    return this.alive;
  }

  draw() {
    if (!this.alive) return;

    const frac = this._remaining / this._total;
    // Pulsing frequency and size increase as satellites are destroyed
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

    // Inner bright core
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.45, 0, TAU);
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { SolarSystem };
