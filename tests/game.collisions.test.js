"use strict";

// ── Stubs required before Game.js is loaded ──────────────────────────────────

global.localStorage = { getItem: () => null, setItem: () => {} };

global.Sound = class {
  constructor() {}
  throb() {}
  shoot() {}
  shipDie() {}
  powerUp() {}
  explodeLarge() {}
  explodeMed() {}
  explodeSmall() {}
  ufoHum() {}
  levelUp() {}
  extraLife() {}
};

global.MetaballMode = class {
  createShip() {
    return null;
  }
};

// ── Entity globals required by _boom / _spawnDebris ──────────────────────────

const { Particle } = require("../src/entities/Particle.js");
global.Particle = Particle;

const { Debris } = require("../src/entities/Debris.js");
global.Debris = Debris;

const { Bullet } = require("../src/entities/Bullet.js");
global.Bullet = Bullet;

// ── Game ─────────────────────────────────────────────────────────────────────

const { Game } = require("../src/Game.js");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ship stub — behaves like ShipBase (getters for radius/hitRadius). */
function makeShip(overrides = {}) {
  const s = {
    x: 400,
    y: 300,
    vx: 100,
    vy: 0,
    invulnerable: 0,
    shieldTimer: 0,
    body: {},
  };
  Object.defineProperty(s, "radius", {
    get() {
      return SHIP_SIZE * SHIP_HULL_FACTOR;
    },
  });
  Object.defineProperty(s, "hitRadius", {
    get() {
      return this.shieldTimer > 0 ? SHIP_SIZE * SHIP_SHIELD_FACTOR : SHIP_SIZE * SHIP_HULL_FACTOR;
    },
  });
  return Object.assign(s, overrides);
}

/** Minimal asteroid stub. split() returns [] by default (size-2 leaf). */
function makeAsteroid(x, y, size = 2) {
  return {
    x,
    y,
    size,
    collisionRadius: ASTEROID_RADIUS[size],
    rotSpeed: 0,
    score: ASTEROID_SCORE[size],
    body: {},
    split() {
      return [];
    },
    onDestroy() {},
  };
}

/** Minimal rock stub. */
function makeRock(x, y, r = 25) {
  return { x, y, collisionRadius: r, body: {} };
}

/** Minimal pumice stub — handleShipHit always returns true (simulates overlap). */
function makePumice(x, y) {
  return { x, y, alive: true, handleShipHit: () => true };
}

/** Returns a fresh game with a pre-configured playing state (no start() needed). */
function makeGame() {
  const g = new Game();
  // Minimal playing state without calling start() (avoids VisualMode/Matter World setup)
  g.state = 1; // STATE.PLAYING
  g.particles = [];
  g.debris = [];
  return g;
}

// ── _bounceShip ──────────────────────────────────────────────────────────────

describe("Game._bounceShip", () => {
  test("reflects velocity when ship moves toward the entity", () => {
    const g = makeGame();
    // Ship at (400,300) moving right (+x), entity at (450,300) — ship approaching
    g.ship = makeShip({ x: 400, y: 300, vx: 150, vy: 0 });
    g._bounceShip(450, 300);
    // Normal points left (ship is left of entity), dot < 0 → reflected
    expect(g.ship.vx).toBeLessThan(0); // now moving left (away)
  });

  test("does not change velocity when ship is already moving away", () => {
    const g = makeGame();
    // Ship at (400,300) moving left (away from entity at 450,300)
    g.ship = makeShip({ x: 400, y: 300, vx: -150, vy: 0 });
    g._bounceShip(450, 300);
    expect(g.ship.vx).toBe(-150); // unchanged
    expect(g.ship.vy).toBe(0);
  });

  test("enforces minimum speed of 220 when ship is stationary", () => {
    const g = makeGame();
    g.ship = makeShip({ x: 400, y: 300, vx: 0, vy: 0 });
    g._bounceShip(450, 300); // entity to the right → normal points left
    expect(Math.hypot(g.ship.vx, g.ship.vy)).toBeGreaterThanOrEqual(220);
    expect(g.ship.vx).toBeLessThan(0); // pushed left (away from entity)
  });

  test("enforces minimum speed when approach velocity is below 220", () => {
    const g = makeGame();
    g.ship = makeShip({ x: 400, y: 300, vx: 50, vy: 0 }); // approaching at 50 px/s
    g._bounceShip(450, 300);
    expect(Math.hypot(g.ship.vx, g.ship.vy)).toBeGreaterThanOrEqual(220);
  });
});

// ── Shield × Asteroid ────────────────────────────────────────────────────────

describe("Shield × Asteroid collision", () => {
  test("asteroid is removed from game.asteroids on shield hit", () => {
    const g = makeGame();
    // Ship at (400,300) heading right, asteroid close enough to trigger hitRadius check
    const asteroid = makeAsteroid(410, 300, 2); // size-2, small collisionRadius
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 5 });
    g.asteroids = [asteroid];
    g.collisions.updateShip();
    expect(g.asteroids).toHaveLength(0);
  });

  test("ship velocity changes (bounces) on shield × asteroid hit", () => {
    const g = makeGame();
    const asteroid = makeAsteroid(410, 300, 2);
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 5 });
    const vxBefore = g.ship.vx;
    g.asteroids = [asteroid];
    g.collisions.updateShip();
    // Ship should no longer have its original rightward velocity
    expect(g.ship.vx).not.toBe(vxBefore);
    expect(g.ship.vx).toBeLessThan(0); // bounced left (away from asteroid)
  });

  test("ship is killed (not bounced) when no shield on asteroid hit", () => {
    const g = makeGame();
    const asteroid = makeAsteroid(410, 300, 2);
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 0 });
    g.asteroids = [asteroid];
    g.collisions.updateShip();
    expect(g.ship).toBeNull(); // _killShip sets this.ship = null
  });

  test("splitting asteroid (size 0) adds 2 children on shield hit", () => {
    const g = makeGame();
    // Use a size-0 asteroid — split() returns 2 size-1 children
    const child1 = makeAsteroid(410, 300, 1);
    const child2 = makeAsteroid(390, 300, 1);
    const bigAsteroid = {
      x: 410,
      y: 300,
      size: 0,
      collisionRadius: ASTEROID_RADIUS[0],
      rotSpeed: 0,
      score: ASTEROID_SCORE[0],
      body: {},
      split() {
        return [child1, child2];
      },
      onDestroy() {},
    };
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 5 });
    g.asteroids = [bigAsteroid];
    g.collisions.updateShip();
    expect(g.asteroids).toHaveLength(2);
  });
});

// ── Shield × Rock ─────────────────────────────────────────────────────────────

describe("Shield × Rock collision", () => {
  test("ship velocity changes (bounces) on shield × rock hit", () => {
    const g = makeGame();
    // Ship heading right, rock directly ahead within shield hit radius
    const shieldR = SHIP_SIZE * SHIP_SHIELD_FACTOR;
    const rock = makeRock(400 + shieldR - 5, 300, 5); // just inside hit zone
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 5 });
    const vxBefore = g.ship.vx;
    g.rocks = [rock];
    g.collisions.updateShip();
    expect(g.ship.vx).not.toBe(vxBefore);
    expect(g.ship.vx).toBeLessThan(0); // bounced away
  });

  test("ship is alive (not killed) after shield × rock hit", () => {
    const g = makeGame();
    const shieldR = SHIP_SIZE * SHIP_SHIELD_FACTOR;
    const rock = makeRock(400 + shieldR - 5, 300, 5);
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 5 });
    g.rocks = [rock];
    g.collisions.updateShip();
    expect(g.ship).not.toBeNull();
  });

  test("ship is killed when no shield on rock hit", () => {
    const g = makeGame();
    const rock = makeRock(410, 300, 20); // well within hull hit radius
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 0 });
    g.rocks = [rock];
    g.collisions.updateShip();
    expect(g.ship).toBeNull();
  });

  test("ship with moving-away velocity is not re-bounced off rock", () => {
    const g = makeGame();
    const shieldR = SHIP_SIZE * SHIP_SHIELD_FACTOR;
    // Rock to the right, ship already moving left (away)
    const rock = makeRock(400 + shieldR - 5, 300, 5);
    g.ship = makeShip({ x: 400, y: 300, vx: -100, vy: 0, shieldTimer: 5 });
    g.rocks = [rock];
    g.collisions.updateShip();
    expect(g.ship.vx).toBe(-100); // unchanged — already moving away
  });
});

// ── Shield × Pumice ───────────────────────────────────────────────────────────

describe("Shield × Pumice collision", () => {
  test("ship velocity changes (bounces) on shield × pumice hit", () => {
    const g = makeGame();
    // handleShipHit always returns true, pumice to the right of ship
    const pumice = makePumice(450, 300);
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 5 });
    const vxBefore = g.ship.vx;
    g.pumices = [pumice];
    g.collisions.updateShip();
    expect(g.ship.vx).not.toBe(vxBefore);
    expect(g.ship.vx).toBeLessThan(0);
  });

  test("ship is alive (not killed) after shield × pumice hit", () => {
    const g = makeGame();
    const pumice = makePumice(450, 300);
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 5 });
    g.pumices = [pumice];
    g.collisions.updateShip();
    expect(g.ship).not.toBeNull();
  });

  test("ship is killed when no shield on pumice hit", () => {
    const g = makeGame();
    const pumice = makePumice(450, 300);
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 0 });
    g.pumices = [pumice];
    g.collisions.updateShip();
    expect(g.ship).toBeNull();
  });
});
