'use strict';

// Canvas 2D context stub — just enough for globals.js to load without throwing
const ctxStub = {};
for (const m of [
  'save', 'restore', 'translate', 'rotate', 'scale', 'beginPath', 'moveTo',
  'lineTo', 'closePath', 'stroke', 'fill', 'fillRect', 'clearRect', 'arc',
  'fillText', 'strokeText', 'setLineDash', 'setTransform',
]) {
  ctxStub[m] = () => {};
}
ctxStub.measureText          = () => ({ width: 0 });
ctxStub.createLinearGradient = () => ({ addColorStop: () => {} });
ctxStub.createRadialGradient = () => ({ addColorStop: () => {} });

const canvasStub = { getContext: () => ctxStub, width: 0, height: 0, style: {} };

global.document = {
  getElementById: () => canvasStub,
  createElement:  () => canvasStub,
};
global.window = {
  addEventListener: () => {},
  innerWidth:  800,
  innerHeight: 600,
};

// Load globals.js and expose every export as a global so entity classes can
// reference rand, wrap, W, H, ASTEROID_RADIUS, etc. without require()
const g = require('../src/globals.js');
Object.assign(global, g);
global.ctx = ctxStub;
