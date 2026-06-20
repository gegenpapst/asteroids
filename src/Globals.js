import { W, H, rand, TAU, randInt } from "./utils.js";

// ─── Constants ───────────────────────────────────────────────────────────────
export const SHIP_SIZE = 14;
export const SHIP_THRUST = 260;
export const SHIP_MAX_SPEED = 460;
export const SHIP_STRAFE_SPEED = 180;
export const SHIP_STRAFE_ACCEL = 500;
export const SHIP_ROTATION = 3.5;
export const SHIP_FRICTION = 0.985;
export const SHIP_MIN_SPEED = 5;
export const SHIP_HULL_FACTOR = 0.7;
export const SHIP_SHIELD_FACTOR = 2.2;

export const BULLET_SPEED = 560;
export const BULLET_LIFE = 0.65;
// Length of the additive motion streak behind a bullet, expressed in seconds of velocity.
export const BULLET_TRAIL_TIME = 0.022;
export const BULLET_LIFE_LEVELS = [0.35, 0.65, 1.0];
export const MAX_BULLETS = 8;
export const FIRE_RATE = 0.22;
export const BULLET_SPREAD_ANGLE = 0.26;

export const HEAT_MAX = 100;
export const HEAT_PER_SHOT = 20; // 5 shots to overheat at normal fire rate
export const HEAT_COOLDOWN_RATE = 30; // units per second; full cool in ~3.3 s
export const OVERHEAT_LOCKOUT = 2.5; // seconds weapon is locked after overheat

export const INVULNERABLE_TIME = 3.0;

export const ASTEROID_RADIUS = [48, 26, 13];
export const ASTEROID_SPEED = [55, 95, 148];
export const ASTEROID_SCORE = [20, 50, 100];
export const ASTEROID_MASS = [10, 3.5, 1.0];
export const ASTEROID_SPIN_FACTOR = 0.065;

// ── Pendulum asteroids ──────────────────────────────────────────────────────
export const PENDULUM_STIFFNESS = 0.03;
export const PENDULUM_DAMPING = 0.01;
export const PENDULUM_INIT_SPEED = 90;

// ── Solar-system asteroids ──────────────────────────────────────────────────
export const SOLAR_STIFFNESS = 0.8;
export const SOLAR_DAMPING = 0.02;
export const SOLAR_TETHER_MIN = 75;
export const SOLAR_TETHER_MAX = 140;
export const SOLAR_ORBIT_SPEED_MIN = 80;
export const SOLAR_ORBIT_SPEED_MAX = 160;
export const SOLAR_SATELLITE_MIN = 3;
export const SOLAR_SATELLITE_MAX = 7;
export const SOLAR_MAX_COUNT = 2;
export const SOLAR_START_LEVEL = 1;
export const SOLAR_CENTER_SCORE = 500;
export const SOLAR_CENTER_SPEED = 40;

export const INITIAL_ROCKS = 4;
export const MAX_ROCKS_PER_LEVEL = 10;
export const EXTRA_LIFE_SCORE = 10000;

export const PARTICLE_LIFE = 0.85;
export const PARTICLE_SPEED = 170;

// ── Metaball rendering ──────────────────────────────────────────────────────
export const METABALL_HEX_PACKING = Math.sqrt(3) / 2;
export const METABALL_DEFAULT_CONTRAST = 14;
export const METABALL_DEFAULT_BLUR_RATIO = 0.75;
export const METABALL_DRAW_BLOAT = 1.25;
export const METABALL_SPACING_RATIO = 1.65;
export const METABALL_CELL_JITTER = 1.5;
export const METABALL_CELL_SIZE_JITTER = 0.15;
export const CLUSTER_CELL_FACTOR = 0.24;
export const CLUSTER_COLLISION_FACTOR = 0.65;

// ── Pumice ──────────────────────────────────────────────────────────────────
export const PUMICE_RADIUS_MIN = 22;
export const PUMICE_RADIUS_MAX = 54;
export const PUMICE_CELL_FACTOR = 0.2;
export const PUMICE_SPACING_FACTOR = 1.55;
export const PUMICE_BLUR_FACTOR = 0.68;
export const PUMICE_CONTRAST = 13;
export const PUMICE_NEIGHBOR_FACTOR = 2.5;
export const PUMICE_COLLISION_FACTOR = 0.75;
export const PUMICE_COUNT_RANGES = [
  [0, 0],
  [1, 3],
  [3, 6],
];

// Rocks (static cluster obstacles)
export const ROCK_CLUSTER_RADIUS_MIN = 25;
export const ROCK_CLUSTER_RADIUS_MAX = 55;

export const UFO_RADIUS = [22, 11];
export const UFO_SPEED = [90, 130];
export const UFO_SCORE = [200, 1000];

// Turret
export const TURRET_RADIUS = 26;
export const TURRET_HP = 5;
export const TURRET_FIRE_MIN = 0.4;
export const TURRET_FIRE_MAX = 1.2;
export const TURRET_ROT_SPEED = 0.5;
export const TURRET_BULLET_SPEED = 180;
export const TURRET_SCORE = 500;
export const TURRET_START_LEVEL = 3;
export const TURRET_MAX_COUNT = 3;

export const POWERUP_DURATION_LEVELS = [5, 7, 10];
export const POWERUP_CHANCE_LEVELS = [0.05, 0.12, 0.25];
export const POWERUP_SPAWN_CHANCE = 0.12;
export const POWERUP_TYPES = ["shield", "rapid", "spread", "heavy"];

// ── Debris (on asteroid death) ──────────────────────────────────────────────
export const DEBRIS_LIFE = 2.0;
export const DEBRIS_SPEED_MIN = 60;
export const DEBRIS_SPEED_MAX = 210;
export const DEBRIS_COUNT_MIN = 3;
export const DEBRIS_COUNT_MAX = 5;
export const DEBRIS_RADIUS_MIN = 2.5;
export const DEBRIS_RADIUS_MAX = 5.0;
export const DEBRIS_FRICTION_AIR = 0.018;

// ── Difficulty presets ───────────────────────────────────────────────────────
export const GAME_MODES = [
  { bulletRange: 3, powerupFreq: 3, rockCount: 1, pumiceCount: 1, asteroidBounce: 1, worldSize: 1 },
  { bulletRange: 2, powerupFreq: 2, rockCount: 2, pumiceCount: 2, asteroidBounce: 1, worldSize: 2 },
  { bulletRange: 1, powerupFreq: 1, rockCount: 3, pumiceCount: 3, asteroidBounce: 2, worldSize: 3 },
];

export const CONFIG_PARAMS = {
  bulletRange: { max: 3 },
  powerupFreq: { max: 3 },
  rockCount: { max: 3 },
  pumiceCount: { max: 3 },
  asteroidBounce: { max: 2 },
  worldSize: { max: 3 },
};

// World dimensions — updated at game start based on config.worldSize
export let WW = W;
export let WH = H;

export function setWorldDimensions(ww, wh) {
  WW = ww;
  WH = wh;
}

// ── Satellite asteroid color proposals ──────────────────────────────────────
export const SATELLITE_COLORS = [
  { name: "Ember", center: "rgb(255,125,18)", body: "#130300" },
  { name: "Crimson", center: "rgb(235,42,42)", body: "#140202" },
  { name: "Arctic", center: "rgb(48,208,255)", body: "#000e1a" },
  { name: "Venom", center: "rgb(32,235,78)", body: "#001204" },
  { name: "Wraith", center: "rgb(162,52,255)", body: "#0a0019" },
  { name: "Solar", center: "rgb(255,212,38)", body: "#120d00" },
  { name: "Specter", center: "rgb(182,214,255)", body: "#04080f" },
  { name: "Plasma", center: "rgb(245,48,172)", body: "#14000e" },
];
export const SATELLITE_COLOR_DEFAULT = 4;

// ── Gameplay timing ─────────────────────────────────────────────────────────
export const RESPAWN_DELAY = 2.2;
export const UFO_SPAWN_MIN = 20;
export const UFO_SPAWN_JITTER = 15;
export const UFO_HUM_INTERVAL = 0.3;
export const UFO_FIRE_MIN = 1.2;
export const UFO_FIRE_MAX = 2.5;
export const UFO_SMALL_SCORE_THRESHOLD = 5000;
export const UFO_SMALL_CHANCE = 0.4;

export const SPAWN_SAFE_RADIUS_FACTOR = 0.22;
export const SOLAR_SPAWN_MARGIN = 0.2;
export const SHIP_BOUNCE_MIN_SPEED = 220;
export const RAPID_FIRE_FACTOR = 0.5;
export const BEAT_DENSITY_FACTOR = 0.045;
export const BEAT_INTERVAL_MIN = 0.12;
export const BEAT_INTERVAL_MAX = 1.0;
export const BOOM_PARTICLE_COUNTS = [22, 14, 7];
export const SHIP_DEATH_PARTICLES = 22;
export const SAFE_POS_TRIES = 300;
export const STAR_PARALLAX = 0.15;

// ── Screen feedback / "juice" (camera shake, flash, vignette) ────────────────
// Trauma model: a 0..1 value that decays linearly; screen offset scales with trauma².
export const SHAKE_DECAY = 1.6; // trauma units lost per second
export const SHAKE_MAX_OFFSET = 16; // px of camera jitter at full trauma
export const SHAKE_BOOM = [0.55, 0.32, 0.18]; // trauma added per boom, indexed by size (large→small)
export const SHAKE_SHIP_DEATH = 0.95; // trauma on player death
export const FLASH_DECAY = 4.0; // flash alpha lost per second
export const FLASH_KILL = 0.28; // white flash alpha when destroying a UFO / solar center
export const FLASH_DEATH = 0.4; // red flash alpha on player death
export const VIGNETTE_DECAY = 1.8; // vignette alpha lost per second
export const VIGNETTE_DEATH = 0.75; // red vignette alpha on player death

// ── Debug overlay thresholds ─────────────────────────────────────────────────
export const DBG_COLLISION_WARN = 80;
export const DBG_COLLISION_CRIT = 200;
export const DBG_FRAME_WARN_MS = 17;
export const DBG_FRAME_CRIT_MS = 20;
export const DBG_FPS_WARN = 58;
export const DBG_FPS_CRIT = 50;

// ── Background Saturn ────────────────────────────────────────────────────────
export const SATURN_RADIUS = 150;
export const SATURN_RING1_INNER = 188;
export const SATURN_RING1_OUTER = 213;
export const SATURN_RING2_INNER = 233;
export const SATURN_RING2_OUTER = 296;
export const SATURN_RING_TILT = 0.28;
export const SATURN_SWING_SPEED = 0.08;
export const SATURN_SWING_AMP = Math.PI / 6;
export const SATURN_ALPHA = 0.45;

// ─── Static star field ───────────────────────────────────────────────────────
export const STARS = Array.from({ length: 90 }, () => ({
  x: rand(0, W),
  y: rand(0, H),
  r: rand(0.4, 1.6),
  a: rand(0.15, 0.75),
  phase: rand(0, TAU),
}));

// ─── Pre-rendered background ─────────────────────────────────────────────────
export let bgCanvas = null;
if (typeof document !== "undefined") {
  bgCanvas = document.createElement("canvas");
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
}
