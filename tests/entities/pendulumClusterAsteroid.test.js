"use strict";

const {
  generateHexCells,
  buildMetaballCanvas,
} = require("../../src/entities/Metaball.js");
global.generateHexCells = generateHexCells;
global.buildMetaballCanvas = buildMetaballCanvas;

const { AsteroidBase } = require("../../src/entities/AsteroidBase.js");
global.AsteroidBase = AsteroidBase;

const { ClusterAsteroid } = require("../../src/entities/ClusterAsteroid.js");
global.ClusterAsteroid = ClusterAsteroid;

const {
  PendulumClusterAsteroid,
} = require("../../src/entities/PendulumClusterAsteroid.js");

const AX = 300;
const AY = 200;
const SPAWN_X = AX + 120;
const SPAWN_Y = AY;

afterEach(() => jest.restoreAllMocks());

describe("PendulumClusterAsteroid constructor", () => {
  test("stores anchorX and anchorY", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.anchorX).toBe(AX);
    expect(pa.anchorY).toBe(AY);
  });

  test("creates a constraint after construction", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.constraint).toBeDefined();
  });

  test("constraint pointB matches the anchor", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.constraint.pointB.x).toBe(AX);
    expect(pa.constraint.pointB.y).toBe(AY);
  });

  test("constraint bodyA is the asteroid body", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.constraint.bodyA).toBe(pa.body);
  });

  test("constraint length equals spawn distance from anchor", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    const expected = Math.hypot(SPAWN_X - AX, SPAWN_Y - AY);
    expect(pa.constraint.length).toBeCloseTo(expected);
  });

  test("initial velocity is non-zero (tangential kick)", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(Math.hypot(pa.vx, pa.vy)).toBeGreaterThan(0);
  });

  test("initial velocity is perpendicular to radial direction (dot ≈ 0)", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    const rdx = SPAWN_X - AX;
    const rdy = SPAWN_Y - AY;
    const dot = pa.vx * rdx + pa.vy * rdy;
    expect(Math.abs(dot)).toBeLessThan(0.001);
  });

  test("radius matches ASTEROID_RADIUS[size]", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.radius).toBe(ASTEROID_RADIUS[0]);
  });
});

describe("PendulumClusterAsteroid body", () => {
  test("body has no matter-wrap plugin", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.body.plugin?.wrap).toBeUndefined();
  });

  test("static label is 'pendulum-asteroid'", () => {
    expect(PendulumClusterAsteroid._label).toBe("pendulum-asteroid");
  });
});

describe("PendulumClusterAsteroid.split", () => {
  test("size-0 splits into 2 children", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.split()).toHaveLength(2);
  });

  test("size-0 children are ClusterAsteroid instances, NOT PendulumClusterAsteroid", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    for (const child of pa.split()) {
      expect(child).toBeInstanceOf(ClusterAsteroid);
      expect(child).not.toBeInstanceOf(PendulumClusterAsteroid);
    }
  });

  test("size-0 children have no constraint property", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    for (const child of pa.split()) {
      expect(child.constraint).toBeUndefined();
    }
  });

  test("size-2 does not split", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 2, null, AX, AY);
    expect(pa.split()).toHaveLength(0);
  });

  test("size-1 splits into size-2 children", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 1, null, AX, AY);
    const children = pa.split();
    expect(children).toHaveLength(2);
    expect(children[0].size).toBe(2);
    expect(children[1].size).toBe(2);
  });
});

describe("PendulumClusterAsteroid.draw", () => {
  test("draw() does not throw", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(() => pa.draw()).not.toThrow();
  });
});

describe("PendulumClusterAsteroid.collisionRadius", () => {
  test("collisionRadius is positive", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.collisionRadius).toBeGreaterThan(0);
  });

  test("collisionRadius uses CLUSTER_COLLISION_FACTOR", () => {
    const pa = new PendulumClusterAsteroid(SPAWN_X, SPAWN_Y, 0, null, AX, AY);
    expect(pa.collisionRadius).toBeCloseTo(
      pa.radius * CLUSTER_COLLISION_FACTOR,
    );
  });
});
