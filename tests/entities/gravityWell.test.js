import { jest } from "@jest/globals";
import { GravityWell } from "../../src/entities/GravityWell.js";

// Euler target (ship/bullet): carries vx/vy in px/s.
function makeEulerTarget(x, y) {
  return { x, y, vx: 0, vy: 0 };
}

// Matter target (asteroid): velocity stored on body in px/frame.
function makeBodyTarget(x, y) {
  const velocity = { x: 0, y: 0 };
  return {
    x,
    y,
    body: {
      velocity,
      // Matter.Body.setVelocity mutates this object in the real engine; stub it.
    },
  };
}

describe("GravityWell constructor", () => {
  test("position is set from arguments", () => {
    const w = new GravityWell(300, 200);
    expect(w.x).toBe(300);
    expect(w.y).toBe(200);
  });

  test("initial drift speed equals GRAVITY_WELL_DRIFT_SPEED", () => {
    const w = new GravityWell(300, 200);
    expect(Math.hypot(w.vx, w.vy)).toBeCloseTo(GRAVITY_WELL_DRIFT_SPEED);
  });

  test("radius getter returns GRAVITY_WELL_RADIUS", () => {
    const w = new GravityWell(300, 200);
    expect(w.radius).toBe(GRAVITY_WELL_RADIUS);
  });
});

describe("GravityWell.update — drift & bounce", () => {
  test("update always returns true (indestructible)", () => {
    const w = new GravityWell(300, 200);
    expect(w.update(1 / 60)).toBe(true);
  });

  test("center moves each frame", () => {
    const w = new GravityWell(300, 200);
    const x0 = w.x;
    const y0 = w.y;
    w.update(1 / 60);
    expect(w.x !== x0 || w.y !== y0).toBe(true);
  });

  test("vx flips at the left margin", () => {
    const margin = GRAVITY_WELL_RADIUS * 3;
    const w = new GravityWell(margin + 1, 300);
    w.vx = -GRAVITY_WELL_DRIFT_SPEED;
    w.vy = 0;
    w.update(0.2);
    expect(w.vx).toBeGreaterThan(0);
    expect(w.x).toBeGreaterThanOrEqual(margin);
  });

  test("vy flips at the bottom margin", () => {
    const margin = GRAVITY_WELL_RADIUS * 3;
    const w = new GravityWell(300, WH - margin - 1);
    w.vx = 0;
    w.vy = GRAVITY_WELL_DRIFT_SPEED;
    w.update(0.2);
    expect(w.vy).toBeLessThan(0);
    expect(w.y).toBeLessThanOrEqual(WH - margin);
  });
});

describe("GravityWell.pull — Euler targets (ship/bullets)", () => {
  test("pulls a target toward the centre", () => {
    const w = new GravityWell(300, 200);
    const target = makeEulerTarget(350, 200); // 50px to the right of the well
    w.pull(target, 1 / 60, false);
    expect(target.vx).toBeLessThan(0); // pulled left, toward the well
    expect(target.vy).toBeCloseTo(0);
  });

  test("does nothing beyond GRAVITY_WELL_REACH", () => {
    const w = new GravityWell(0, 0);
    const target = makeEulerTarget(GRAVITY_WELL_REACH + 10, 0);
    w.pull(target, 1 / 60, false);
    expect(target.vx).toBe(0);
    expect(target.vy).toBe(0);
  });

  test("pull is stronger closer to the centre (linear falloff)", () => {
    const w = new GravityWell(0, 0);
    const near = makeEulerTarget(20, 0);
    const far = makeEulerTarget(GRAVITY_WELL_REACH * 0.9, 0);
    w.pull(near, 1 / 60, false);
    w.pull(far, 1 / 60, false);
    expect(Math.abs(near.vx)).toBeGreaterThan(Math.abs(far.vx));
  });

  test("does not act on a target exactly at the centre (no NaN)", () => {
    const w = new GravityWell(100, 100);
    const target = makeEulerTarget(100, 100);
    w.pull(target, 1 / 60, false);
    expect(target.vx).toBe(0);
    expect(target.vy).toBe(0);
  });
});

describe("GravityWell.pull — Matter body targets (asteroids)", () => {
  test("adds velocity to the body toward the centre (px/frame scale)", () => {
    const w = new GravityWell(300, 200);
    const target = makeBodyTarget(350, 200);
    w.pull(target, 1 / 60, true);
    expect(target.body.velocity.x).toBeLessThan(0); // toward the well (left)
  });

  test("body pull is /60 of the equivalent Euler pull", () => {
    const w = new GravityWell(0, 0);
    const euler = makeEulerTarget(50, 0);
    const body = makeBodyTarget(50, 0);
    w.pull(euler, 1 / 60, false);
    w.pull(body, 1 / 60, true);
    expect(body.body.velocity.x).toBeCloseTo(euler.vx / 60);
  });
});
