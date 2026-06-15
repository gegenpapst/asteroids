"use strict";

const { wrap, clamp, dist, rand, randInt, safeSplitAngle } = require("../src/utils.js");

afterEach(() => jest.restoreAllMocks());

describe("wrap", () => {
  test("value within bounds is unchanged", () => {
    expect(wrap(5, 10)).toBe(5);
  });
  test("value exceeding max wraps around", () => {
    expect(wrap(12, 10)).toBeCloseTo(2);
  });
  test("negative value wraps to positive", () => {
    expect(wrap(-3, 10)).toBeCloseTo(7);
  });
  test("exactly max wraps to 0", () => {
    expect(wrap(10, 10)).toBe(0);
  });
  test("zero stays zero", () => {
    expect(wrap(0, 10)).toBe(0);
  });
  test("large overshoot wraps correctly", () => {
    expect(wrap(25, 10)).toBeCloseTo(5);
  });
});

describe("clamp", () => {
  test("value within range is unchanged", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  test("value below lo is clamped to lo", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  test("value above hi is clamped to hi", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  test("value equal to lo is returned as-is", () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });
  test("value equal to hi is returned as-is", () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe("dist", () => {
  test("distance between same point is 0", () => {
    expect(dist({ x: 3, y: 4 }, { x: 3, y: 4 })).toBe(0);
  });
  test("3-4-5 right triangle", () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  test("horizontal distance", () => {
    expect(dist({ x: 0, y: 5 }, { x: 8, y: 5 })).toBe(8);
  });
  test("is symmetric", () => {
    const a = { x: 1, y: 2 },
      b = { x: 4, y: 6 };
    expect(dist(a, b)).toBeCloseTo(dist(b, a));
  });
  test("always non-negative", () => {
    expect(dist({ x: -3, y: -4 }, { x: 0, y: 0 })).toBe(5);
  });
});

describe("rand", () => {
  test("returns a when Math.random() is 0", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    expect(rand(2, 8)).toBe(2);
  });
  test("returns near b when Math.random() is near 1", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9999);
    expect(rand(0, 10)).toBeCloseTo(9.999);
  });
});

describe("safeSplitAngle", () => {
  const TAU = Math.PI * 2;
  const halfArc = Math.PI / 4; // Standard: ±45°

  test("gibt null zurück wenn bulletAngle null ist", () => {
    // null → rand(0, TAU) → muss im Bereich [0, TAU] liegen
    for (let i = 0; i < 50; i++) {
      const a = safeSplitAngle(null);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(TAU);
    }
  });

  test("liegt nie im verbotenen Kegel (±45° hinter Schussrichtung)", () => {
    const bulletAngle = 0; // Schuss nach rechts
    const forbid = bulletAngle + Math.PI; // verbotene Mitte: links (π)
    for (let i = 0; i < 200; i++) {
      const a = safeSplitAngle(bulletAngle);
      // normalisieren auf [-π, π] relativ zur verbotenen Mitte
      let diff = (((a - forbid) % TAU) + TAU) % TAU;
      if (diff > Math.PI) diff -= TAU;
      expect(Math.abs(diff)).toBeGreaterThan(halfArc - 0.001);
    }
  });

  test("deckt den erlaubten Bereich ab (kein systematisches Clustering)", () => {
    const bulletAngle = 0;
    const angles = Array.from({ length: 500 }, () => safeSplitAngle(bulletAngle));
    // Der erlaubte Bereich ist TAU - 2*halfArc ≈ 5.5 rad
    // Mindestens 3 verschiedene Quadranten sollten getroffen werden
    const quadrants = new Set(angles.map((a) => Math.floor((((a % TAU) + TAU) % TAU) / (TAU / 4))));
    expect(quadrants.size).toBeGreaterThanOrEqual(3);
  });
});

describe("randInt", () => {
  test("returns a when Math.random() is 0", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    expect(randInt(3, 7)).toBe(3);
  });
  test("can return upper bound", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.9999);
    expect(randInt(3, 7)).toBe(7);
  });
  test("result is always an integer", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    expect(Number.isInteger(randInt(0, 100))).toBe(true);
  });
});
