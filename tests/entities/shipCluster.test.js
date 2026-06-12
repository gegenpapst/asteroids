"use strict";

const { ShipBase } = require("../../src/entities/ShipBase.js");
global.ShipBase = ShipBase;

const { Bullet } = require("../../src/entities/Bullet.js");
global.Bullet = Bullet;

const { ShipCluster } = require("../../src/entities/ShipCluster.js");

// Silence all input by default; individual tests re-mock what they need.
const INPUT_METHODS = ["left", "right", "up", "fire", "strafeLeft", "strafeRight"];
beforeEach(() => {
  for (const m of INPUT_METHODS) jest.spyOn(Input, m).mockReturnValue(false);
});
afterEach(() => jest.restoreAllMocks());

describe("ShipCluster constructor", () => {
  test("spawns at screen center", () => {
    const s = new ShipCluster();
    expect(s.x).toBe(W / 2);
    expect(s.y).toBe(H / 2);
  });

  test("starts invulnerable with zero velocity", () => {
    const s = new ShipCluster();
    expect(s.invulnerable).toBeGreaterThan(0);
    expect(s.vx).toBe(0);
    expect(s.vy).toBe(0);
  });

  test("radius derives from SHIP_SIZE and hull factor", () => {
    expect(new ShipCluster().radius).toBeCloseTo(SHIP_SIZE * SHIP_HULL_FACTOR);
  });
});

describe("ShipCluster.hitRadius", () => {
  test("equals radius without shield", () => {
    const s = new ShipCluster();
    expect(s.hitRadius).toBeCloseTo(s.radius);
  });

  test("expands to shield bubble while shield is active", () => {
    const s = new ShipCluster();
    s.shieldTimer = 3;
    expect(s.hitRadius).toBeCloseTo(SHIP_SIZE * SHIP_SHIELD_FACTOR);
  });
});

describe("ShipCluster.teleport", () => {
  test("moves the ship and grants brief invulnerability", () => {
    const s = new ShipCluster();
    s.invulnerable = 0;
    s.teleport(50, 60);
    expect(s.x).toBe(50);
    expect(s.y).toBe(60);
    expect(s.invulnerable).toBeCloseTo(1.5);
  });
});

describe("ShipCluster.update", () => {
  test("power-up timers drain over time", () => {
    const s = new ShipCluster();
    s.shieldTimer = 1;
    s.rapidTimer = 1;
    s.spreadTimer = 1;
    s.update(0.4);
    expect(s.shieldTimer).toBeCloseTo(0.6);
    expect(s.rapidTimer).toBeCloseTo(0.6);
    expect(s.spreadTimer).toBeCloseTo(0.6);
  });

  test("thrust accelerates along facing direction", () => {
    Input.up.mockReturnValue(true);
    const s = new ShipCluster();
    s.angle = 0; // facing right
    s.update(0.1);
    expect(s.vx).toBeGreaterThan(0);
    expect(Math.abs(s.vy)).toBeLessThan(1e-9);
  });

  test("speed is capped at SHIP_MAX_SPEED", () => {
    Input.up.mockReturnValue(true);
    const s = new ShipCluster();
    s.angle = 0;
    for (let i = 0; i < 600; i++) s.update(1 / 60);
    expect(Math.hypot(s.vx, s.vy)).toBeLessThanOrEqual(SHIP_MAX_SPEED + 1e-6);
  });

  test("turning changes the angle", () => {
    Input.left.mockReturnValue(true);
    const s = new ShipCluster();
    const before = s.angle;
    s.update(0.1);
    expect(s.angle).toBeLessThan(before);
  });

  test("position wraps around screen edges", () => {
    const s = new ShipCluster();
    s.x = W - 1;
    s.vx = SHIP_MIN_SPEED * 2;
    s.update(1);
    expect(s.x).toBeGreaterThanOrEqual(0);
    expect(s.x).toBeLessThanOrEqual(W);
  });
});

describe("ShipCluster.canFire / fire", () => {
  test("cannot fire while fireTimer is running", () => {
    Input.fire.mockReturnValue(true);
    const s = new ShipCluster();
    s.fireTimer = 0.2;
    expect(s.canFire()).toBe(false);
  });

  test("fire returns a single bullet and starts the cooldown", () => {
    const s = new ShipCluster();
    const bullets = s.fire();
    expect(bullets).toHaveLength(1);
    expect(bullets[0]).toBeInstanceOf(Bullet);
    expect(s.fireTimer).toBeCloseTo(FIRE_RATE);
  });

  test("spread power-up fires three bullets", () => {
    const s = new ShipCluster();
    s.spreadTimer = 3;
    expect(s.fire()).toHaveLength(3);
  });

  test("rapid power-up halves the cooldown", () => {
    const s = new ShipCluster();
    s.rapidTimer = 3;
    s.fire();
    expect(s.fireTimer).toBeCloseTo(FIRE_RATE / 2);
  });

  test("heavy power-up doubles bullet power", () => {
    const s = new ShipCluster();
    s.heavyTimer = 3;
    const [b] = s.fire();
    expect(b.power).toBe(2);
  });
});
