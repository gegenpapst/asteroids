"use strict";

// ─── Constants ───────────────────────────────────────────────────────────────
const SHIP_SIZE = 14;
const SHIP_THRUST = 260;
const SHIP_MAX_SPEED = 460;
const SHIP_STRAFE_SPEED = 180;
const SHIP_STRAFE_ACCEL = 500;
const SHIP_ROTATION = 3.5;
const SHIP_FRICTION = 0.985;
const SHIP_MIN_SPEED = 5;
const SHIP_HULL_FACTOR = 0.7; // radius getter: SHIP_SIZE × FACTOR
const SHIP_SHIELD_FACTOR = 2.2; // hitRadius + shield bubble visual: SHIP_SIZE × FACTOR

const BULLET_SPEED = 560;
const BULLET_LIFE = 0.65;
const MAX_BULLETS = 8;
const FIRE_RATE = 0.22;
const BULLET_SPREAD_ANGLE = 0.26; // 3-shot spread (rad), side bullets

const INVULNERABLE_TIME = 3.0;

const ASTEROID_RADIUS = [48, 26, 13];
const ASTEROID_SPEED = [55, 95, 148];
const ASTEROID_SCORE = [20, 50, 100];
const ASTEROID_MASS = [10, 3.5, 1.0]; // masses for mass-based Matter collisions (size 0–2)
const ASTEROID_SPIN_FACTOR = 0.065; // off-center-hit spin boost: ±rad/s per px lever arm

// ── Pendulum asteroids ──────────────────────────────────────────────────────
const PENDULUM_STIFFNESS = 0.03; // spring constant of the constraint (0 = free, 1 = rigid)
const PENDULUM_DAMPING = 0.01; // slight damping for numerical stability
const PENDULUM_INIT_SPEED = 90; // initial tangential velocity px/s

// ── Solar-system asteroids ──────────────────────────────────────────────────
const SOLAR_STIFFNESS = 0.8; // nearly rigid tether → clean circular orbit
const SOLAR_DAMPING = 0.02;
const SOLAR_TETHER_MIN = 75; // min. tether length px
const SOLAR_TETHER_MAX = 140; // max. tether length px
const SOLAR_ORBIT_SPEED_MIN = 80; // min tangential start velocity px/s
const SOLAR_ORBIT_SPEED_MAX = 160; // max tangential start velocity px/s
const SOLAR_SATELLITE_MIN = 3; // min. satellites
const SOLAR_SATELLITE_MAX = 7; // max. satellites
const SOLAR_MAX_COUNT = 2; // max. simultaneously active solar systems
const SOLAR_START_LEVEL = 1; // starting from this level
const SOLAR_CENTER_SCORE = 500; // points for the center
const SOLAR_CENTER_SPEED = 40; // px/s — drift speed of the whole system

const INITIAL_ROCKS = 4;
const MAX_ROCKS_PER_LEVEL = 10;
const EXTRA_LIFE_SCORE = 10000;

const PARTICLE_LIFE = 0.85;
const PARTICLE_SPEED = 170;

// ── Metaball rendering ──────────────────────────────────────────────────────
// Shared between ClusterAsteroid and RockCluster (via Metaball.js utility).
const METABALL_HEX_PACKING = Math.sqrt(3) / 2; // 0.866 — hex row height / spacing
const METABALL_DEFAULT_CONTRAST = 14; // contrast() filter strength
const METABALL_DEFAULT_BLUR_RATIO = 0.75; // blur as factor of cellR
const METABALL_DRAW_BLOAT = 1.25; // cells are drawn slightly larger
const METABALL_SPACING_RATIO = 1.65; // default hex cell spacing
const METABALL_CELL_JITTER = 1.5; // position jitter in pixels
const METABALL_CELL_SIZE_JITTER = 0.15; // ± range for cell size variation
const CLUSTER_CELL_FACTOR = 0.24; // cell radius = radius × FACTOR (asteroid/rock)
const CLUSTER_COLLISION_FACTOR = 0.65; // collisionRadius = radius × FACTOR

// ── Pumice ──────────────────────────────────────────────────────────────────
// Pumice cluster: individual cells with their own Matter bodies, dynamically destructible.
const PUMICE_RADIUS_MIN = 22;
const PUMICE_RADIUS_MAX = 54;
const PUMICE_CELL_FACTOR = 0.2; // cell radius = radius × FACTOR
const PUMICE_SPACING_FACTOR = 1.55; // hex cell spacing (more compact than default)
const PUMICE_BLUR_FACTOR = 0.68; // blur as factor of cellR
const PUMICE_CONTRAST = 13; // contrast() strength (sharper edge than default 14)
const PUMICE_NEIGHBOR_FACTOR = 2.5; // cullIsolated threshold = cellR × FACTOR
const PUMICE_COLLISION_FACTOR = 0.75; // collisionRadius = radius × FACTOR

// Rocks (static cluster obstacles)
const ROCK_CLUSTER_RADIUS_MIN = 25;
const ROCK_CLUSTER_RADIUS_MAX = 55;

const UFO_RADIUS = [22, 11];
const UFO_SPEED = [90, 130];
const UFO_SCORE = [200, 1000];

// Turret
const TURRET_RADIUS = 26;
const TURRET_HP = 5;
const TURRET_FIRE_MIN = 0.4;
const TURRET_FIRE_MAX = 1.2;
const TURRET_ROT_SPEED = 0.5;
const TURRET_BULLET_SPEED = 180;
const TURRET_SCORE = 500;
const TURRET_START_LEVEL = 3;
const TURRET_MAX_COUNT = 3;

const POWERUP_DURATION = 5.0;
const POWERUP_SPAWN_CHANCE = 0.12;
const POWERUP_TYPES = ["shield", "rapid", "spread", "heavy"];

// ── Debris (on asteroid death) ──────────────────────────────────────────────
const DEBRIS_LIFE = 2.0; // lifetime in seconds
const DEBRIS_SPEED_MIN = 60; // minimum start speed (px/s)
const DEBRIS_SPEED_MAX = 210; // maximum start speed (px/s)
const DEBRIS_COUNT_MIN = 3; // minimum debris count per explosion
const DEBRIS_COUNT_MAX = 5; // maximum debris count
const DEBRIS_RADIUS_MIN = 2.5; // smallest debris radius (px)
const DEBRIS_RADIUS_MAX = 5.0; // largest debris radius (px)
const DEBRIS_FRICTION_AIR = 0.018; // air friction for Matter body

// ── Satellite asteroid color proposals ──────────────────────────────────────
const SATELLITE_COLORS = [
  { name: "Ember", center: "rgb(255,125,18)", body: "#130300" }, // volcanic amber
  { name: "Crimson", center: "rgb(235,42,42)", body: "#140202" }, // lava red
  { name: "Arctic", center: "rgb(48,208,255)", body: "#000e1a" }, // ice cyan
  { name: "Venom", center: "rgb(32,235,78)", body: "#001204" }, // acid green
  { name: "Wraith", center: "rgb(162,52,255)", body: "#0a0019" }, // deep violet
  { name: "Solar", center: "rgb(255,212,38)", body: "#120d00" }, // sun gold
  { name: "Specter", center: "rgb(182,214,255)", body: "#04080f" }, // cold silver
  { name: "Plasma", center: "rgb(245,48,172)", body: "#14000e" }, // hot magenta
];

// ── Gameplay timing ─────────────────────────────────────────────────────────
const RESPAWN_DELAY = 2.2; // seconds until ship respawns after death
const UFO_SPAWN_MIN = 20; // earliest UFO spawn after level start (s)
const UFO_SPAWN_JITTER = 15; // additional random offset for UFO spawn (s)
const UFO_HUM_INTERVAL = 0.3; // interval of the UFO hum sound (s)
const BEAT_DENSITY_FACTOR = 0.045; // beat interval shrink per asteroid
const BEAT_INTERVAL_MIN = 0.12; // shortest beat interval (s)
const BEAT_INTERVAL_MAX = 1.0; // longest beat interval (s)
const BOOM_PARTICLE_COUNTS = [22, 14, 7]; // explosion particles per asteroid size (0–2)
const SAFE_POS_TRIES = 300; // max. attempts for a safe spawn position

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

if (typeof module !== "undefined") {
  module.exports = {
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
    PENDULUM_INIT_SPEED,
    SOLAR_STIFFNESS,
    SOLAR_DAMPING,
    SOLAR_TETHER_MIN,
    SOLAR_TETHER_MAX,
    SOLAR_ORBIT_SPEED_MIN,
    SOLAR_ORBIT_SPEED_MAX,
    SOLAR_SATELLITE_MIN,
    SOLAR_SATELLITE_MAX,
    SOLAR_MAX_COUNT,
    SOLAR_START_LEVEL,
    SOLAR_CENTER_SCORE,
    SOLAR_CENTER_SPEED,
    RESPAWN_DELAY,
    UFO_SPAWN_MIN,
    UFO_SPAWN_JITTER,
    UFO_HUM_INTERVAL,
    BEAT_DENSITY_FACTOR,
    BEAT_INTERVAL_MIN,
    BEAT_INTERVAL_MAX,
    BOOM_PARTICLE_COUNTS,
    SAFE_POS_TRIES,
    SATELLITE_COLORS,
    TURRET_RADIUS,
    TURRET_HP,
    TURRET_FIRE_MIN,
    TURRET_FIRE_MAX,
    TURRET_ROT_SPEED,
    TURRET_BULLET_SPEED,
    TURRET_SCORE,
    TURRET_START_LEVEL,
    TURRET_MAX_COUNT,
  };
}
