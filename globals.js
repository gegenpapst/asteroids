'use strict';

// ─── Canvas setup ────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

const W = 800;
const H = 600;
canvas.width  = W;
canvas.height = H;

function fitCanvas() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width  = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

// ─── Constants ───────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;

const SHIP_SIZE      = 14;
const SHIP_THRUST    = 260;
const SHIP_MAX_SPEED = 460;
const SHIP_ROTATION  = 3.5;
const SHIP_FRICTION  = 0.985;
const SHIP_MIN_SPEED = 5;

const BULLET_SPEED = 560;
const BULLET_LIFE  = 1.35;
const MAX_BULLETS  = 8;
const FIRE_RATE    = 0.22;

const INVULNERABLE_TIME = 3.0;

const ASTEROID_RADIUS = [48, 26, 13];
const ASTEROID_SPEED  = [55, 95, 148];
const ASTEROID_SCORE  = [20, 50, 100];

const INITIAL_ROCKS       = 4;
const MAX_ROCKS_PER_LEVEL = 10;
const EXTRA_LIFE_SCORE    = 10000;

const PARTICLE_LIFE  = 0.85;
const PARTICLE_SPEED = 170;

const UFO_RADIUS = [22, 11];
const UFO_SPEED  = [90, 130];
const UFO_SCORE  = [200, 1000];

const POWERUP_DURATION     = 5.0;
const POWERUP_SPAWN_CHANCE = 0.12;
const POWERUP_TYPES = ['shield', 'rapid', 'spread'];

// ─── Utilities ───────────────────────────────────────────────────────────────
function rand(a, b)       { return Math.random() * (b - a) + a; }
function randInt(a, b)    { return Math.floor(rand(a, b + 1)); }
function wrap(v, max)     { return ((v % max) + max) % max; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ─── Static star field ───────────────────────────────────────────────────────
const STARS = Array.from({ length: 90 }, () => ({
    x:     rand(0, W),
    y:     rand(0, H),
    r:     rand(0.4, 1.6),
    a:     rand(0.15, 0.75),
    phase: rand(0, TAU),
}));

// ─── Pre-rendered background ─────────────────────────────────────────────────
const bgCanvas = document.createElement('canvas');
bgCanvas.width  = W;
bgCanvas.height = H;
(function () {
    const bc = bgCanvas.getContext('2d');
    const g  = bc.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,   '#000010');
    g.addColorStop(0.5, '#0a0018');
    g.addColorStop(1,   '#000510');
    bc.fillStyle = g;
    bc.fillRect(0, 0, W, H);
    const nebulae = [
        { x: 180, y: 140, r: 220, c: '80,40,180' },
        { x: 620, y: 400, r: 190, c: '30,20,140' },
        { x: 700, y: 100, r: 160, c: '10,60,110' },
    ];
    for (const nb of nebulae) {
        const rg = bc.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
        rg.addColorStop(0,   `rgba(${nb.c},0.08)`);
        rg.addColorStop(0.5, `rgba(${nb.c},0.04)`);
        rg.addColorStop(1,   'rgba(0,0,0,0)');
        bc.fillStyle = rg;
        bc.fillRect(0, 0, W, H);
    }
})();

// ─── Input ───────────────────────────────────────────────────────────────────
const Input = {
    _held:    new Set(),
    _pressed: new Set(),

    init() {
        window.addEventListener('keydown', e => {
            if (!this._held.has(e.code)) this._pressed.add(e.code);
            this._held.add(e.code);
            const block = ['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
            if (block.includes(e.code)) e.preventDefault();
        });
        window.addEventListener('keyup', e => this._held.delete(e.code));
    },

    isHeld(code)    { return this._held.has(code); },
    wasPressed(code){ return this._pressed.has(code); },
    flush()         { this._pressed.clear(); },

    left()  { return this.isHeld('ArrowLeft')  || this.isHeld('KeyA'); },
    right() { return this.isHeld('ArrowRight') || this.isHeld('KeyD'); },
    up()    { return this.isHeld('ArrowUp')    || this.isHeld('KeyW'); },
    fire()  { return this.isHeld('Space') || this.isHeld('KeyZ'); },
    start() { return this.wasPressed('Enter') || this.wasPressed('Space'); },
};
