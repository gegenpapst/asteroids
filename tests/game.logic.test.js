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

global.VISUAL_MODES = [null];

// ── Entity globals required by _boom / _spawnDebris / powerup spawn ──────────

const { Particle } = require("../src/entities/Particle.js");
global.Particle = Particle;

const { Debris } = require("../src/entities/Debris.js");
global.Debris = Debris;

const { Bullet } = require("../src/entities/Bullet.js");
global.Bullet = Bullet;

const { PowerUp } = require("../src/entities/PowerUp.js");
global.PowerUp = PowerUp;

// ── Game ─────────────────────────────────────────────────────────────────────

const { Game, STATE } = require("../src/Game.js");

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeGame() {
  const g = new Game();
  g.state = STATE.PLAYING;
  g.particles = [];
  g.debris = [];
  return g;
}

function makeBullet(x, y, vx = 100, vy = 0) {
  return new Bullet(x, y, vx, vy);
}

/** Minimal asteroid stub. split() returns [] by default (size-2 leaf). */
function makeAsteroid(x, y, size = 2, children = []) {
  return {
    x,
    y,
    size,
    collisionRadius: ASTEROID_RADIUS[size],
    rotSpeed: 0,
    score: ASTEROID_SCORE[size],
    body: {},
    split() {
      return children;
    },
  };
}

function makeUfo(x, y, size = 0) {
  return { x, y, radius: UFO_RADIUS[size], score: UFO_SCORE[size] };
}

afterEach(() => jest.restoreAllMocks());

// ── _addScore ────────────────────────────────────────────────────────────────

describe("Game._addScore", () => {
  test("accumulates score", () => {
    const g = makeGame();
    g._addScore(100);
    g._addScore(50);
    expect(g.score).toBe(150);
  });

  test("updates and persists hi-score when exceeded", () => {
    const setItem = jest.spyOn(global.localStorage, "setItem");
    const g = makeGame();
    g.hiScore = 100;
    g._addScore(250);
    expect(g.hiScore).toBe(250);
    expect(setItem).toHaveBeenCalledWith("ast_hi", 250);
  });

  test("does not touch hi-score while below it", () => {
    const setItem = jest.spyOn(global.localStorage, "setItem");
    const g = makeGame();
    g.hiScore = 99999;
    g._addScore(10);
    expect(g.hiScore).toBe(99999);
    expect(setItem).not.toHaveBeenCalled();
  });

  test("awards an extra life at EXTRA_LIFE_SCORE", () => {
    const g = makeGame();
    const livesBefore = g.lives;
    g._addScore(EXTRA_LIFE_SCORE);
    expect(g.lives).toBe(livesBefore + 1);
  });

  test("next extra life requires another full threshold", () => {
    const g = makeGame();
    const livesBefore = g.lives;
    g._addScore(EXTRA_LIFE_SCORE);
    g._addScore(EXTRA_LIFE_SCORE - 1);
    expect(g.lives).toBe(livesBefore + 1);
    g._addScore(1);
    expect(g.lives).toBe(livesBefore + 2);
  });
});

// ── _killShip ────────────────────────────────────────────────────────────────

describe("Game._killShip", () => {
  function withShip(g) {
    g.ship = { x: 400, y: 300, body: {} };
    return g;
  }

  test("decrements lives and clears the ship", () => {
    const g = withShip(makeGame());
    const livesBefore = g.lives;
    g._killShip();
    expect(g.lives).toBe(livesBefore - 1);
    expect(g.ship).toBeNull();
  });

  test("switches to DEAD state with respawn delay", () => {
    const g = withShip(makeGame());
    g._killShip();
    expect(g.state).toBe(STATE.DEAD);
    expect(g.deadTimer).toBe(RESPAWN_DELAY);
  });

  test("clears all bullets on both sides", () => {
    const g = withShip(makeGame());
    g.bullets = [makeBullet(0, 0)];
    g.ufoBullets = [{}];
    g._killShip();
    expect(g.bullets).toHaveLength(0);
    expect(g.ufoBullets).toHaveLength(0);
  });
});

// ── _updateBulletCollisions ──────────────────────────────────────────────────

describe("Bullet × Asteroid collision", () => {
  test("removes bullet and asteroid, adds score", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99); // no powerup drop
    const g = makeGame();
    const a = makeAsteroid(400, 300, 2);
    g.asteroids = [a];
    g.bullets = [makeBullet(400, 300)];
    g._updateBulletCollisions();
    expect(g.asteroids).toHaveLength(0);
    expect(g.bullets).toHaveLength(0);
    expect(g.score).toBe(ASTEROID_SCORE[2]);
  });

  test("replaces a splitting asteroid with its children", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.99);
    const g = makeGame();
    const children = [makeAsteroid(390, 300, 1), makeAsteroid(410, 300, 1)];
    g.asteroids = [makeAsteroid(400, 300, 0, children)];
    g.bullets = [makeBullet(400, 300)];
    g._updateBulletCollisions();
    expect(g.asteroids).toHaveLength(2);
    expect(g.asteroids[0].size).toBe(1);
  });

  test("missing bullets pass through (no collision)", () => {
    const g = makeGame();
    g.asteroids = [makeAsteroid(400, 300, 2)];
    g.bullets = [makeBullet(700, 500)];
    g._updateBulletCollisions();
    expect(g.asteroids).toHaveLength(1);
    expect(g.bullets).toHaveLength(1);
  });

  test("can drop a powerup on destruction", () => {
    jest.spyOn(Math, "random").mockReturnValue(0); // force drop (and randInt → 0)
    const g = makeGame();
    g.asteroids = [makeAsteroid(400, 300, 2)];
    g.bullets = [makeBullet(400, 300)];
    g._updateBulletCollisions();
    expect(g.powerups).toHaveLength(1);
    expect(g.powerups[0]).toBeInstanceOf(PowerUp);
  });
});

describe("Bullet × UFO collision", () => {
  test("removes bullet and UFO, adds UFO score", () => {
    const g = makeGame();
    g.ufos = [makeUfo(400, 300, 1)];
    g.bullets = [makeBullet(400, 300)];
    g._updateBulletCollisions();
    expect(g.ufos).toHaveLength(0);
    expect(g.bullets).toHaveLength(0);
    expect(g.score).toBe(UFO_SCORE[1]);
  });
});

describe("Bullet × Rock collision", () => {
  test("rock absorbs the bullet and stays", () => {
    const g = makeGame();
    g.rocks = [{ x: 400, y: 300, collisionRadius: 25, body: {} }];
    g.bullets = [makeBullet(400, 300)];
    g._updateBulletCollisions();
    expect(g.bullets).toHaveLength(0);
    expect(g.rocks).toHaveLength(1);
    expect(g.score).toBe(0);
  });
});

// ── State transitions ────────────────────────────────────────────────────────

describe("Quit confirmation flow", () => {
  function pressOnly(code) {
    jest.spyOn(Input, "wasPressed").mockImplementation((c) => c === code);
    jest.spyOn(Input, "start").mockReturnValue(false);
    jest.spyOn(Input, "config").mockReturnValue(false);
    jest.spyOn(Input, "help").mockReturnValue(false);
  }

  test("ESC during PLAYING opens the quit dialog", () => {
    const g = makeGame();
    pressOnly("Escape");
    expect(g._updateStateInput()).toBe(true);
    expect(g.state).toBe(STATE.QUIT_CONFIRM);
  });

  test("Y confirms and ends the game", () => {
    const g = makeGame();
    g.state = STATE.QUIT_CONFIRM;
    pressOnly("KeyY");
    g._updateStateInput();
    expect(g.state).toBe(STATE.GAMEOVER);
  });

  test("Z confirms too (QWERTZ keyboards)", () => {
    const g = makeGame();
    g.state = STATE.QUIT_CONFIRM;
    pressOnly("KeyZ");
    g._updateStateInput();
    expect(g.state).toBe(STATE.GAMEOVER);
  });

  test("N cancels back to PLAYING", () => {
    const g = makeGame();
    g.state = STATE.QUIT_CONFIRM;
    pressOnly("KeyN");
    g._updateStateInput();
    expect(g.state).toBe(STATE.PLAYING);
  });

  test("ESC cancels back to PLAYING", () => {
    const g = makeGame();
    g.state = STATE.QUIT_CONFIRM;
    pressOnly("Escape");
    g._updateStateInput();
    expect(g.state).toBe(STATE.PLAYING);
  });

  test("any other key leaves the dialog open", () => {
    const g = makeGame();
    g.state = STATE.QUIT_CONFIRM;
    pressOnly("Space");
    expect(g._updateStateInput()).toBe(true);
    expect(g.state).toBe(STATE.QUIT_CONFIRM);
  });
});

describe("Help and config transitions", () => {
  function noInput() {
    jest.spyOn(Input, "wasPressed").mockReturnValue(false);
    jest.spyOn(Input, "start").mockReturnValue(false);
    jest.spyOn(Input, "config").mockReturnValue(false);
    jest.spyOn(Input, "help").mockReturnValue(false);
  }

  test("H during PLAYING opens help", () => {
    const g = makeGame();
    noInput();
    Input.help.mockReturnValue(true);
    g._updateStateInput();
    expect(g.state).toBe(STATE.HELP);
  });

  test("H during HELP resumes the game", () => {
    const g = makeGame();
    g.state = STATE.HELP;
    noInput();
    Input.help.mockReturnValue(true);
    g._updateStateInput();
    expect(g.state).toBe(STATE.PLAYING);
  });

  test("Enter on START opens the config screen", () => {
    const g = makeGame();
    g.state = STATE.START;
    noInput();
    Input.start.mockReturnValue(true);
    g._updateStateInput();
    expect(g.state).toBe(STATE.CONFIG);
    expect(g._configFocus).toBe("mode");
  });

  test("ESC in CONFIG returns to the previous state", () => {
    const g = makeGame();
    g.state = STATE.CONFIG;
    g._configPrevState = STATE.START;
    noInput();
    Input.wasPressed.mockImplementation((c) => c === "Escape");
    g._updateStateInput();
    expect(g.state).toBe(STATE.START);
  });

  test("D in CONFIG opens the detail dialog", () => {
    const g = makeGame();
    g.state = STATE.CONFIG;
    g._configPrevState = STATE.START;
    noInput();
    Input.wasPressed.mockImplementation((c) => c === "KeyD");
    g._updateStateInput();
    expect(g.state).toBe(STATE.CONFIG_DETAIL);
    expect(g._detailCursor).toBe(0);
  });

  test("leaving the detail dialog focuses the mode tiles", () => {
    const g = makeGame();
    g.state = STATE.CONFIG_DETAIL;
    g._configPrevState = STATE.START;
    g._configFocus = "details";
    noInput();
    Input.wasPressed.mockImplementation((c) => c === "Escape");
    g._updateStateInput();
    expect(g.state).toBe(STATE.CONFIG);
    expect(g._configFocus).toBe("mode");
  });
});

// ── Config getters ───────────────────────────────────────────────────────────

describe("Config-derived getters", () => {
  test("_powerupChance follows powerupFreq", () => {
    const g = makeGame();
    g.config.powerupFreq = 1;
    expect(g._powerupChance).toBe(0.05);
    g.config.powerupFreq = 3;
    expect(g._powerupChance).toBe(0.25);
  });

  test("_pumiceCountRange follows pumiceCount", () => {
    const g = makeGame();
    g.config.pumiceCount = 1;
    expect(g._pumiceCountRange).toEqual([0, 0]);
    g.config.pumiceCount = 3;
    expect(g._pumiceCountRange).toEqual([3, 6]);
  });

  test("_asteroidCollisionFilter enables collisions only with bounce on", () => {
    const g = makeGame();
    g.config.asteroidBounce = 1;
    expect(g._asteroidCollisionFilter).toEqual({ group: -1 });
    g.config.asteroidBounce = 2;
    expect(g._asteroidCollisionFilter.group).toBe(0);
  });
});
