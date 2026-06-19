export const Input = {
  _held: new Set(),
  _pressed: new Set(),

  init() {
    window.addEventListener("keydown", (e) => {
      if (!this._held.has(e.code)) this._pressed.add(e.code);
      this._held.add(e.code);
      const block = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (block.includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this._held.delete(e.code));
  },

  isHeld(code) {
    return this._held.has(code);
  },
  wasPressed(code) {
    return this._pressed.has(code);
  },
  flush() {
    this._pressed.clear();
  },

  _shift() {
    return this.isHeld("ShiftLeft") || this.isHeld("ShiftRight");
  },

  left() {
    return !this._shift() && (this.isHeld("ArrowLeft") || this.isHeld("KeyA"));
  },
  right() {
    return !this._shift() && (this.isHeld("ArrowRight") || this.isHeld("KeyD"));
  },
  up() {
    return this.isHeld("ArrowUp") || this.isHeld("KeyW");
  },
  fire() {
    return this.isHeld("Space") || this.isHeld("KeyZ");
  },
  start() {
    return this.wasPressed("Enter") || this.wasPressed("Space");
  },
  help() {
    return this.wasPressed("KeyH");
  },
  config() {
    return this.wasPressed("KeyC");
  },
  teleport() {
    return this.wasPressed("KeyS") || this.wasPressed("ArrowDown");
  },
  strafeLeft() {
    return this._shift() && (this.isHeld("ArrowLeft") || this.isHeld("KeyA"));
  },
  strafeRight() {
    return this._shift() && (this.isHeld("ArrowRight") || this.isHeld("KeyD"));
  },
};
