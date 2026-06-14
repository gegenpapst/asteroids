"use strict";

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

global.document = {
  getElementById: () => canvasStub,
  createElement: () => canvasStub,
};
global.window = {
  addEventListener: noOp,
  innerWidth: 800,
  innerHeight: 600,
};

// Entities reference globals (rand, wrap, W, H, ASTEROID_RADIUS …) as bare names
// rather than imports — mirroring the browser's shared script scope.
const u = require("../src/utils.js");
Object.assign(global, u);
const g = require("../src/Globals.js");
Object.assign(global, g);
global.ctx = ctxStub;

// Matter.js stub — keeps entity constructors working without the real physics engine
const _mkBody = (x = 0, y = 0) => ({
  position: { x, y },
  velocity: { x: 0, y: 0 },
  angle: 0,
  plugin: {},
});
global.Matter = {
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
global.MatterWrap = {};
