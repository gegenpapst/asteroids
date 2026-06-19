import { dist, randInt } from "./utils.js";
import { POWERUP_TYPES, TURRET_SCORE } from "./Globals.js";
import { PowerUp } from "./entities/PowerUp.js";

// Handles all per-frame collision detection for the game.
// Reads Game entity arrays directly and calls back into the following Game/entity interface:
//   g._destroyAsteroid(a, angle, vx, vy, cross) → children[]
//   g._killShip()
//   g._addScore(pts)
//   g._boom(x, y, size)
//   g.ship.bounceOff(ox, oy)  ← defined on ShipBase

function _overlaps(a, b, rA, rB) {
  return dist(a, b) < rA + rB;
}

export class CollisionSystem {
  constructor(game) {
    this._g = game;
  }

  updateBullet() {
    this._bulletVsAsteroids();
    this._bulletVsUfos();
    this._bulletVsRocks();
    this._bulletVsPumices();
    this._bulletVsTurrets();
  }

  updateShip() {
    this._shipVsAsteroids();
    this._shipVsRocks();
    this._shipVsPumices();
    this._shipVsUfos();
    this._ufoBulletsVsShip();
    this._shipVsTurrets();
    this._shipVsPowerups();
  }

  _scanBullets(testFn) {
    const bullets = this._g.bullets;
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      if (testFn(bullets[bi], bi)) bullets.splice(bi, 1);
    }
  }

  // Iterates bullets in reverse; removes each bullet for which testFn returns true.
  _scanBullets(testFn) {
    const bullets = this._g.bullets;
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      if (testFn(bullets[bi], bi)) bullets.splice(bi, 1);
    }
  }

  _bulletVsAsteroids() {
    const g = this._g;
    this._scanBullets((b) => {
      for (let ai = g.asteroids.length - 1; ai >= 0; ai--) {
        const a = g.asteroids[ai];
        if (_overlaps(b, a, b.radius, a.collisionRadius)) {
          const hitDx = b.x - a.x,
            hitDy = b.y - a.y;
          const bLen = Math.hypot(b.vx, b.vy) || 1;
          // signed 2D cross product: lever-arm from hit point to bullet axis → angular impulse
          const cross = hitDx * (b.vy / bLen) - hitDy * (b.vx / bLen);
          g._addScore(a.score);
          if (Math.random() < g._powerupChance)
            g.powerups.push(
              new PowerUp(a.x, a.y, POWERUP_TYPES[randInt(0, POWERUP_TYPES.length - 1)]),
            );
          const children = g._destroyAsteroid(a, Math.atan2(b.vy, b.vx), b.vx, b.vy, cross);
          g.asteroids.splice(ai, 1, ...children);
          return true;
        }
      }
      return false;
    });
  }

  _bulletVsUfos() {
    const g = this._g;
    this._scanBullets((b) => {
      for (let ui = g.ufos.length - 1; ui >= 0; ui--) {
        const u = g.ufos[ui];
        if (_overlaps(b, u, b.radius, u.radius)) {
          g._addScore(u.score);
          g._boom(u.x, u.y, 1);
          g.ufos.splice(ui, 1);
          return true;
        }
      }
      return false;
    });
  }

  _bulletVsRocks() {
    const g = this._g;
    this._scanBullets((b) => g.rocks.some((r) => _overlaps(b, r, b.radius, r.collisionRadius)));
  }

  _bulletVsPumices() {
    const g = this._g;
    this._scanBullets((b) => {
      for (const p of g.pumices) {
        if (!p.alive) continue;
        if (p.handleBulletHit(b, g.engine.world, g)) return true;
      }
      return false;
    });
    g.pumices = g.pumices.filter((p) => p.alive);
  }

  _bulletVsTurrets() {
    const g = this._g;
    this._scanBullets((b) => {
      for (let ti = g.turrets.length - 1; ti >= 0; ti--) {
        const t = g.turrets[ti];
        if (_overlaps(b, t, b.radius, t.radius)) {
          if (t.hit()) {
            g._boom(t.x, t.y, 1);
            g._addScore(TURRET_SCORE);
            g.turrets.splice(ti, 1);
          }
          return true;
        }
      }
      return false;
    });
  }

  _shipVsAsteroids() {
    const g = this._g;
    if (!g.ship || g.ship.invulnerable > 0) return;
    for (let ai = g.asteroids.length - 1; ai >= 0; ai--) {
      const a = g.asteroids[ai];
      if (_overlaps(g.ship, a, g.ship.hitRadius, a.collisionRadius)) {
        if (g.ship.shieldTimer > 0) {
          const sLen = Math.hypot(g.ship.vx, g.ship.vy) || 1;
          const hitDx = a.x - g.ship.x,
            hitDy = a.y - g.ship.y;
          // signed 2D cross product: lever-arm from contact point to ship velocity axis → angular impulse
          const cross = hitDx * (g.ship.vy / sLen) - hitDy * (g.ship.vx / sLen);
          const children = g._destroyAsteroid(a, null, g.ship.vx, g.ship.vy, cross);
          g.asteroids.splice(ai, 1, ...children);
          g.ship.bounceOff(a.x, a.y);
        } else {
          g._killShip();
        }
        break;
      }
    }
  }

  _shipVsRocks() {
    const g = this._g;
    if (!g.ship || g.ship.invulnerable > 0) return;
    for (const r of g.rocks) {
      if (_overlaps(g.ship, r, g.ship.hitRadius, r.collisionRadius)) {
        if (g.ship.shieldTimer <= 0) g._killShip();
        else g.ship.bounceOff(r.x, r.y);
        break;
      }
    }
  }

  _shipVsPumices() {
    const g = this._g;
    if (!g.ship || g.ship.invulnerable > 0) return;
    for (const p of g.pumices) {
      if (!p.alive) continue;
      if (p.handleShipHit(g.ship)) {
        if (g.ship.shieldTimer <= 0) g._killShip();
        else g.ship.bounceOff(p.x, p.y);
        break;
      }
    }
  }

  _shipVsUfos() {
    const g = this._g;
    if (!g.ship || g.ship.invulnerable > 0) return;
    for (const u of g.ufos) {
      if (_overlaps(g.ship, u, g.ship.hitRadius, u.radius)) {
        if (g.ship.shieldTimer > 0) g.ship.bounceOff(u.x, u.y);
        else g._killShip();
        break;
      }
    }
  }

  _ufoBulletsVsShip() {
    const g = this._g;
    if (!g.ship || g.ship.invulnerable > 0) return;
    for (let bi = g.ufoBullets.length - 1; bi >= 0; bi--) {
      const b = g.ufoBullets[bi];
      if (_overlaps(b, g.ship, b.radius, g.ship.hitRadius)) {
        if (g.ship.shieldTimer > 0) g.ufoBullets.splice(bi, 1);
        else g._killShip();
        break;
      }
    }
  }

  _shipVsTurrets() {
    const g = this._g;
    if (!g.ship || g.ship.invulnerable > 0) return;
    for (const t of g.turrets) {
      if (_overlaps(g.ship, t, g.ship.hitRadius, t.radius)) {
        if (g.ship.shieldTimer > 0) g.ship.bounceOff(t.x, t.y);
        else g._killShip();
        break;
      }
    }
  }

  _shipVsPowerups() {
    const g = this._g;
    if (!g.ship) return;
    for (let pi = g.powerups.length - 1; pi >= 0; pi--) {
      const pu = g.powerups[pi];
      if (_overlaps(g.ship, pu, g.ship.radius, pu.radius)) {
        if (pu.type === "shield") g.ship.shieldTimer = g._powerupDuration;
        else if (pu.type === "rapid") g.ship.rapidTimer = g._powerupDuration;
        else if (pu.type === "spread") g.ship.spreadTimer = g._powerupDuration;
        else g.ship.heavyTimer = g._powerupDuration;
        g.snd.powerUp(pu.type);
        g.powerups.splice(pi, 1);
      }
    }
  }
}
