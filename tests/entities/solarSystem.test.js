"use strict";

global.Particle = function () {};

const { SolarSystem } = require("../../src/entities/SolarSystem.js");

// Minimal stubs so SolarSystem can construct and update without a full game context.
function makeFakeGame() {
  return {
    particles: [],
    snd: { explodeLarge: jest.fn() },
    _addScore: jest.fn(),
    engine: { world: {} },
  };
}

// Satellite stub with a mutable constraint.pointB.
function makeSatellite(x, y, anchorX, anchorY) {
  return {
    x,
    y,
    anchorX,
    anchorY,
    constraint: { pointB: { x: anchorX, y: anchorY } },
  };
}

describe("SolarSystem constructor", () => {
  test("position is set from arguments", () => {
    const sys = new SolarSystem(300, 200, 4);
    expect(sys.x).toBe(300);
    expect(sys.y).toBe(200);
  });

  test("starts alive", () => {
    const sys = new SolarSystem(300, 200, 4);
    expect(sys.alive).toBe(true);
  });

  test("satellites array starts empty", () => {
    const sys = new SolarSystem(300, 200, 4);
    expect(sys.satellites).toHaveLength(0);
  });

  test("initial velocity magnitude equals SOLAR_CENTER_SPEED", () => {
    const sys = new SolarSystem(300, 200, 4);
    expect(Math.hypot(sys.vx, sys.vy)).toBeCloseTo(SOLAR_CENTER_SPEED);
  });
});

describe("SolarSystem.update — movement", () => {
  test("center moves each frame", () => {
    const sys = new SolarSystem(300, 200, 4);
    const x0 = sys.x;
    const y0 = sys.y;
    sys.update(1 / 60);
    expect(sys.x !== x0 || sys.y !== y0).toBe(true);
  });

  test("returns true while alive", () => {
    const sys = new SolarSystem(300, 200, 4);
    expect(sys.update(1 / 60)).toBe(true);
  });

  test("returns false after explosion", () => {
    const sys = new SolarSystem(300, 200, 1);
    const game = makeFakeGame();
    const sat = makeSatellite(350, 200, 300, 200);
    sys.satellites.push(sat);
    sys.onSatelliteDestroyed(sat, game);
    expect(sys.update(1 / 60)).toBe(false);
  });
});

describe("SolarSystem.update — edge bouncing", () => {
  test("vx flips when center reaches left margin", () => {
    const margin = SOLAR_TETHER_MAX + ASTEROID_RADIUS[0];
    const sys = new SolarSystem(margin + 1, 300, 2);
    sys.vx = -SOLAR_CENTER_SPEED;
    sys.vy = 0;
    sys.update(0.1);
    expect(sys.vx).toBeGreaterThan(0);
  });

  test("vx flips when center reaches right margin", () => {
    const margin = SOLAR_TETHER_MAX + ASTEROID_RADIUS[0];
    const sys = new SolarSystem(W - margin - 1, 300, 2);
    sys.vx = SOLAR_CENTER_SPEED;
    sys.vy = 0;
    sys.update(0.1);
    expect(sys.vx).toBeLessThan(0);
  });

  test("vy flips when center reaches top margin", () => {
    const margin = SOLAR_TETHER_MAX + ASTEROID_RADIUS[0];
    const sys = new SolarSystem(300, margin + 1, 2);
    sys.vx = 0;
    sys.vy = -SOLAR_CENTER_SPEED;
    sys.update(0.1);
    expect(sys.vy).toBeGreaterThan(0);
  });

  test("vy flips when center reaches bottom margin", () => {
    const margin = SOLAR_TETHER_MAX + ASTEROID_RADIUS[0];
    const sys = new SolarSystem(300, H - margin - 1, 2);
    sys.vx = 0;
    sys.vy = SOLAR_CENTER_SPEED;
    sys.update(0.1);
    expect(sys.vy).toBeLessThan(0);
  });

  test("center is clamped inside margin after bounce", () => {
    const margin = SOLAR_TETHER_MAX + ASTEROID_RADIUS[0];
    // Place center exactly at margin — a large dt pushes it past the boundary.
    const sys = new SolarSystem(margin, 300, 2);
    sys.vx = -SOLAR_CENTER_SPEED;
    sys.vy = 0;
    sys.update(1);
    expect(sys.x).toBeGreaterThanOrEqual(margin);
    expect(sys.x).toBeLessThanOrEqual(W - margin);
  });
});

describe("SolarSystem.update — satellite anchor sync", () => {
  test("satellite anchorX/Y follows center (constraint uses bodyB, not pointB)", () => {
    const sys = new SolarSystem(300, 200, 2);
    sys.vx = SOLAR_CENTER_SPEED;
    sys.vy = 0;
    const sat = makeSatellite(350, 200, 300, 200);
    sys.satellites.push(sat);
    sys.update(1);
    // anchorX/Y drive tether drawing; constraint anchor is handled by bodyB.
    expect(sat.anchorX).toBeCloseTo(sys.x);
    expect(sat.anchorY).toBeCloseTo(sys.y);
  });

  test("satellite anchorX/Y follows center", () => {
    const sys = new SolarSystem(300, 200, 2);
    sys.vx = SOLAR_CENTER_SPEED;
    sys.vy = 0;
    const sat = makeSatellite(350, 200, 300, 200);
    sys.satellites.push(sat);
    sys.update(1);
    expect(sat.anchorX).toBeCloseTo(sys.x);
    expect(sat.anchorY).toBeCloseTo(sys.y);
  });
});

describe("SolarSystem.onSatelliteDestroyed", () => {
  test("removes the satellite from satellites array", () => {
    const sys = new SolarSystem(300, 200, 3);
    const game = makeFakeGame();
    const s1 = makeSatellite(350, 200, 300, 200);
    const s2 = makeSatellite(260, 200, 300, 200);
    const s3 = makeSatellite(300, 250, 300, 200);
    sys.satellites.push(s1, s2, s3);
    sys.onSatelliteDestroyed(s2, game);
    expect(sys.satellites).toHaveLength(2);
    expect(sys.satellites).not.toContain(s2);
  });

  test("does not explode while satellites remain", () => {
    const sys = new SolarSystem(300, 200, 2);
    const game = makeFakeGame();
    const s1 = makeSatellite(350, 200, 300, 200);
    const s2 = makeSatellite(260, 200, 300, 200);
    sys.satellites.push(s1, s2);
    sys.onSatelliteDestroyed(s1, game);
    expect(sys.alive).toBe(true);
    expect(game.snd.explodeLarge).not.toHaveBeenCalled();
  });

  test("explodes when the last satellite is destroyed", () => {
    const sys = new SolarSystem(300, 200, 1);
    const game = makeFakeGame();
    const sat = makeSatellite(350, 200, 300, 200);
    sys.satellites.push(sat);
    sys.onSatelliteDestroyed(sat, game);
    expect(sys.alive).toBe(false);
    expect(game.snd.explodeLarge).toHaveBeenCalledTimes(1);
    expect(game._addScore).toHaveBeenCalledWith(SOLAR_CENTER_SCORE);
  });

  test("is idempotent for unknown satellite", () => {
    const sys = new SolarSystem(300, 200, 2);
    const game = makeFakeGame();
    const s1 = makeSatellite(350, 200, 300, 200);
    const unknown = makeSatellite(400, 200, 300, 200);
    sys.satellites.push(s1);
    // Destroying a satellite not in the list should not crash or explode.
    sys.onSatelliteDestroyed(unknown, game);
    expect(sys.alive).toBe(true);
    expect(sys.satellites).toHaveLength(1);
  });
});
