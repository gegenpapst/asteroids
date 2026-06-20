import { Debris } from "../../src/entities/Debris.js";

function makeDebris(x = 400, y = 300, vx = 0, vy = 0) {
  return new Debris(x, y, vx, vy);
}

describe("Debris constructor", () => {
  test("stores initial position", () => {
    const d = makeDebris(100, 200);
    expect(d.x).toBe(100);
    expect(d.y).toBe(200);
  });

  test("radius is within expected range", () => {
    for (let i = 0; i < 20; i++) {
      const d = makeDebris();
      expect(d.radius).toBeGreaterThanOrEqual(DEBRIS_RADIUS_MIN);
      expect(d.radius).toBeLessThanOrEqual(DEBRIS_RADIUS_MAX);
    }
  });

  test("life equals maxLife on construction", () => {
    const d = makeDebris();
    expect(d.life).toBe(d.maxLife);
    expect(d.life).toBe(DEBRIS_LIFE);
  });

  test("color is a valid hsl string", () => {
    const d = makeDebris();
    expect(d.color).toMatch(/^hsl\(\d+,\d+%,\d+%\)$/);
  });

  test("creates a Matter body", () => {
    const d = makeDebris();
    expect(d.body).toBeDefined();
    expect(d.body.position).toBeDefined();
  });
});

describe("Debris.update", () => {
  test("decrements life by dt", () => {
    const d = makeDebris();
    d.update(0.1);
    expect(d.life).toBeCloseTo(DEBRIS_LIFE - 0.1);
  });

  test("returns true while alive", () => {
    const d = makeDebris();
    expect(d.update(0.016)).toBe(true);
  });

  test("returns false when life reaches 0", () => {
    const d = makeDebris();
    expect(d.update(DEBRIS_LIFE + 0.1)).toBe(false);
  });

  test("syncs x/y from body position after update", () => {
    const d = makeDebris(50, 50);
    d.body.position.x = 55;
    d.body.position.y = 60;
    d.update(0.016);
    expect(d.x).toBe(55);
    expect(d.y).toBe(60);
  });

  test("bounces off left wall and corrects position", () => {
    const d = makeDebris();
    d.body.position.x = d.radius - 1;
    d.body.velocity.x = -50;
    d.update(0.016);
    expect(d.body.velocity.x).toBeGreaterThan(0);
    expect(d.body.position.x).toBeGreaterThanOrEqual(d.radius);
  });

  test("bounces off right wall and corrects position", () => {
    const d = makeDebris();
    d.body.position.x = W - d.radius + 1;
    d.body.velocity.x = 50;
    d.update(0.016);
    expect(d.body.velocity.x).toBeLessThan(0);
    expect(d.body.position.x).toBeLessThanOrEqual(W - d.radius);
  });

  test("bounces off top wall and corrects position", () => {
    const d = makeDebris();
    d.body.position.y = d.radius - 1;
    d.body.velocity.y = -50;
    d.update(0.016);
    expect(d.body.velocity.y).toBeGreaterThan(0);
    expect(d.body.position.y).toBeGreaterThanOrEqual(d.radius);
  });

  test("bounces off bottom wall and corrects position", () => {
    const d = makeDebris();
    d.body.position.y = H - d.radius + 1;
    d.body.velocity.y = 50;
    d.update(0.016);
    expect(d.body.velocity.y).toBeLessThan(0);
    expect(d.body.position.y).toBeLessThanOrEqual(H - d.radius);
  });

  test("does not bounce when inside bounds", () => {
    const d = makeDebris(400, 300);
    d.body.velocity.x = 10;
    d.body.velocity.y = -10;
    d.update(0.016);
    expect(d.body.velocity.x).toBe(10);
    expect(d.body.velocity.y).toBe(-10);
  });
});

describe("Debris.draw", () => {
  test("does not throw", () => {
    const d = makeDebris();
    expect(() => d.draw(ctx)).not.toThrow();
  });

  test("draw of expired debris (life=0) does not throw", () => {
    const d = makeDebris();
    d.life = 0;
    expect(() => d.draw(ctx)).not.toThrow();
  });
});
