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

  test("constraint anchors at the given point with spawn distance as length", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem);
    expect(s.constraint.pointB).toEqual({ x: AX, y: AY });
    expect(s.constraint.length).toBeCloseTo(120);
    expect(s.constraint.bodyA).toBe(s.body);
  });

  test("initial velocity is tangential (perpendicular to the radial direction)", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem);
    // Radial direction is +x; tangential velocity must be ±y only.
    expect(Math.abs(s.vx)).toBeLessThan(1e-9);
    expect(Math.abs(s.vy)).toBeCloseTo(SOLAR_ORBIT_SPEED);
  });
});

describe("SatelliteClusterAsteroid.split", () => {
  test("children are plain ClusterAsteroid instances, not satellites", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem, 1);
    const children = s.split();
    expect(children).toHaveLength(2);
    for (const c of children) {
      expect(c).toBeInstanceOf(SatelliteClusterAsteroid);
      expect(c.size).toBe(2);
    }
  });

  test("children remain bound to the same parentSystem", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem, 1);
    for (const c of s.split()) {
      expect(c.parentSystem).toBe(parentSystem);
    }
  });

  test("smallest size does not split", () => {
    const s = new SatelliteClusterAsteroid(SPAWN_X, SPAWN_Y, AX, AY, parentSystem, 2);
    expect(s.split()).toHaveLength(0);
  });
});
