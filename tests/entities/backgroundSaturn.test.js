import { BackgroundSaturn } from "../../src/entities/BackgroundSaturn.js";

describe("BackgroundSaturn constructor", () => {
  test("stores position", () => {
    const s = new BackgroundSaturn(400, 300);
    expect(s.x).toBe(400);
    expect(s.y).toBe(300);
  });

  test("starts with zero time and angle", () => {
    const s = new BackgroundSaturn(0, 0);
    expect(s._t).toBe(0);
    expect(s._angle).toBe(0);
  });
});

describe("BackgroundSaturn.update", () => {
  test("always returns true", () => {
    const s = new BackgroundSaturn(400, 300);
    expect(s.update(0.016)).toBe(true);
  });

  test("advances internal timer", () => {
    const s = new BackgroundSaturn(0, 0);
    s.update(0.5);
    expect(s._t).toBeCloseTo(0.5);
  });

  test("angle oscillates (non-zero after update)", () => {
    const s = new BackgroundSaturn(0, 0);
    s.update(0.1);
    expect(s._angle).not.toBe(0);
  });
});

describe("BackgroundSaturn.draw", () => {
  const scaleCtx = Object.assign({}, ctx, { scale: () => {} });

  test("does not throw", () => {
    const s = new BackgroundSaturn(400, 300);
    expect(() => s.draw(scaleCtx)).not.toThrow();
  });

  test("does not throw after update (angle non-zero)", () => {
    const s = new BackgroundSaturn(400, 300);
    s.update(1.0);
    expect(() => s.draw(scaleCtx)).not.toThrow();
  });
});
