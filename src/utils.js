export const W = 800;
export const H = 600;

export const TAU = Math.PI * 2;

export function rand(a, b) {
  return Math.random() * (b - a) + a;
}
export function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}
export function wrap(v, max) {
  return ((v % max) + max) % max;
}
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
export function dist(a, b) {
  const dx = a.x - b.x,
    dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
// Random angle that does NOT fall into the forbidden backward cone.
// forbidCenter = bulletAngle + π (direction back toward the ship)
// halfArc = half the width of the forbidden sector (default: 60° → 120° blocked)
export function safeSplitAngle(bulletAngle, halfArc = Math.PI / 4) {
  if (bulletAngle === null || bulletAngle === undefined) return rand(0, TAU);
  const forbidCenter = bulletAngle + Math.PI;
  const available = TAU - 2 * halfArc;
  return wrap(forbidCenter + halfArc + Math.random() * available, TAU);
}
