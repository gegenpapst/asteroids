"use strict";

const { AsteroidBase } = require("../../src/entities/AsteroidBase.js");
global.AsteroidBase = AsteroidBase;

const {
  generateHexCells,
  buildMetaballCanvas,
  renderMetaballFrame,
} = require("../../src/entities/Metaball.js");
global.generateHexCells = generateHexCells;
global.buildMetaballCanvas = buildMetaballCanvas;
global.renderMetaballFrame = renderMetaballFrame;

const { ClusterAsteroid } = require("../../src/entities/ClusterAsteroid.js");
global.ClusterAsteroid = ClusterAsteroid;

describe("ClusterAsteroid constructor", () => {
  test("radius and score come from size tables", () => {
    for (const size of [0, 1, 2]) {
      const a = new ClusterAsteroid(100, 100, size);
      expect(a.radius).toBe(ASTEROID_RADIUS[size]);
      expect(a.score).toBe(ASTEROID_SCORE[size]);
    }
  });

  test("position is set from constructor arguments", () => {
    const a = new ClusterAsteroid(123, 456, 0);
    expect(a.x).toBe(123);
    expect(a.y).toBe(456);
  });

  test("default color builds an offscreen canvas, no gradient fields", () => {
    const a = new ClusterAsteroid(0, 0, 0);
    expect(a._offCanvas).toBeDefined();
    expect(a._gradientCenter).toBeNull();
  });

  test("color object enables gradient fill and skips offscreen canvas", () => {
    const col = { center: "rgb(1,2,3)", body: "rgb(4,5,6)" };
    const a = new ClusterAsteroid(0, 0, 0, null, 7, col);
    expect(a._gradientCenter).toBe("rgb(1,2,3)");
    expect(a._gradientBody).toBe("rgb(4,5,6)");
    expect(a._offCanvas).toBeNull();
  });

  test("velocity magnitude is within speed range for its size", () => {
    for (let i = 0; i < 20; i++) {
      const a = new ClusterAsteroid(0, 0, 1);
      const speed = Math.hypot(a.vx, a.vy);
      expect(speed).toBeGreaterThanOrEqual(ASTEROID_SPEED[1] * 0.7);
      expect(speed).toBeLessThanOrEqual(ASTEROID_SPEED[1] * 1.35);
    }
  });

  test("bump radii stay within the 0.35–0.45 band", () => {
    for (let i = 0; i < 20; i++) {
      const a = new ClusterAsteroid(0, 0, 0, null, 7);
      for (const b of a._bumps) {
        expect(b.br).toBeGreaterThanOrEqual(a.radius * 0.35);
        expect(b.br).toBeLessThanOrEqual(a.radius * 0.45);
      }
    }
  });

  test("bumpCount never exceeds maxBumps", () => {
    for (let i = 0; i < 20; i++) {
      const a = new ClusterAsteroid(0, 0, 0, null, 3);
      expect(a.bumpCount).toBeLessThanOrEqual(3);
    }
  });
});

describe("ClusterAsteroid.collisionRadius", () => {
  test("full circle factor 0.9 with zero bumps", () => {
    const a = new ClusterAsteroid(0, 0, 0, null, 0);
    expect(a.collisionRadius).toBeCloseTo(a.radius * 0.9);
  });

  test("shrinks as bump count rises", () => {
    const a = new ClusterAsteroid(0, 0, 0, null, 7);
    a.bumpCount = 7;
    expect(a.collisionRadius).toBeCloseTo(a.radius * 0.65);
  });
});

describe("ClusterAsteroid.split", () => {
  test("returns two children of the next size", () => {
    const a = new ClusterAsteroid(200, 200, 0);
    const children = a.split();
    expect(children).toHaveLength(2);
    for (const c of children) {
      expect(c).toBeInstanceOf(ClusterAsteroid);
      expect(c.size).toBe(1);
    }
  });

  test("children are offset symmetrically around the parent", () => {
    const a = new ClusterAsteroid(200, 200, 0);
    const [c1, c2] = a.split();
    expect(c1.x + c2.x).toBeCloseTo(2 * a.x);
    expect(c1.y + c2.y).toBeCloseTo(2 * a.y);
  });

  test("smallest size does not split", () => {
    const a = new ClusterAsteroid(200, 200, 2);
    expect(a.split()).toHaveLength(0);
  });

  test("children inherit maxBumps", () => {
    const a = new ClusterAsteroid(200, 200, 0, null, 3);
    for (const c of a.split()) expect(c.maxBumps).toBe(3);
  });
});

describe("ClusterAsteroid.update", () => {
  test("always returns true (lifecycle handled by Game)", () => {
    const a = new ClusterAsteroid(0, 0, 0);
    expect(a.update(1 / 60)).toBe(true);
  });
});
