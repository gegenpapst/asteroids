"use strict";

const TAU = Math.PI * 2;

function rand(a, b) {
  return Math.random() * (b - a) + a;
}
function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}
function wrap(v, max) {
  return ((v % max) + max) % max;
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function dist(a, b) {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
// Random angle that does NOT fall into the forbidden backward cone.
// forbidCenter = bulletAngle + π (direction back toward the ship)
// halfArc = half the width of the forbidden sector (default: 60° → 120° blocked)
function safeSplitAngle(bulletAngle, halfArc = Math.PI / 4) {
  if (bulletAngle === null || bulletAngle === undefined) return rand(0, TAU);
  const forbidCenter = bulletAngle + Math.PI;
  const available = TAU - 2 * halfArc;
  return wrap(forbidCenter + halfArc + Math.random() * available, TAU);
}

if (typeof module !== "undefined")
  module.exports = { TAU, rand, randInt, wrap, clamp, dist, safeSplitAngle };
