'use strict';

const noOp = () => {};
const ctxStub = Object.fromEntries([
    'save', 'restore', 'translate', 'rotate', 'scale', 'beginPath', 'moveTo',
    'lineTo', 'closePath', 'stroke', 'fill', 'fillRect', 'clearRect', 'arc',
    'fillText', 'strokeText', 'setLineDash', 'setTransform',
].map(m => [m, noOp]));
ctxStub.measureText          = () => ({ width: 0 });
ctxStub.createLinearGradient = () => ({ addColorStop: noOp });
ctxStub.createRadialGradient = () => ({ addColorStop: noOp });

const canvasStub = { getContext: () => ctxStub, width: 0, height: 0, style: {} };

global.document = {
    getElementById: () => canvasStub,
    createElement:  () => canvasStub,
};
global.window = {
    addEventListener: noOp,
    innerWidth:  800,
    innerHeight: 600,
};

// Entities reference globals (rand, wrap, W, H, ASTEROID_RADIUS …) as bare names
// rather than imports — mirroring the browser's shared script scope.
const g = require('../src/Globals.js');
Object.assign(global, g);
global.ctx = ctxStub;
