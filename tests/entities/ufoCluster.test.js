"use strict";

const { UfoBase } = require("../../src/entities/UfoBase.js");
global.UfoBase = UfoBase;

const { UfoBullet } = require("../../src/entities/UfoBullet.js");
global.UfoBullet = UfoBullet;

const { UfoCluster } = require("../../src/entities/UfoCluster.js");

const noBullet = () => {};

describe("UfoCluster constructor", () => {
  test("radius and score come from size tables", () => {
    for (const size of [0, 1]) {
      const u = new UfoCluster(size, noBullet);
      expect(u.radius).toBe(UFO_RADIUS[size]);
      expect(u.score).toBe(UFO_SCORE[size]);
    }
  });

  test("spawns just outside a horizontal screen edge", () => {
    for (let i = 0; i < 20; i++) {
      const u = new UfoCluster(0, noBullet);
      expect(u.x === -u.radius || u.x === W + u.radius).toBe(true);
    }
  });

  test("moves towards the screen (velocity points inward)", () => {
    for (let i = 0; i < 20; i++) {
      const u = new UfoCluster(0, noBullet);
      if (u.x < 0) expect(u.vx).toBeGreaterThan(0);
      else expect(u.vx).toBeLessThan(0);
    }
  });
});

describe("UfoCluster.update", () => {
  test("advances x by vx * dt", () => {
    const u = new UfoCluster(0, noBullet);
    const x0 = u.x;
    u.fireTimer = 99; // keep firing out of the picture
    u.update(0.5, null);
    expect(u.x).toBeCloseTo(x0 + u.vx * 0.5);
  });

  test("y stays clamped inside the screen", () => {
    const u = new UfoCluster(0, noBullet);
    u.fireTimer = 99;
    for (let i = 0; i < 300; i++) {
      u.update(1 / 30, null);
      expect(u.y).toBeGreaterThanOrEqual(u.radius);
      expect(u.y).toBeLessThanOrEqual(H - u.radius);
    }
  });

  test("returns false after leaving the far edge", () => {
    const u = new UfoCluster(0, noBullet);
    u.fireTimer = 9999;
    let alive = true;
    for (let i = 0; i < 2000 && alive; i++) alive = u.update(1 / 10, null);
    expect(alive).toBe(false);
  });

  test("fires a UfoBullet when fireTimer elapses", () => {
    const fired = [];
    const u = new UfoCluster(0, (b) => fired.push(b));
    u.fireTimer = 0.01;
    u.update(0.02, null);
    expect(fired).toHaveLength(1);
    expect(fired[0]).toBeInstanceOf(UfoBullet);
  });

  test("small UFO aims at the ship within spread tolerance", () => {
    const fired = [];
    const u = new UfoCluster(1, (b) => fired.push(b));
    u.x = 100;
    u.y = 100;
    const ship = { x: 400, y: 100 }; // straight to the right
    u.fireTimer = 0.01;
    u.update(0.02, ship);
    const b = fired[0];
    const angle = Math.atan2(b.vy, b.vx);
    expect(Math.abs(angle)).toBeLessThanOrEqual(0.26 + 1e-9);
  });
});
