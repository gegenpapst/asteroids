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

const { SatelliteClusterAsteroid } = require("../../src/entities/SatelliteClusterAsteroid.js");

const AX = 300;
const AY = 200;
const SPAWN_X = AX + 120;
const SPAWN_Y = AY;
const parentSystem = {};

describe("SatelliteClusterAsteroid constructor", () => {
  test("stores anchor coordinates", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem);
    expect(s.anchorX).toBe(AX);
    expect(s.anchorY).toBe(AY);
  });

  test("isSatellite is true with a parent system", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem);
    expect(s.isSatellite).toBe(true);
  });

  test("isSatellite is false without a parent system", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, null);
    expect(s.isSatellite).toBe(false);
  });

  test("constraint uses bodyB (solar system body) with spawn distance as length", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem);
    // With parentSystem set, the constraint anchors to the system body via bodyB.
    expect(s.constraint.bodyB).toBe(parentSystem.body);
    expect(s.constraint.pointB).toEqual({ x: 0, y: 0 });
    expect(s.constraint.length).toBeCloseTo(120);
    expect(s.constraint.bodyA).toBe(s.body);
  });

  test("pendulum constraint (no parentSystem) uses fixed world pointB", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, null);
    expect(s.constraint.bodyB).toBeUndefined();
    expect(s.constraint.pointB).toEqual({ x: AX, y: AY });
  });

  test("initial velocity is tangential (perpendicular to the radial direction)", () => {
    const speed = 110;
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem, 2, 7, speed);
    // Radial direction is +x; tangential velocity must be ±y only.
    expect(Math.abs(s.vx)).toBeLessThan(1e-9);
    expect(Math.abs(s.vy)).toBeCloseTo(speed);
  });
});

describe("SatelliteClusterAsteroid.split", () => {
  test("satellites never split (always size=2)", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem, 2);
    expect(s.split()).toHaveLength(0);
  });
});
