import { PowerUp } from "../../src/entities/PowerUp.js";

const TYPES = ["shield", "rapid", "spread", "heavy"];

describe("PowerUp constructor", () => {
  test("stores position and type", () => {
    const p = new PowerUp(100, 200, "shield");
    expect(p.x).toBe(100);
    expect(p.y).toBe(200);
    expect(p.type).toBe("shield");
  });

  test("life starts at 8", () => {
    expect(new PowerUp(0, 0, "rapid").life).toBe(8.0);
  });

  test("radius is 12", () => {
    expect(new PowerUp(0, 0, "spread").radius).toBe(12);
  });

  test("rotSpeed is positive", () => {
    expect(new PowerUp(0, 0, "heavy").rotSpeed).toBeGreaterThan(0);
  });
});

describe("PowerUp.update", () => {
  test("decrements life by dt", () => {
    const p = new PowerUp(0, 0, "shield");
    p.update(0.5);
    expect(p.life).toBeCloseTo(7.5);
  });

  test("returns true while alive", () => {
    const p = new PowerUp(0, 0, "rapid");
    expect(p.update(0.1)).toBe(true);
  });

  test("returns false when expired", () => {
    const p = new PowerUp(0, 0, "spread");
    expect(p.update(9.0)).toBe(false);
  });

  test("advances rotation by rotSpeed * dt", () => {
    const p = new PowerUp(0, 0, "heavy");
    const before = p.rot;
    p.update(1.0);
    expect(p.rot).toBeCloseTo(before + p.rotSpeed);
  });

  test("wraps x position at world edge", () => {
    const p = new PowerUp(WW - 1, 0, "shield");
    p.vx = 200;
    p.update(1.0);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x).toBeLessThan(WW);
  });
});

describe("PowerUp.draw", () => {
  for (const type of TYPES) {
    test(`does not throw for type "${type}"`, () => {
      const p = new PowerUp(100, 100, type);
      expect(() => p.draw(ctx)).not.toThrow();
    });
  }
});
