import { Sound } from "../../src/entities/Sound.js";

// AudioContext is not available in the test environment — Sound disables itself gracefully.
// All tests verify that the public API does not throw when ac === null.

function makeSound() {
  return new Sound();
}

describe("Sound constructor", () => {
  test("sets ac to null when AudioContext is unavailable", () => {
    const s = makeSound();
    expect(s.ac).toBeNull();
  });
});

describe("Sound methods (audio disabled)", () => {
  const METHODS = [
    ["shoot", []],
    ["explodeLarge", []],
    ["explodeMed", []],
    ["explodeSmall", []],
    ["shipDie", []],
    ["throb", [0]],
    ["throb", [1]],
    ["extraLife", []],
    ["levelUp", []],
    ["ufoHum", []],
    ["powerUp", ["shield"]],
    ["powerUp", ["rapid"]],
    ["powerUp", ["spread"]],
  ];

  for (const [method, args] of METHODS) {
    test(`${method}(${args.join(", ")}) does not throw`, () => {
      const s = makeSound();
      expect(() => s[method](...args)).not.toThrow();
    });
  }
});

describe("Sound.ufoHum phase toggle", () => {
  test("alternates _ufoPhase between calls", () => {
    const s = makeSound();
    expect(s._ufoPhase).toBe(false);
    s.ufoHum();
    expect(s._ufoPhase).toBe(true);
    s.ufoHum();
    expect(s._ufoPhase).toBe(false);
  });
});
