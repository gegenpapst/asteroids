import { RockCluster } from "../../src/entities/RockCluster.js";

describe("RockCluster constructor", () => {
  test("position is set from constructor arguments", () => {
    const r = new RockCluster(150, 250);
    expect(r.x).toBe(150);
    expect(r.y).toBe(250);
  });

  test("radius is within the cluster range", () => {
    for (let i = 0; i < 20; i++) {
      const r = new RockCluster(0, 0);
      expect(r.radius).toBeGreaterThanOrEqual(ROCK_CLUSTER_RADIUS_MIN);
      expect(r.radius).toBeLessThanOrEqual(ROCK_CLUSTER_RADIUS_MAX);
    }
  });

  test("pre-bakes an offscreen canvas", () => {
    expect(new RockCluster(0, 0)._offCanvas).toBeDefined();
  });

  test("has a Matter body", () => {
    expect(new RockCluster(10, 20).body).toBeDefined();
  });
});

describe("RockCluster.collisionRadius", () => {
  test("scales radius by the collision factor", () => {
    const r = new RockCluster(0, 0);
    expect(r.collisionRadius).toBeCloseTo(r.radius * CLUSTER_COLLISION_FACTOR);
  });
});
