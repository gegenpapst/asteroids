import { Input } from "../src/input.js";

// Input is a singleton — reset held/pressed state before each test.
beforeEach(() => {
  Input._held.clear();
  Input._pressed.clear();
});

describe("Input.isHeld", () => {
  test("returns false when key is not held", () => {
    expect(Input.isHeld("Space")).toBe(false);
  });

  test("returns true when key is in _held", () => {
    Input._held.add("Space");
    expect(Input.isHeld("Space")).toBe(true);
  });
});

describe("Input.wasPressed", () => {
  test("returns false when key not in _pressed", () => {
    expect(Input.wasPressed("Enter")).toBe(false);
  });

  test("returns true when key is in _pressed", () => {
    Input._pressed.add("Enter");
    expect(Input.wasPressed("Enter")).toBe(true);
  });
});

describe("Input.flush", () => {
  test("clears _pressed set", () => {
    Input._pressed.add("Space");
    Input._pressed.add("Enter");
    Input.flush();
    expect(Input._pressed.size).toBe(0);
  });

  test("does not clear _held", () => {
    Input._held.add("ArrowUp");
    Input.flush();
    expect(Input.isHeld("ArrowUp")).toBe(true);
  });
});

describe("Input directional helpers", () => {
  test("left() returns true for ArrowLeft without shift", () => {
    Input._held.add("ArrowLeft");
    expect(Input.left()).toBe(true);
  });

  test("left() returns false when Shift is held (strafe mode)", () => {
    Input._held.add("ArrowLeft");
    Input._held.add("ShiftLeft");
    expect(Input.left()).toBe(false);
  });

  test("right() returns true for KeyD without shift", () => {
    Input._held.add("KeyD");
    expect(Input.right()).toBe(true);
  });

  test("right() returns false when ShiftRight is held", () => {
    Input._held.add("KeyD");
    Input._held.add("ShiftRight");
    expect(Input.right()).toBe(false);
  });

  test("up() returns true for ArrowUp", () => {
    Input._held.add("ArrowUp");
    expect(Input.up()).toBe(true);
  });

  test("up() returns true for KeyW", () => {
    Input._held.add("KeyW");
    expect(Input.up()).toBe(true);
  });

  test("fire() returns true for Space", () => {
    Input._held.add("Space");
    expect(Input.fire()).toBe(true);
  });

  test("fire() returns true for KeyZ", () => {
    Input._held.add("KeyZ");
    expect(Input.fire()).toBe(true);
  });
});

describe("Input one-shot actions", () => {
  test("start() returns true for Enter pressed", () => {
    Input._pressed.add("Enter");
    expect(Input.start()).toBe(true);
  });

  test("start() returns true for Space pressed", () => {
    Input._pressed.add("Space");
    expect(Input.start()).toBe(true);
  });

  test("help() returns true for KeyH pressed", () => {
    Input._pressed.add("KeyH");
    expect(Input.help()).toBe(true);
  });

  test("config() returns true for KeyC pressed", () => {
    Input._pressed.add("KeyC");
    expect(Input.config()).toBe(true);
  });

  test("teleport() returns true for KeyS pressed", () => {
    Input._pressed.add("KeyS");
    expect(Input.teleport()).toBe(true);
  });

  test("teleport() returns true for ArrowDown pressed", () => {
    Input._pressed.add("ArrowDown");
    expect(Input.teleport()).toBe(true);
  });
});

describe("Input strafe helpers", () => {
  test("strafeLeft() true when Shift+ArrowLeft", () => {
    Input._held.add("ShiftLeft");
    Input._held.add("ArrowLeft");
    expect(Input.strafeLeft()).toBe(true);
  });

  test("strafeLeft() false without Shift", () => {
    Input._held.add("ArrowLeft");
    expect(Input.strafeLeft()).toBe(false);
  });

  test("strafeRight() true when Shift+KeyD", () => {
    Input._held.add("ShiftRight");
    Input._held.add("KeyD");
    expect(Input.strafeRight()).toBe(true);
  });

  test("strafeRight() false without Shift", () => {
    Input._held.add("KeyD");
    expect(Input.strafeRight()).toBe(false);
  });
});
