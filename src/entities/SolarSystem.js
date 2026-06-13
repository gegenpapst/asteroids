"use strict";

// Central anchor of a solar system.
// Moves across the screen at SOLAR_CENTER_SPEED, bouncing off edges.
// Satellites orbit the moving center; their constraint anchors are updated each frame.
// When all satellites are destroyed, the center explodes and scores SOLAR_CENTER_SCORE.
class SolarSystem {
  constructor(x, y, totalCount) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this._total = totalCount;
    this._t = 0;

    // Live list of bound satellite asteroids — populated by Game.js after spawn.
    this.satellites = [];

    const angle = Math.random() * TAU;
    this.vx = Math.cos(angle) * SOLAR_CENTER_SPEED;
    this.vy = Math.sin(angle) * SOLAR_CENTER_SPEED;
  }

  // Called by Game.js when a satellite belonging to this system is destroyed.
  // Removes the satellite from the live list; explodes when the last one is gone.
  onSatelliteDestroyed(sat, game) {
    const idx = this.satellites.indexOf(sat);
    if (idx !== -1) this.satellites.splice(idx, 1);
    if (this.satellites.length === 0) this._explode(game);
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

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounce so that no satellite can leave the screen.
    const margin = SOLAR_TETHER_MAX + ASTEROID_RADIUS[0];
    if (this.x < margin || this.x > W - margin) {
      this.vx *= -1;
      this.x = Math.max(margin, Math.min(W - margin, this.x));
    }
    if (this.y < margin || this.y > H - margin) {
      this.vy *= -1;
      this.y = Math.max(margin, Math.min(H - margin, this.y));
    }

    // Drag every satellite's constraint anchor to the new center position.
    for (const sat of this.satellites) {
      sat.constraint.pointB.x = this.x;
      sat.constraint.pointB.y = this.y;
      sat.anchorX = this.x;
      sat.anchorY = this.y;
    }

    return this.alive;
  }

  draw() {
    if (!this.alive) return;

    const frac = Math.min(1, this.satellites.length / this._total);
    // Pulse rate and size increase as satellites are destroyed.
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
