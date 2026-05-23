"use strict";

// ─── Canvas setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const W = 800;
const H = 600;
canvas.width = W;
canvas.height = H;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}
fitCanvas();
window.addEventListener("resize", fitCanvas);

// ─── Constants ───────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;

const SHIP_SIZE = 14;
const SHIP_THRUST = 260;
const SHIP_MAX_SPEED = 460;
const SHIP_STRAFE_SPEED = 180;
const SHIP_STRAFE_ACCEL = 500;
const SHIP_ROTATION = 3.5;
const SHIP_FRICTION = 0.985;
const SHIP_MIN_SPEED = 5;
const SHIP_HULL_FACTOR = 0.7; // radius getter: SHIP_SIZE × FACTOR
const SHIP_SHIELD_FACTOR = 2.2; // hitRadius + Shield-Bubble Visual: SHIP_SIZE × FACTOR

const BULLET_SPEED = 560;
const BULLET_LIFE = 0.65;
const MAX_BULLETS = 8;
const FIRE_RATE = 0.22;
const BULLET_SPREAD_ANGLE = 0.26; // 3-Schuss-Spread (rad), seitliche Bullets

const INVULNERABLE_TIME = 3.0;

const ASTEROID_RADIUS = [48, 26, 13];
const ASTEROID_SPEED = [55, 95, 148];
const ASTEROID_SCORE = [20, 50, 100];
const ASTEROID_MASS = [10, 3.5, 1.0]; // Massen für massenbasierte Matter-Kollisionen (size 0–2)
const ASTEROID_SPIN_FACTOR = 0.065; // Off-Center-Hit Spin-Boost: ±rad/s pro px Hebelarm

// ── Pendel-Asteroiden ───────────────────────────────────────────────────────
const PENDULUM_STIFFNESS = 0.03; // Federkonstante des Constraints (0 = frei, 1 = starr)
const PENDULUM_DAMPING = 0.01; // leichte Dämpfung für numerische Stabilität
const PENDULUM_TETHER_MIN = 100; // min. Seillänge px bei Spawn
const PENDULUM_TETHER_MAX = 180; // max. Seillänge px bei Spawn
const PENDULUM_INIT_SPEED = 90; // initiale Tangentialgeschwindigkeit px/s
const PENDULUM_MAX_COUNT = 3; // max. gleichzeitig aktive Pendel-Asteroiden
const PENDULUM_START_LEVEL = 1; // ab diesem Level erscheinen Pendel-Asteroiden

const INITIAL_ROCKS = 4;
const MAX_ROCKS_PER_LEVEL = 10;
const EXTRA_LIFE_SCORE = 10000;

const PARTICLE_LIFE = 0.85;
const PARTICLE_SPEED = 170;

// ── Metaball-Rendering ──────────────────────────────────────────────────────
// Geteilt zwischen ClusterAsteroid, RockCluster (via Metaball.js Utility).
const METABALL_HEX_PACKING = Math.sqrt(3) / 2; // 0.866 — Hex-Reihen-Höhe / spacing
const METABALL_DEFAULT_CONTRAST = 14; // contrast()-Filter-Stärke
const METABALL_DEFAULT_BLUR_RATIO = 0.75; // Blur als Faktor von cellR
const METABALL_DRAW_BLOAT = 1.25; // Beim Zeichnen werden Cells etwas größer gemalt
const METABALL_SPACING_RATIO = 1.65; // Default Hex-Zell-Abstand
const METABALL_CELL_JITTER = 1.5; // Positions-Jitter in Pixel
const METABALL_CELL_SIZE_JITTER = 0.15; // ±-Bereich für Zellgrößen-Variation
const CLUSTER_CELL_FACTOR = 0.24; // Cell-Radius = radius × FACTOR (Asteroid/Rock)
const CLUSTER_COLLISION_FACTOR = 0.65; // collisionRadius = radius × FACTOR

// ── Pumice (Bimsstein) ──────────────────────────────────────────────────────
// Pumice-Cluster: einzelne Zellen mit eigenen Matter-Bodies, dynamisch zerstörbar.
const PUMICE_RADIUS_MIN = 22;
const PUMICE_RADIUS_MAX = 54;
const PUMICE_CELL_FACTOR = 0.2; // Cell-Radius = radius × FACTOR
const PUMICE_SPACING_FACTOR = 1.55; // Hex-Zell-Abstand (kompakter als Default)
const PUMICE_BLUR_FACTOR = 0.68; // Blur als Faktor von cellR
const PUMICE_CONTRAST = 13; // contrast()-Stärke (schärfere Kante als Default 14)
const PUMICE_NEIGHBOR_FACTOR = 2.5; // cullIsolated-Threshold = cellR × FACTOR
const PUMICE_COLLISION_FACTOR = 0.75; // collisionRadius = radius × FACTOR

// PumicePoly (Polygon-Variante)
const PUMICE_POLY_RADIUS_MIN = 28;
const PUMICE_POLY_RADIUS_MAX = 50;

// Rocks (statische Polygon- bzw. Cluster-Hindernisse)
const ROCK_POLY_RADIUS_MIN = 22;
const ROCK_POLY_RADIUS_MAX = 54;
const ROCK_CLUSTER_RADIUS_MIN = 25;
const ROCK_CLUSTER_RADIUS_MAX = 55;

const UFO_RADIUS = [22, 11];
const UFO_SPEED = [90, 130];
const UFO_SCORE = [200, 1000];

const POWERUP_DURATION = 5.0;
const POWERUP_SPAWN_CHANCE = 0.12;
const POWERUP_TYPES = ["shield", "rapid", "spread", "heavy"];

// ── Debris (Trümmer beim Asteroid-Tod) ──────────────────────────────────────
const DEBRIS_LIFE = 2.0; // Lebensdauer in Sekunden
const DEBRIS_SPEED_MIN = 60; // Mindest-Startgeschwindigkeit (px/s)
const DEBRIS_SPEED_MAX = 210; // Max-Startgeschwindigkeit (px/s)
const DEBRIS_COUNT_MIN = 3; // Mindestanzahl Trümmer pro Explosion
const DEBRIS_COUNT_MAX = 5; // Maximalanzahl
const DEBRIS_RADIUS_MIN = 2.5; // Kleinster Trümmer-Radius (px)
const DEBRIS_RADIUS_MAX = 5.0; // Größter Trümmer-Radius (px)
const DEBRIS_FRICTION_AIR = 0.018; // Luftreibung für Matter-Body

// Rock count is controlled by the in-game config dialog (3 levels)

// ─── Utilities ───────────────────────────────────────────────────────────────
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
// Zufälliger Winkel der NICHT in den verbotenen Rückwärts-Kegel fällt.
// forbidCenter = bulletAngle + π (Richtung zurück zum Schiff)
// halfArc = halbe Tortenbreite des verbotenen Bereichs (Standard: 60° → 120° gesperrt)
function safeSplitAngle(bulletAngle, halfArc = Math.PI / 4) {
  if (bulletAngle === null || bulletAngle === undefined) return rand(0, TAU);
  const forbidCenter = bulletAngle + Math.PI;
  const available = TAU - 2 * halfArc;
  return wrap(forbidCenter + halfArc + Math.random() * available, TAU);
}

// ─── Static star field ───────────────────────────────────────────────────────
const STARS = Array.from({ length: 90 }, () => ({
  x: rand(0, W),
  y: rand(0, H),
  r: rand(0.4, 1.6),
  a: rand(0.15, 0.75),
  phase: rand(0, TAU),
}));

// ─── Pre-rendered background ─────────────────────────────────────────────────
const bgCanvas = document.createElement("canvas");
bgCanvas.width = W;
bgCanvas.height = H;
(function () {
  const bc = bgCanvas.getContext("2d");
  const g = bc.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#000010");
  g.addColorStop(0.5, "#0a0018");
  g.addColorStop(1, "#000510");
  bc.fillStyle = g;
  bc.fillRect(0, 0, W, H);
  const nebulae = [
    { x: 180, y: 140, r: 220, c: "80,40,180" },
    { x: 620, y: 400, r: 190, c: "30,20,140" },
    { x: 700, y: 100, r: 160, c: "10,60,110" },
  ];
  for (const nb of nebulae) {
    const rg = bc.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
    rg.addColorStop(0, `rgba(${nb.c},0.08)`);
    rg.addColorStop(0.5, `rgba(${nb.c},0.04)`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    bc.fillStyle = rg;
    bc.fillRect(0, 0, W, H);
  }
})();

// ─── Input ───────────────────────────────────────────────────────────────────
const Input = {
  _held: new Set(),
  _pressed: new Set(),

  init() {
    window.addEventListener("keydown", (e) => {
      if (!this._held.has(e.code)) this._pressed.add(e.code);
      this._held.add(e.code);
      const block = [
        "Space",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ];
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

if (typeof module !== "undefined") {
  module.exports = {
    wrap,
    clamp,
    dist,
    rand,
    randInt,
    safeSplitAngle,
    TAU,
    W,
    H,
    SHIP_SIZE,
    SHIP_THRUST,
    SHIP_MAX_SPEED,
    SHIP_STRAFE_SPEED,
    SHIP_STRAFE_ACCEL,
    SHIP_ROTATION,
    SHIP_FRICTION,
    SHIP_MIN_SPEED,
    SHIP_HULL_FACTOR,
    SHIP_SHIELD_FACTOR,
    BULLET_SPEED,
    BULLET_LIFE,
    MAX_BULLETS,
    FIRE_RATE,
    BULLET_SPREAD_ANGLE,
    INVULNERABLE_TIME,
    ASTEROID_RADIUS,
    ASTEROID_SPEED,
    ASTEROID_SCORE,
    ASTEROID_MASS,
    ASTEROID_SPIN_FACTOR,
    INITIAL_ROCKS,
    MAX_ROCKS_PER_LEVEL,
    EXTRA_LIFE_SCORE,
    PARTICLE_LIFE,
    PARTICLE_SPEED,
    METABALL_HEX_PACKING,
    METABALL_DEFAULT_CONTRAST,
    METABALL_DEFAULT_BLUR_RATIO,
    METABALL_DRAW_BLOAT,
    METABALL_SPACING_RATIO,
    METABALL_CELL_JITTER,
    METABALL_CELL_SIZE_JITTER,
    CLUSTER_CELL_FACTOR,
    CLUSTER_COLLISION_FACTOR,
    PUMICE_RADIUS_MIN,
    PUMICE_RADIUS_MAX,
    PUMICE_CELL_FACTOR,
    PUMICE_SPACING_FACTOR,
    PUMICE_BLUR_FACTOR,
    PUMICE_CONTRAST,
    PUMICE_NEIGHBOR_FACTOR,
    PUMICE_COLLISION_FACTOR,
    PUMICE_POLY_RADIUS_MIN,
    PUMICE_POLY_RADIUS_MAX,
    ROCK_POLY_RADIUS_MIN,
    ROCK_POLY_RADIUS_MAX,
    ROCK_CLUSTER_RADIUS_MIN,
    ROCK_CLUSTER_RADIUS_MAX,
    UFO_RADIUS,
    UFO_SPEED,
    UFO_SCORE,
    POWERUP_DURATION,
    POWERUP_SPAWN_CHANCE,
    POWERUP_TYPES,
    DEBRIS_LIFE,
    DEBRIS_SPEED_MIN,
    DEBRIS_SPEED_MAX,
    DEBRIS_COUNT_MIN,
    DEBRIS_COUNT_MAX,
    DEBRIS_RADIUS_MIN,
    DEBRIS_RADIUS_MAX,
    DEBRIS_FRICTION_AIR,
    PENDULUM_STIFFNESS,
    PENDULUM_DAMPING,
    PENDULUM_TETHER_MIN,
    PENDULUM_TETHER_MAX,
    PENDULUM_INIT_SPEED,
    PENDULUM_MAX_COUNT,
    PENDULUM_START_LEVEL,
    Input,
  };
}
