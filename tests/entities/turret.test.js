"use strict";

// UfoBullet stub — Turret.update() constructs one when firing
global.UfoBullet = class {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }
};

const { Turret } = require("../../src/entities/Turret.js");

describe("Turret constructor", () => {
  test("starts at full HP", () => {
    const t = new Turret(100, 200, () => {});
    expect(t.hp).toBe(TURRET_HP);
  });

  test("radius equals TURRET_RADIUS at full HP", () => {
    const t = new Turret(0, 0, () => {});
    expect(t.radius).toBeCloseTo(TURRET_RADIUS);
  });

  test("stores position", () => {
    const t = new Turret(123, 456, () => {});
    expect(t.x).toBe(123);
    expect(t.y).toBe(456);
  });
});

describe("Turret.hit()", () => {
  test("decreases HP by 1", () => {
    const t = new Turret(0, 0, () => {});
    const before = t.hp;
    t.hit();
    expect(t.hp).toBe(before - 1);
  });

  test("returns false while HP > 0", () => {
    const t = new Turret(0, 0, () => {});
    for (let i = 0; i < TURRET_HP - 1; i++) {
      expect(t.hit()).toBe(false);
    }
  });

  test("returns true on the killing blow (HP reaches 0)", () => {
    const t = new Turret(0, 0, () => {});
    for (let i = 0; i < TURRET_HP - 1; i++) t.hit();
    expect(t.hit()).toBe(true);
  });

  test("HP never drops below 0", () => {
    const t = new Turret(0, 0, () => {});
    for (let i = 0; i < TURRET_HP + 5; i++) t.hit();
    expect(t.hp).toBe(0);
  });

  test("radius shrinks proportionally to remaining HP", () => {
    const t = new Turret(0, 0, () => {});
    t.hit(); // HP = TURRET_HP - 1
    expect(t.radius).toBeCloseTo(TURRET_RADIUS * ((TURRET_HP - 1) / TURRET_HP));
  });
});

describe("Turret.update()", () => {
  test("returns true (turret never self-destructs)", () => {
    const t = new Turret(0, 0, () => {});
    expect(t.update(0.016)).toBe(true);
  });

  test("calls onBullet when fire timer expires", () => {
    const fired = [];
    const t = new Turret(0, 0, (b) => fired.push(b));
    t._fireTimer = 0.001;
    t.update(0.1);
    expect(fired).toHaveLength(1);
  });

  test("fired bullet originates at turret position", () => {
    const fired = [];
    const t = new Turret(123, 456, (b) => fired.push(b));
    t._fireTimer = 0.001;
    t.update(0.1);
    expect(fired[0].x).toBe(123);
    expect(fired[0].y).toBe(456);
  });

  test("fired bullet travels at TURRET_BULLET_SPEED", () => {
    const fired = [];
    const t = new Turret(0, 0, (b) => fired.push(b));
    t._fireTimer = 0.001;
    t.update(0.1);
    expect(Math.hypot(fired[0].vx, fired[0].vy)).toBeCloseTo(TURRET_BULLET_SPEED);
  });

  test("does not fire before timer expires", () => {
    const fired = [];
    const t = new Turret(0, 0, (b) => fired.push(b));
    t._fireTimer = 10;
    t.update(0.016);
    expect(fired).toHaveLength(0);
  });
});
