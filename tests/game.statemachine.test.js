import { jest } from "@jest/globals";
import { Game, STATE } from "../src/Game.js";

function makeGame(state = STATE.PLAYING) {
  const g = new Game();
  g.state = state;
  g.particles = [];
  g.debris = [];
  return g;
}

/** Press a key for one frame: add to _pressed, call fn, then flush. */
function press(key, fn) {
  Input._pressed.add(key);
  fn();
  Input.flush();
}

afterEach(() => {
  Input._pressed.clear();
  Input._held.clear();
  jest.restoreAllMocks();
});

// ── START / GAMEOVER state ───────────────────────────────────────────────────

describe("_handleStartInput — START state", () => {
  test("Enter opens CONFIG and stores prev state", () => {
    const g = makeGame(STATE.START);
    press("Enter", () => g._updateStateInput());
    expect(g.state).toBe(STATE.CONFIG);
    expect(g._configPrevState).toBe(STATE.START);
  });

  test("C key also opens CONFIG", () => {
    const g = makeGame(STATE.START);
    press("KeyC", () => g._updateStateInput());
    expect(g.state).toBe(STATE.CONFIG);
  });

  test("returns true (update loop should not continue)", () => {
    const g = makeGame(STATE.START);
    expect(g._updateStateInput()).toBe(true);
  });

  test("GAMEOVER state behaves identically to START", () => {
    const g = makeGame(STATE.GAMEOVER);
    press("Enter", () => g._updateStateInput());
    expect(g.state).toBe(STATE.CONFIG);
  });
});

// ── HELP state ───────────────────────────────────────────────────────────────

describe("_handleHelpInput", () => {
  test("H key exits HELP and returns to PLAYING", () => {
    const g = makeGame(STATE.HELP);
    press("KeyH", () => g._updateStateInput());
    expect(g.state).toBe(STATE.PLAYING);
  });

  test("Escape also exits HELP", () => {
    const g = makeGame(STATE.HELP);
    press("Escape", () => g._updateStateInput());
    expect(g.state).toBe(STATE.PLAYING);
  });

  test("returns true (update loop should not continue)", () => {
    const g = makeGame(STATE.HELP);
    expect(g._updateStateInput()).toBe(true);
  });
});

// ── QUIT_CONFIRM state ───────────────────────────────────────────────────────

describe("_handleQuitConfirmInput", () => {
  test("Y key confirms quit → GAMEOVER", () => {
    const g = makeGame(STATE.QUIT_CONFIRM);
    press("KeyY", () => g._updateStateInput());
    expect(g.state).toBe(STATE.GAMEOVER);
  });

  test("Z key also confirms quit (QWERTZ layout)", () => {
    const g = makeGame(STATE.QUIT_CONFIRM);
    press("KeyZ", () => g._updateStateInput());
    expect(g.state).toBe(STATE.GAMEOVER);
  });

  test("N key cancels → PLAYING", () => {
    const g = makeGame(STATE.QUIT_CONFIRM);
    press("KeyN", () => g._updateStateInput());
    expect(g.state).toBe(STATE.PLAYING);
  });

  test("Escape cancels → PLAYING", () => {
    const g = makeGame(STATE.QUIT_CONFIRM);
    press("Escape", () => g._updateStateInput());
    expect(g.state).toBe(STATE.PLAYING);
  });

  test("returns true (update loop should not continue)", () => {
    const g = makeGame(STATE.QUIT_CONFIRM);
    expect(g._updateStateInput()).toBe(true);
  });
});

// ── PLAYING state ─────────────────────────────────────────────────────────────

describe("_handlePlayingInput", () => {
  test("Escape opens QUIT_CONFIRM", () => {
    const g = makeGame(STATE.PLAYING);
    press("Escape", () => g._updateStateInput());
    expect(g.state).toBe(STATE.QUIT_CONFIRM);
  });

  test("H key opens HELP overlay", () => {
    const g = makeGame(STATE.PLAYING);
    press("KeyH", () => g._updateStateInput());
    expect(g.state).toBe(STATE.HELP);
  });

  test("C key opens CONFIG (read-only from PLAYING)", () => {
    const g = makeGame(STATE.PLAYING);
    press("KeyC", () => g._updateStateInput());
    expect(g.state).toBe(STATE.CONFIG);
    expect(g._configPrevState).toBe(STATE.PLAYING);
  });

  test("returns false when no action key pressed (update continues)", () => {
    const g = makeGame(STATE.PLAYING);
    expect(g._updateStateInput()).toBe(false);
  });

  test("returns true and halts update when state transition fires", () => {
    const g = makeGame(STATE.PLAYING);
    press("Escape", () => {
      const result = g._updateStateInput();
      expect(result).toBe(true);
    });
  });
});

// ── CONFIG state ──────────────────────────────────────────────────────────────

describe("_handleConfigInput", () => {
  function inConfig(prevState = STATE.START) {
    const g = makeGame(STATE.CONFIG);
    g._configPrevState = prevState;
    g._configFocus = "mode";
    return g;
  }

  test("Escape returns to previous state", () => {
    const g = inConfig(STATE.START);
    press("Escape", () => g._updateStateInput());
    expect(g.state).toBe(STATE.START);
  });

  test("D key opens CONFIG_DETAIL", () => {
    const g = inConfig(STATE.START);
    press("KeyD", () => g._updateStateInput());
    expect(g.state).toBe(STATE.CONFIG_DETAIL);
  });

  test("Enter when mode focused starts game (not read-only)", () => {
    const g = inConfig(STATE.START);
    g._configFocus = "mode";
    jest.spyOn(g, "start").mockImplementation(() => {});
    press("Enter", () => g._updateStateInput());
    expect(g.start).toHaveBeenCalled();
  });

  test("Enter when in read-only mode returns to PLAYING", () => {
    const g = inConfig(STATE.PLAYING);
    g._configFocus = "mode";
    press("Enter", () => g._updateStateInput());
    expect(g.state).toBe(STATE.PLAYING);
  });

  test("ArrowDown shifts focus from mode to details", () => {
    const g = inConfig();
    press("ArrowDown", () => g._updateStateInput());
    expect(g._configFocus).toBe("details");
  });

  test("ArrowUp shifts focus from details back to mode", () => {
    const g = inConfig();
    g._configFocus = "details";
    press("ArrowUp", () => g._updateStateInput());
    expect(g._configFocus).toBe("mode");
  });

  test("mode changes are blocked in read-only (from PLAYING)", () => {
    const g = inConfig(STATE.PLAYING);
    const before = g.config.mode;
    press("ArrowRight", () => g._updateStateInput());
    expect(g.config.mode).toBe(before);
  });
});

// ── CONFIG_DETAIL state ───────────────────────────────────────────────────────

describe("_handleConfigDetailInput", () => {
  function inDetail(prevState = STATE.START) {
    const g = makeGame(STATE.CONFIG_DETAIL);
    g._configPrevState = prevState;
    g._detailCursor = 0;
    return g;
  }

  test("Escape returns to CONFIG", () => {
    const g = inDetail();
    press("Escape", () => g._updateStateInput());
    expect(g.state).toBe(STATE.CONFIG);
  });

  test("Enter also closes detail and returns to CONFIG", () => {
    const g = inDetail();
    press("Enter", () => g._updateStateInput());
    expect(g.state).toBe(STATE.CONFIG);
  });

  test("D key closes detail and returns to CONFIG", () => {
    const g = inDetail();
    press("KeyD", () => g._updateStateInput());
    expect(g.state).toBe(STATE.CONFIG);
  });

  test("ArrowDown advances cursor", () => {
    const g = inDetail();
    g._detailCursor = 0;
    press("ArrowDown", () => g._updateStateInput());
    expect(g._detailCursor).toBe(1);
  });

  test("cursor wraps around at the end", () => {
    const g = inDetail();
    const last = Object.keys(CONFIG_PARAMS).length - 1;
    g._detailCursor = last;
    press("ArrowDown", () => g._updateStateInput());
    expect(g._detailCursor).toBe(0);
  });

  test("ArrowRight increments the focused config value", () => {
    const g = inDetail();
    g._detailCursor = 0; // first param: bulletRange
    const before = g.config.bulletRange;
    if (before < CONFIG_PARAMS.bulletRange.max) {
      press("ArrowRight", () => g._updateStateInput());
      expect(g.config.bulletRange).toBe(before + 1);
    }
  });

  test("value cannot exceed its max", () => {
    const g = inDetail();
    g._detailCursor = 0;
    g.config.bulletRange = CONFIG_PARAMS.bulletRange.max;
    press("ArrowRight", () => g._updateStateInput());
    expect(g.config.bulletRange).toBe(CONFIG_PARAMS.bulletRange.max);
  });

  test("value cannot go below 1", () => {
    const g = inDetail();
    g._detailCursor = 0;
    g.config.bulletRange = 1;
    press("ArrowLeft", () => g._updateStateInput());
    expect(g.config.bulletRange).toBe(1);
  });

  test("changes are blocked in read-only (from PLAYING)", () => {
    const g = inDetail(STATE.PLAYING);
    const before = g.config.bulletRange;
    press("ArrowRight", () => g._updateStateInput());
    expect(g.config.bulletRange).toBe(before);
  });
});

// ── Level-scaling helpers ─────────────────────────────────────────────────────

describe("Game._asteroidsForLevel", () => {
  test("level 1 spawns INITIAL_ROCKS", () => {
    const g = makeGame();
    g.level = 1;
    expect(g._asteroidsForLevel()).toBe(Math.min(INITIAL_ROCKS, MAX_ROCKS_PER_LEVEL));
  });

  test("count grows with level", () => {
    const g = makeGame();
    g.level = 2;
    const l2 = g._asteroidsForLevel();
    g.level = 3;
    const l3 = g._asteroidsForLevel();
    expect(l3).toBeGreaterThan(l2);
  });

  test("caps at MAX_ROCKS_PER_LEVEL", () => {
    const g = makeGame();
    g.level = 9999;
    expect(g._asteroidsForLevel()).toBe(MAX_ROCKS_PER_LEVEL);
  });
});

describe("Game._solarCountForLevel", () => {
  test("returns 1 at SOLAR_START_LEVEL", () => {
    const g = makeGame();
    g.level = SOLAR_START_LEVEL;
    expect(g._solarCountForLevel()).toBe(1);
  });

  test("increases every 2 levels", () => {
    const g = makeGame();
    g.level = SOLAR_START_LEVEL;
    const base = g._solarCountForLevel();
    g.level = SOLAR_START_LEVEL + 2;
    expect(g._solarCountForLevel()).toBe(base + 1);
  });

  test("caps at SOLAR_MAX_COUNT", () => {
    const g = makeGame();
    g.level = 9999;
    expect(g._solarCountForLevel()).toBe(SOLAR_MAX_COUNT);
  });
});

describe("Game._turretCountForLevel", () => {
  test("returns 1 at TURRET_START_LEVEL", () => {
    const g = makeGame();
    g.level = TURRET_START_LEVEL;
    expect(g._turretCountForLevel()).toBe(1);
  });

  test("increments by 1 per level", () => {
    const g = makeGame();
    g.level = TURRET_START_LEVEL + 1;
    expect(g._turretCountForLevel()).toBe(2);
  });

  test("caps at TURRET_MAX_COUNT", () => {
    const g = makeGame();
    g.level = 9999;
    expect(g._turretCountForLevel()).toBe(TURRET_MAX_COUNT);
  });
});
