---
name: config-change
description: >
  Make a change to the config screen in the Asteroids project — add a new
  setting, change keyboard navigation, fix focus behavior, adjust layout, or
  modify the detail dialog. Use this skill whenever the user mentions the
  config/settings screen, difficulty selection, the detail dialog, or anything
  about how the game options are presented or navigated, even if they just say
  "the options screen" or "the settings".
---

# Config Change Skill

The config screen has two states:

| State | Description |
|---|---|
| `CONFIG` | Main screen — mode tiles (Beginner/Novice/Expert) + Details button |
| `CONFIG_DETAIL` | Detail dialog — tunable parameters (bullet range, asteroid bounce, etc.) |

Focus is tracked in `this._configFocus` (`"mode"` or `"details"`).
Cursor position within the detail list is `this._detailCursor`.

## Step 1 — Identify the scope

Determine which state(s) are affected:

- **Navigation / focus change** → `_updateStateInput()` in `Game.js`, check `CONFIG` and/or `CONFIG_DETAIL` blocks
- **New tunable parameter** → `Globals.js` + `config` default + `_drawConfigDetail` + CONFIG_DETAIL input block
- **Visual / layout change** → `_drawConfig()` or `_drawConfigDetail()` in `Game.js`
- **Hint text** → bottom of `_drawConfig()`, the `hint` variable

## Step 2 — Adding a new tunable parameter

If the change adds a new setting that the player can adjust in the detail dialog:

1. **`src/Globals.js`** — add a named constant for the default value and valid range:
   ```js
   const MY_SETTING_DEFAULT = 3;
   const MY_SETTING_MAX     = 5;
   ```

2. **`Game.js` — `config` object** (near the top of the constructor) — add the default:
   ```js
   this.config = {
     // ...existing...
     mySetting: MY_SETTING_DEFAULT,
   };
   ```

3. **`Game.js` — `params` array in `_updateStateInput()` CONFIG_DETAIL block** — add an entry so ArrowLeft/Right adjusts it:
   ```js
   const params    = ["bulletRange", "asteroidBounce", "mySetting"];
   const paramMax  = { bulletRange: 5, asteroidBounce: 3, mySetting: MY_SETTING_MAX };
   ```

4. **`Game.js` — `_drawConfigDetail()`** — add a row in the `params.forEach` display list:
   ```js
   { key: "mySetting", label: "My Setting", descriptions: ["Low", "Medium", "High", "Very high", "Max"] }
   ```

5. Apply the new setting wherever it is consumed in game logic.

## Step 3 — Navigation or focus changes

The focus and cursor variables that drive CONFIG navigation:

| Variable | Type | Purpose |
|---|---|---|
| `_configFocus` | `"mode"` \| `"details"` | Which element is highlighted on the CONFIG screen |
| `_configCursor` | number | Currently unused for mode tiles but reserved |
| `_detailCursor` | number | Selected row index in CONFIG_DETAIL |

When changing navigation behaviour, trace the full key-press flow:

1. Find the input block for the relevant state in `_updateStateInput()`.
2. Check every `Input.wasPressed(...)` branch — `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, `Escape`, `KeyD`, `KeyC`.
3. Update the focus/cursor assignment to match the new intended behaviour.
4. Update the hint text in `_drawConfig()` to reflect what the keys now do.

## Step 4 — Update hint text

The hint at the bottom of the config screen is a single string in `_drawConfig()`:

```js
const hint = readOnly
  ? "..."
  : detailsFocused
    ? "← →  Mode   ENTER  Open details   ↑  Mode focus   ESC  Cancel"
    : "← →  Mode   ↓  Details   ENTER  Start game";
```

Keep it concise and accurate. Reflect any key-binding changes here.

## Step 5 — Run Prettier

```
npx prettier --write src/Globals.js src/Game.js
```

## Step 6 — Verify manually

Open `index.html` in a browser and run through this sequence:

1. Press Enter on the start screen → CONFIG opens, a mode tile is highlighted.
2. Arrow Left/Right → mode changes.
3. Arrow Down → Details button is highlighted.
4. Enter → CONFIG_DETAIL opens.
5. Arrow Up/Down → cursor moves through parameters.
6. Arrow Left/Right → value changes, stays within bounds.
7. Escape (or Enter or D) → returns to CONFIG, mode tile is highlighted again.
8. Enter → game starts immediately.
9. ESC from CONFIG → returns to START without changing settings.

If the change introduced a new setting: confirm the value is actually applied in gameplay.
