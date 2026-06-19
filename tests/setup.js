const noOp = () => {};
const ctxStub = Object.fromEntries(
  [
    "save",
    "restore",
    "translate",
    "rotate",
    "scale",
    "beginPath",
    "moveTo",
    "lineTo",
    "closePath",
    "stroke",
    "fill",
    "fillRect",
    "clearRect",
    "arc",
    "fillText",
    "strokeText",
    "setLineDash",
    "setTransform",
    "drawImage",
  ].map((m) => [m, noOp]),
);
ctxStub.measureText = () => ({ width: 0 });
ctxStub.createLinearGradient = () => ({ addColorStop: noOp });
ctxStub.createRadialGradient = () => ({ addColorStop: noOp });

const canvasStub = {
  getContext: () => ctxStub,
  width: 0,
  height: 0,
  style: {},
};

globalThis.document = {
  getElementById: () => canvasStub,
  createElement: () => canvasStub,
  lastModified: "",
};
globalThis.window = {
  addEventListener: noOp,
  innerWidth: 800,
  innerHeight: 600,
};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };

// Matter.js stub — keeps entity constructors working without the real physics engine
const _mkBody = (x = 0, y = 0) => ({
  position: { x, y },
  velocity: { x: 0, y: 0 },
  angle: 0,
  plugin: {},
});
globalThis.Matter = {
  use: () => {},
  Engine: { create: () => ({ world: {} }), update: () => {} },
  World: { add: () => {}, remove: () => {}, clear: () => {} },
  Bodies: {
    circle: (x, y) => _mkBody(x, y),
    fromVertices: (x, y, _verts, opts) => Object.assign(_mkBody(x, y), opts || {}),
  },
  Body: {
    create: (opts) => {
      const b = _mkBody(0, 0);
      b.parts = opts.parts ?? [b];
      return b;
    },
    setVelocity: (b, v) => {
      b.velocity.x = v.x;
      b.velocity.y = v.y;
    },
    setAngularVelocity: () => {},
    setPosition: (b, p) => {
      b.position.x = p.x;
      b.position.y = p.y;
    },
    setAngle: () => {},
    setMass: () => {},
    set: (b, k, v) => {
      b[k] = v;
    },
  },
  Constraint: { create: (opts) => ({ ...opts }) },
  Events: { on: () => {} },
};
globalThis.MatterWrap = {};
globalThis.ctx = ctxStub;

// Spread utils and Globals onto globalThis so test code can access bare names
// (W, H, rand, wrap, ASTEROID_RADIUS, BULLET_LIFE, etc.) without explicit imports.
// canvas.js is not loaded in tests; W/H come from utils.js directly.
const utils = await import("../src/utils.js");
Object.assign(globalThis, utils);
const globals = await import("../src/Globals.js");
Object.assign(globalThis, globals);
const { Input } = await import("../src/input.js");
globalThis.Input = Input;
