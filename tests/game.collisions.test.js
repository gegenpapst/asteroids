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

// ── Helpers for Turret and PowerUp ───────────────────────────────────────────

/** Minimal turret stub with a jest.fn() hit() that returns false by default. */
function makeTurret(x, y, r = TURRET_RADIUS) {
  return {
    x,
    y,
    get radius() {
      return r;
    },
    hit: jest.fn(() => false),
  };
}

/** Minimal powerup stub at the given position. */
function makePowerUp(x, y, type) {
  return { x, y, type, radius: 12 };
}

// ── Bullet × Turret ───────────────────────────────────────────────────────────

describe("Bullet × Turret collision", () => {
  test("bullet is consumed on turret hit", () => {
    const g = makeGame();
    const bullet = { x: 400, y: 300, vx: 0, vy: 0, radius: 3 };
    g.bullets = [bullet];
    g.turrets = [makeTurret(402, 300)]; // within radius + 3
    g.collisions.updateBullet();
    expect(g.bullets).toHaveLength(0);
  });

  test("turret.hit() is called when bullet overlaps turret", () => {
    const g = makeGame();
    const turret = makeTurret(402, 300);
    g.bullets = [{ x: 400, y: 300, vx: 0, vy: 0, radius: 3 }];
    g.turrets = [turret];
    g.collisions.updateBullet();
    expect(turret.hit).toHaveBeenCalledTimes(1);
  });

  test("turret is removed and score added when hit() returns true (killing blow)", () => {
    const g = makeGame();
    const turret = { ...makeTurret(402, 300), hit: jest.fn(() => true) };
    const scoreBefore = g.score;
    g.bullets = [{ x: 400, y: 300, vx: 0, vy: 0, radius: 3 }];
    g.turrets = [turret];
    g.collisions.updateBullet();
    expect(g.turrets).toHaveLength(0);
    expect(g.score).toBe(scoreBefore + TURRET_SCORE);
  });

  test("turret survives when hit() returns false (HP > 0)", () => {
    const g = makeGame();
    g.bullets = [{ x: 400, y: 300, vx: 0, vy: 0, radius: 3 }];
    g.turrets = [makeTurret(402, 300)]; // hit() → false by default
    g.collisions.updateBullet();
    expect(g.turrets).toHaveLength(1);
  });

  test("out-of-range bullet does not hit turret", () => {
    const g = makeGame();
    const turret = makeTurret(600, 300);
    g.bullets = [{ x: 400, y: 300, vx: 0, vy: 0, radius: 3 }];
    g.turrets = [turret];
    g.collisions.updateBullet();
    expect(turret.hit).not.toHaveBeenCalled();
    expect(g.bullets).toHaveLength(1);
  });
});

// ── Ship × Turret ─────────────────────────────────────────────────────────────

describe("Ship × Turret collision", () => {
  test("ship with shield bounces off turret", () => {
    const g = makeGame();
    const shieldR = SHIP_SIZE * SHIP_SHIELD_FACTOR;
    const turret = makeTurret(400 + shieldR - 5, 300, 5);
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 5 });
    const vxBefore = g.ship.vx;
    g.turrets = [turret];
    g.collisions.updateShip();
    expect(g.ship).not.toBeNull();
    expect(g.ship.vx).not.toBe(vxBefore);
  });

  test("ship without shield is killed on turret contact", () => {
    const g = makeGame();
    const turret = makeTurret(410, 300, 20); // well inside hull range
    g.ship = makeShip({ x: 400, y: 300, vx: 100, vy: 0, shieldTimer: 0 });
    g.turrets = [turret];
    g.collisions.updateShip();
    expect(g.ship).toBeNull();
  });
});

// ── PowerUp pickup ────────────────────────────────────────────────────────────

describe("PowerUp pickup", () => {
  test("collecting shield powerup sets ship.shieldTimer", () => {
    const g = makeGame();
    g.ship = makeShip({ x: 400, y: 300, shieldTimer: 0 });
    g.powerups = [makePowerUp(400, 300, "shield")];
    g.collisions.updateShip();
    expect(g.ship.shieldTimer).toBe(g._powerupDuration);
  });

  test("collecting rapid powerup sets ship.rapidTimer", () => {
    const g = makeGame();
    g.ship = makeShip({ x: 400, y: 300 });
    g.powerups = [makePowerUp(400, 300, "rapid")];
    g.collisions.updateShip();
    expect(g.ship.rapidTimer).toBe(g._powerupDuration);
  });

  test("collecting spread powerup sets ship.spreadTimer", () => {
    const g = makeGame();
    g.ship = makeShip({ x: 400, y: 300 });
    g.powerups = [makePowerUp(400, 300, "spread")];
    g.collisions.updateShip();
    expect(g.ship.spreadTimer).toBe(g._powerupDuration);
  });

  test("collecting heavy powerup sets ship.heavyTimer", () => {
    const g = makeGame();
    g.ship = makeShip({ x: 400, y: 300 });
    g.powerups = [makePowerUp(400, 300, "heavy")];
    g.collisions.updateShip();
    expect(g.ship.heavyTimer).toBe(g._powerupDuration);
  });

  test("powerup is removed from game.powerups after pickup", () => {
    const g = makeGame();
    g.ship = makeShip({ x: 400, y: 300 });
    g.powerups = [makePowerUp(400, 300, "shield")];
    g.collisions.updateShip();
    expect(g.powerups).toHaveLength(0);
  });

  test("out-of-range powerup is not collected", () => {
    const g = makeGame();
    g.ship = makeShip({ x: 400, y: 300, shieldTimer: 0 });
    g.powerups = [makePowerUp(600, 300, "shield")];
    g.collisions.updateShip();
    expect(g.powerups).toHaveLength(1);
    expect(g.ship.shieldTimer).toBe(0);
  });

  test("_powerupDuration scales with config.powerupFreq", () => {
    const g = makeGame();
    g.config.powerupFreq = 1;
    expect(g._powerupDuration).toBe(POWERUP_DURATION_LEVELS[0]);
    g.config.powerupFreq = 3;
    expect(g._powerupDuration).toBe(POWERUP_DURATION_LEVELS[2]);
  });
});

// ── _scanBullets helper ───────────────────────────────────────────────────────

describe("CollisionSystem._scanBullets", () => {
  test("removes bullets for which testFn returns true", () => {
    const g = makeGame();
    g.bullets = [
      { x: 0, y: 0, vx: 1, vy: 0, radius: 3 },
      { x: 100, y: 0, vx: 1, vy: 0, radius: 3 },
    ];
    g.collisions._scanBullets((b) => b.x === 0);
    expect(g.bullets).toHaveLength(1);
    expect(g.bullets[0].x).toBe(100);
  });

  test("keeps bullets for which testFn returns false", () => {
    const g = makeGame();
    g.bullets = [{ x: 0, y: 0, vx: 1, vy: 0, radius: 3 }];
    g.collisions._scanBullets(() => false);
    expect(g.bullets).toHaveLength(1);
  });

  test("iterates in reverse so splicing does not skip bullets", () => {
    const g = makeGame();
    const seen = [];
    g.bullets = [
      { x: 1, y: 0, vx: 0, vy: 0, radius: 3 },
      { x: 2, y: 0, vx: 0, vy: 0, radius: 3 },
      { x: 3, y: 0, vx: 0, vy: 0, radius: 3 },
    ];
    g.collisions._scanBullets((b) => {
      seen.push(b.x);
      return true;
    });
    expect(seen).toEqual([3, 2, 1]);
    expect(g.bullets).toHaveLength(0);
  });
});

// ── Bullet × Pumice ──────────────────────────────────────────────────────────

describe("Bullet × Pumice collision", () => {
  function makePumiceStub(hitResult) {
    return { alive: true, handleBulletHit: jest.fn(() => hitResult) };
  }

  test("bullet is consumed when handleBulletHit returns true", () => {
    const g = makeGame();
    g.pumices = [makePumiceStub(true)];
    g.bullets = [{ x: 400, y: 300, vx: 100, vy: 0, radius: 3 }];
    g.collisions.updateBullet();
    expect(g.bullets).toHaveLength(0);
  });

  test("bullet is kept when handleBulletHit returns false", () => {
    const g = makeGame();
    g.pumices = [makePumiceStub(false)];
    g.bullets = [{ x: 400, y: 300, vx: 100, vy: 0, radius: 3 }];
    g.collisions.updateBullet();
    expect(g.bullets).toHaveLength(1);
  });

  test("dead pumice cells are filtered out after bullet processing", () => {
    const g = makeGame();
    const dead = { alive: false, handleBulletHit: jest.fn(() => false) };
    const alive = makePumiceStub(false);
    g.pumices = [dead, alive];
    g.bullets = [];
    g.collisions.updateBullet();
    expect(g.pumices).toHaveLength(1);
    expect(g.pumices[0]).toBe(alive);
  });

  test("dead pumice is skipped during bullet check", () => {
    const g = makeGame();
    const dead = { alive: false, handleBulletHit: jest.fn(() => true) };
    g.pumices = [dead];
    g.bullets = [{ x: 400, y: 300, vx: 100, vy: 0, radius: 3 }];
    g.collisions.updateBullet();
    expect(dead.handleBulletHit).not.toHaveBeenCalled();
    expect(g.bullets).toHaveLength(1); // bullet untouched
  });
});
