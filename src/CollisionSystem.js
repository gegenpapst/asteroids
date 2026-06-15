"use strict";

// Handles all per-frame collision detection for the game.
// Reads entity arrays and calls Game helper methods (_destroyAsteroid, _bounceShip, etc.)
// rather than manipulating entity internals directly.
class CollisionSystem {
  constructor(game) {
    this._g = game;
  }

  // All bullet × entity collisions.
  // Asteroid/Rock/Pumice use unified arrays — mode implicitly determines entity types.
  updateBullet() {
    const g = this._g;

    // Bullet × Asteroid (uniform via collisionRadius)
    outer: for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi];
      for (let ai = g.asteroids.length - 1; ai >= 0; ai--) {
        const a = g.asteroids[ai];
        if (dist(b, a) < a.collisionRadius + b.radius) {
          const hitDx = b.x - a.x,
            hitDy = b.y - a.y;
          const bLen = Math.hypot(b.vx, b.vy) || 1;
          const cross = hitDx * (b.vy / bLen) - hitDy * (b.vx / bLen);
          g._addScore(a.score);
          if (Math.random() < g._powerupChance)
            g.powerups.push(new PowerUp(a.x, a.y, POWERUP_TYPES[randInt(0, 3)]));
          const children = g._destroyAsteroid(a, Math.atan2(b.vy, b.vx), b.vx, b.vy, cross);
          g.asteroids.splice(ai, 1, ...children);
          g.bullets.splice(bi, 1);
          continue outer;
        }
      }
    }

    // Bullet × UFO
    outerUfo: for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi];
      for (let ui = g.ufos.length - 1; ui >= 0; ui--) {
        const u = g.ufos[ui];
        if (dist(b, u) < u.radius + b.radius) {
          g._addScore(u.score);
          g._boom(u.x, u.y, 1);
          g.ufos.splice(ui, 1);
          g.bullets.splice(bi, 1);
          continue outerUfo;
        }
      }
    }

    // Bullet × Rock (uniform via collisionRadius)
    for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi];
      if (g.rocks.some((r) => dist(b, r) < r.collisionRadius + b.radius)) {
        g.bullets.splice(bi, 1);
      }
    }

    // Bullet × Pumice (uniform via handleBulletHit)
    outerPumice: for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi];
      for (const p of g.pumices) {
        if (!p.alive) continue;
        if (p.handleBulletHit(b, g.engine.world, g)) {
          g.bullets.splice(bi, 1);
          continue outerPumice;
        }
      }
    }
    g.pumices = g.pumices.filter((p) => p.alive);
  }

  // All ship × entity collisions + power-up pickup.
  // With shield: bounce + optionally split asteroid. Without shield: _killShip().
  updateShip() {
    const g = this._g;

    // Ship × Asteroid (uniform via collisionRadius + split)
    if (g.ship && g.ship.invulnerable <= 0) {
      for (let ai = g.asteroids.length - 1; ai >= 0; ai--) {
        const a = g.asteroids[ai];
        if (dist(g.ship, a) < a.collisionRadius + g.ship.hitRadius) {
          if (g.ship.shieldTimer > 0) {
            const sLen = Math.hypot(g.ship.vx, g.ship.vy) || 1;
            const hitDx = a.x - g.ship.x,
              hitDy = a.y - g.ship.y;
            const cross = hitDx * (g.ship.vy / sLen) - hitDy * (g.ship.vx / sLen);
            const children = g._destroyAsteroid(a, null, g.ship.vx, g.ship.vy, cross);
            g.asteroids.splice(ai, 1, ...children);
            g._bounceShip(a.x, a.y);
          } else {
            g._killShip();
          }
          break;
        }
      }
    }

    // Ship × Rock (uniform via collisionRadius)
    if (g.ship && g.ship.invulnerable <= 0) {
      for (const r of g.rocks) {
        if (dist(g.ship, r) < r.collisionRadius + g.ship.hitRadius) {
          if (g.ship.shieldTimer <= 0) {
            g._killShip();
          } else {
            g._bounceShip(r.x, r.y);
          }
          break;
        }
      }
    }

    // Ship × Pumice (uniform via handleShipHit)
    if (g.ship && g.ship.invulnerable <= 0) {
      for (const p of g.pumices) {
        if (!p.alive) continue;
        if (p.handleShipHit(g.ship)) {
          if (g.ship.shieldTimer <= 0) {
            g._killShip();
          } else {
            g._bounceShip(p.x, p.y);
          }
          break;
        }
      }
    }

    // Ship × UFO
    if (g.ship && g.ship.invulnerable <= 0) {
      for (const u of g.ufos) {
        if (dist(g.ship, u) < u.radius + g.ship.hitRadius) {
          if (g.ship.shieldTimer > 0) {
            g._bounceShip(u.x, u.y);
          } else {
            g._killShip();
          }
          break;
        }
      }
    }

    // UFO bullet × ship
    if (g.ship && g.ship.invulnerable <= 0) {
      for (let bi = g.ufoBullets.length - 1; bi >= 0; bi--) {
        const b = g.ufoBullets[bi];
        if (dist(b, g.ship) < b.radius + g.ship.hitRadius) {
          if (g.ship.shieldTimer > 0) {
            g.ufoBullets.splice(bi, 1);
          } else {
            g._killShip();
          }
          break;
        }
      }
    }

    // Ship × PowerUp
    if (g.ship) {
      for (let pi = g.powerups.length - 1; pi >= 0; pi--) {
        const pu = g.powerups[pi];
        if (dist(g.ship, pu) < g.ship.radius + pu.radius) {
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
}

if (typeof module !== "undefined") module.exports = { CollisionSystem };
