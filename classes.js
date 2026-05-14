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
const SHIP_MIN_SPEED = 5; // px/s — minimum drift once the ship is moving

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

// ─── Sound ───────────────────────────────────────────────────────────────────
class Sound {
    constructor() {
        try {
            this.ac = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.ac = null;
        }
        this._ufoPhase = false;
    }

    _tone(freq, endFreq, dur, type = 'square', vol = 0.2) {
        if (!this.ac) return;
        try {
            if (this.ac.state === 'suspended') this.ac.resume();
            const now = this.ac.currentTime;
            const osc = this.ac.createOscillator();
            const g   = this.ac.createGain();
            osc.connect(g);
            g.connect(this.ac.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (endFreq !== freq)
                osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
            g.gain.setValueAtTime(vol, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + dur);
            osc.start(now);
            osc.stop(now + dur);
        } catch (e) { /* audio not critical */ }
    }

    shoot()        { this._tone(820, 180, 0.11, 'square',   0.1);  }
    explodeLarge() { this._tone(110,  35, 0.5,  'sawtooth', 0.28); }
    explodeMed()   { this._tone(170,  60, 0.3,  'sawtooth', 0.22); }
    explodeSmall() { this._tone(240, 110, 0.15, 'sawtooth', 0.17); }
    shipDie()      { this._tone(190,  28, 0.85, 'sawtooth', 0.32); }

    throb(phase) {
        this._tone(phase ? 112 : 98, phase ? 112 : 98, 0.05, 'sine', 0.1);
    }

    extraLife() {
        [523, 659, 784, 1047].forEach((f, i) =>
            setTimeout(() => this._tone(f, f, 0.16, 'sine', 0.18), i * 115)
        );
    }

    levelUp() {
        [392, 523, 659, 784, 1047].forEach((f, i) =>
            setTimeout(() => this._tone(f, f * 1.08, 0.18, 'sine', 0.17), i * 100)
        );
    }

    powerUp(type) {
        if (type === 'shield') {
            this._tone(440, 880, 0.2, 'sine', 0.15);
        } else if (type === 'rapid') {
            this._tone(660, 990, 0.09, 'square', 0.12);
            setTimeout(() => this._tone(880, 1100, 0.09, 'square', 0.12), 100);
        } else {
            this._tone(520, 780, 0.15, 'triangle', 0.13);
        }
    }

    ufoHum() {
        const f = this._ufoPhase ? 80 : 100;
        this._ufoPhase = !this._ufoPhase;
        this._tone(f, f, 0.12, 'sine', 0.05);
    }
}

// ─── Ship ────────────────────────────────────────────────────────────────────
class Ship {
    constructor() {
        this.x            = W / 2;
        this.y            = H / 2;
        this.vx           = 0;
        this.vy           = 0;
        this.angle        = -Math.PI / 2;
        this.invulnerable = INVULNERABLE_TIME;
        this.fireTimer    = 0;
        this.thrusting    = false;
        this.flameT       = 0;
        this.shieldTimer  = 0;
        this.rapidTimer   = 0;
        this.spreadTimer  = 0;
    }

    get radius() { return SHIP_SIZE * 0.7; }

    update(dt) {
        if (this.invulnerable > 0) this.invulnerable -= dt;
        if (this.fireTimer    > 0) this.fireTimer    -= dt;
        if (this.shieldTimer  > 0) this.shieldTimer  -= dt;
        if (this.rapidTimer   > 0) this.rapidTimer   -= dt;
        if (this.spreadTimer  > 0) this.spreadTimer  -= dt;

        if (Input.left())  this.angle -= SHIP_ROTATION * dt;
        if (Input.right()) this.angle += SHIP_ROTATION * dt;

        this.thrusting = Input.up();
        if (this.thrusting) {
            this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
            this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
        }

        const speed = Math.hypot(this.vx, this.vy);
        if (speed > SHIP_MAX_SPEED) {
            const s = SHIP_MAX_SPEED / speed;
            this.vx *= s;
            this.vy *= s;
        }

        const friction = Math.pow(SHIP_FRICTION, dt * 60);
        this.vx *= friction;
        this.vy *= friction;
        const spd = Math.hypot(this.vx, this.vy);
        if (spd > 0 && spd < SHIP_MIN_SPEED) {
            const s = SHIP_MIN_SPEED / spd;
            this.vx *= s;
            this.vy *= s;
        }

        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);

        this.flameT += dt * 18;
    }

    canFire() { return this.fireTimer <= 0 && Input.fire(); }

    fire() {
        this.fireTimer = this.rapidTimer > 0 ? FIRE_RATE / 2 : FIRE_RATE;
        const tx = this.x + Math.cos(this.angle) * SHIP_SIZE;
        const ty = this.y + Math.sin(this.angle) * SHIP_SIZE;
        if (this.spreadTimer > 0) {
            return [
                new Bullet(tx, ty, this.vx + Math.cos(this.angle - 0.26) * BULLET_SPEED, this.vy + Math.sin(this.angle - 0.26) * BULLET_SPEED),
                new Bullet(tx, ty, this.vx + Math.cos(this.angle)         * BULLET_SPEED, this.vy + Math.sin(this.angle)         * BULLET_SPEED),
                new Bullet(tx, ty, this.vx + Math.cos(this.angle + 0.26) * BULLET_SPEED, this.vy + Math.sin(this.angle + 0.26) * BULLET_SPEED),
            ];
        }
        return [new Bullet(tx, ty,
            this.vx + Math.cos(this.angle) * BULLET_SPEED,
            this.vy + Math.sin(this.angle) * BULLET_SPEED,
        )];
    }

    draw() {
        if (this.invulnerable > 0 && Math.floor(this.invulnerable * 8) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Shield bubble
        if (this.shieldTimer > 0) {
            const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 140);
            ctx.beginPath();
            ctx.arc(0, 0, SHIP_SIZE * 2.2, 0, TAU);
            ctx.strokeStyle = `rgba(50,210,255,${pulse})`;
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur  = 20;
            ctx.lineWidth   = 2;
            ctx.stroke();
        }

        // Hull — bloom pass then main pass on same path
        ctx.beginPath();
        ctx.moveTo( SHIP_SIZE,          0);
        ctx.lineTo(-SHIP_SIZE * 0.65,  -SHIP_SIZE * 0.5);
        ctx.lineTo(-SHIP_SIZE * 0.35,   0);
        ctx.lineTo(-SHIP_SIZE * 0.65,   SHIP_SIZE * 0.5);
        ctx.closePath();
        ctx.strokeStyle = '#b8f0ff';
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = '#4af';

        ctx.globalAlpha = 0.3;
        ctx.shadowBlur  = 35;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 18;
        ctx.stroke();

        // Thruster flame
        if (this.thrusting) {
            const flicker  = 0.5 + 0.5 * Math.sin(this.flameT);
            const flameLen = SHIP_SIZE * (0.45 + flicker * 0.55);
            const r = 255, g = (90 + flicker * 120) | 0;
            ctx.beginPath();
            ctx.moveTo(-SHIP_SIZE * 0.35, -SHIP_SIZE * 0.2);
            ctx.lineTo(-SHIP_SIZE * 0.35 - flameLen, 0);
            ctx.lineTo(-SHIP_SIZE * 0.35,  SHIP_SIZE * 0.2);
            ctx.strokeStyle = `rgba(${r},${g},0,${0.75 + flicker * 0.25})`;
            ctx.shadowColor = '#f80';
            ctx.shadowBlur  = 14;
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ─── Bullet ──────────────────────────────────────────────────────────────────
class Bullet {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = BULLET_LIFE;
    }

    get radius() { return 3; }

    update(dt) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.life -= dt;
        return this.life > 0;
    }

    draw() {
        const alpha = clamp(this.life / BULLET_LIFE * 2, 0, 1);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, TAU);
        ctx.fillStyle   = `rgba(255,255,100,${alpha})`;
        ctx.shadowColor = '#ff8';
        ctx.shadowBlur  = 14;
        ctx.fill();
        ctx.shadowBlur  = 0;
    }
}

// ─── Asteroid ────────────────────────────────────────────────────────────────
const ASTEROID_COLORS = ['#8899aa', '#99aaaa', '#aabbbb'];

class Asteroid {
    constructor(x, y, size = 0, angle = null) {
        this.x    = x;
        this.y    = y;
        this.size = size;

        this.radius = ASTEROID_RADIUS[size];
        this.score  = ASTEROID_SCORE[size];

        const a     = angle ?? rand(0, TAU);
        const speed = ASTEROID_SPEED[size] * rand(0.7, 1.35);
        this.vx       = Math.cos(a) * speed;
        this.vy       = Math.sin(a) * speed;
        this.rot      = rand(0, TAU);
        this.rotSpeed = rand(-1.6, 1.6) * (size + 1) * 0.38;

        const n = randInt(7, 13);
        this.verts = Array.from({ length: n }, (_, i) => {
            const baseAngle = (i / n) * TAU;
            const jitter    = (TAU / n) * rand(-0.38, 0.38);
            return {
                a: baseAngle + jitter,
                r: this.radius * rand(0.62, 1.28),
            };
        });
    }

    update(dt) {
        this.x   = wrap(this.x + this.vx * dt, W);
        this.y   = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpeed * dt;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);

        ctx.beginPath();
        const { a: a0, r: r0 } = this.verts[0];
        ctx.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0);
        for (let i = 1; i < this.verts.length; i++) {
            const { a, r } = this.verts[i];
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();

        const col = ASTEROID_COLORS[this.size];
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = col;
        ctx.shadowBlur  = 7;
        ctx.stroke();
        ctx.restore();
    }

    split() {
        if (this.size >= 2) return [];
        return [
            new Asteroid(this.x, this.y, this.size + 1, rand(0, TAU)),
            new Asteroid(this.x, this.y, this.size + 1, rand(0, TAU)),
        ];
    }
}

// ─── Particle ────────────────────────────────────────────────────────────────
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        const a   = rand(0, TAU);
        const spd = rand(35, PARTICLE_SPEED);
        this.vx      = Math.cos(a) * spd;
        this.vy      = Math.sin(a) * spd;
        this.life    = rand(0.3, PARTICLE_LIFE);
        this.maxLife = this.life;
        this.size    = rand(1, 3.5);
        this.color   = color ?? `hsl(${rand(18, 52)},100%,60%)`;
    }

    update(dt) {
        this.x    = wrap(this.x + this.vx * dt, W);
        this.y    = wrap(this.y + this.vy * dt, H);
        this.vx  *= 0.97;
        this.vy  *= 0.97;
        this.life -= dt;
        return this.life > 0;
    }

    draw() {
        const t = this.life / this.maxLife;
        ctx.globalAlpha = t * t;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * t, 0, TAU);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ─── PowerUp ─────────────────────────────────────────────────────────────────
class PowerUp {
    constructor(x, y, type) {
        this.x        = x;
        this.y        = y;
        this.type     = type;
        this.vx       = rand(-20, 20);
        this.vy       = rand(-20, 20);
        this.rot      = 0;
        this.rotSpeed = 1.5;
        this.life     = 8.0;
        this.radius   = 12;
    }

    update(dt) {
        this.x    = wrap(this.x + this.vx * dt, W);
        this.y    = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpeed * dt;
        this.life -= dt;
        return this.life > 0;
    }

    draw() {
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 330);
        const r     = this.radius;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        ctx.globalAlpha = pulse;

        if (this.type === 'shield') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * TAU - Math.PI / 6;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.strokeStyle = '#4cf';
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur  = 16;
            ctx.lineWidth   = 1.8;
            ctx.stroke();
        } else if (this.type === 'rapid') {
            ctx.strokeStyle = '#f84';
            ctx.shadowColor = '#f80';
            ctx.shadowBlur  = 16;
            ctx.lineWidth   = 2;
            for (const ox of [-5, 3]) {
                ctx.beginPath();
                ctx.moveTo(ox,      -r * 0.6);
                ctx.lineTo(ox + 7,   0);
                ctx.lineTo(ox,       r * 0.6);
                ctx.stroke();
            }
        } else {
            ctx.strokeStyle = '#ff4';
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur  = 16;
            ctx.lineWidth   = 1.8;
            for (const a of [-0.42, 0, 0.42]) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                ctx.stroke();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ─── UfoBullet ───────────────────────────────────────────────────────────────
class UfoBullet {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = BULLET_LIFE;
    }

    get radius() { return 3; }

    update(dt) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.life -= dt;
        return this.life > 0;
    }

    draw() {
        const alpha = clamp(this.life / BULLET_LIFE * 2, 0, 1);
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2.5, 0, TAU);
        ctx.fillStyle   = `rgba(255,80,80,${alpha})`;
        ctx.shadowColor = '#f00';
        ctx.shadowBlur  = 12;
        ctx.fill();
        ctx.shadowBlur  = 0;
    }
}

// ─── Ufo ─────────────────────────────────────────────────────────────────────
class Ufo {
    constructor(size, onBullet) {
        this.size      = size;
        this.radius    = UFO_RADIUS[size];
        this.score     = UFO_SCORE[size];
        this._onBullet = onBullet;

        const fromLeft = Math.random() < 0.5;
        this.x         = fromLeft ? -this.radius : W + this.radius;
        this.vx        = fromLeft ? UFO_SPEED[size] : -UFO_SPEED[size];
        this.baseY     = rand(H * 0.12, H * 0.88);
        this.y         = this.baseY;
        this.sineAmp   = rand(60, 130);
        this.sineFreq  = rand(0.7, 1.3);
        this.sineT     = 0;
        this.fireTimer = rand(1.5, 3.0);
    }

    update(dt, ship) {
        this.x     += this.vx * dt;
        this.sineT += dt;
        this.y      = clamp(
            this.baseY + Math.sin(this.sineT * this.sineFreq) * this.sineAmp,
            this.radius, H - this.radius
        );

        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this._fire(ship);
            this.fireTimer = rand(1.2, 2.5);
        }

        if (this.vx > 0 && this.x > W + this.radius * 2) return false;
        if (this.vx < 0 && this.x < -this.radius * 2)    return false;
        return true;
    }

    _fire(ship) {
        let angle;
        if (this.size === 1 && ship) {
            angle = Math.atan2(ship.y - this.y, ship.x - this.x) + rand(-0.26, 0.26);
        } else {
            angle = rand(0, TAU);
        }
        const spd = BULLET_SPEED * 0.75;
        this._onBullet(new UfoBullet(
            this.x, this.y,
            Math.cos(angle) * spd, Math.sin(angle) * spd
        ));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const r   = this.radius;
        const col = this.size === 0 ? '#4f8' : '#f55';
        const glw = this.size === 0 ? '#2d6' : '#f00';

        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.8;
        ctx.shadowColor = glw;
        ctx.shadowBlur  = 14;

        // Body
        ctx.beginPath();
        ctx.ellipse(0, r * 0.15, r, r * 0.38, 0, 0, TAU);
        ctx.stroke();

        // Dome
        ctx.beginPath();
        ctx.ellipse(0, r * 0.05, r * 0.52, r * 0.38, 0, Math.PI, 0);
        ctx.stroke();

        // Blinking cabin light
        if (Math.floor(Date.now() / 350) % 2) {
            ctx.beginPath();
            ctx.arc(0, -r * 0.2, r * 0.13, 0, TAU);
            ctx.fillStyle  = col;
            ctx.shadowBlur = 10;
            ctx.fill();
        }

        ctx.restore();
    }
}

// ─── Game ────────────────────────────────────────────────────────────────────
const STATE = Object.freeze({ START: 0, PLAYING: 1, DEAD: 2, GAMEOVER: 3 });

class Game {
    constructor() {
        this.snd     = new Sound();
        this.hiScore = parseInt(localStorage.getItem('ast_hi') || '0');
        this.state   = STATE.START;

        this.score       = 0;
        this.lives       = 3;
        this.level       = 0;
        this.ship        = null;
        this.bullets     = [];
        this.asteroids   = [];
        this.particles   = [];
        this.powerups    = [];
        this.ufos        = [];
        this.ufoBullets  = [];
        this.deadTimer   = 0;
        this.nextExtra   = EXTRA_LIFE_SCORE;
        this.ufoTimer    = 20;
        this.ufoHumTimer = 0;
        this.t           = 0;

        this.beatTimer    = 1.0;
        this.beatInterval = 1.0;
        this.beatPhase    = 0;
    }

    start() {
        this.score       = 0;
        this.lives       = 3;
        this.level       = 0;
        this.ship        = new Ship();
        this.bullets     = [];
        this.asteroids   = [];
        this.particles   = [];
        this.powerups    = [];
        this.ufos        = [];
        this.ufoBullets  = [];
        this.deadTimer   = 0;
        this.nextExtra   = EXTRA_LIFE_SCORE;
        this.ufoTimer    = 20;
        this.ufoHumTimer = 0;
        this.beatTimer   = 1.0;
        this.beatPhase   = 0;
        this._nextLevel();
        this.state = STATE.PLAYING;
    }

    update(dt) {
        dt = Math.min(dt, 1 / 20);
        this.t += dt;

        if (this.state === STATE.START || this.state === STATE.GAMEOVER) {
            if (Input.start()) this.start();
            Input.flush();
            return;
        }

        // Beat throb
        this.beatTimer -= dt;
        if (this.beatTimer <= 0) {
            this.beatInterval = clamp(1.0 - this.asteroids.length * 0.045, 0.12, 1.0);
            this.beatTimer     = this.beatInterval;
            this.beatPhase    ^= 1;
            this.snd.throb(this.beatPhase);
        }

        // UFO hum
        if (this.ufos.length > 0) {
            this.ufoHumTimer -= dt;
            if (this.ufoHumTimer <= 0) {
                this.snd.ufoHum();
                this.ufoHumTimer = 0.3;
            }
        }

        // Update universally (all non-START states)
        this.particles  = this.particles.filter(p => p.update(dt));
        this.powerups   = this.powerups.filter(p => p.update(dt));
        this.ufoBullets = this.ufoBullets.filter(b => b.update(dt));

        if (this.state === STATE.DEAD) {
            this.deadTimer -= dt;
            this.asteroids.forEach(a => a.update(dt));
            this.ufos = this.ufos.filter(u => u.update(dt, null));
            if (this.deadTimer <= 0) {
                if (this.lives > 0) {
                    this.ship  = new Ship();
                    this.state = STATE.PLAYING;
                } else {
                    this.state = STATE.GAMEOVER;
                }
            }
            Input.flush();
            return;
        }

        // ── PLAYING ──

        this.ship.update(dt);

        // Thrust trail particles
        if (this.ship.thrusting) {
            for (let i = 0; i < 2; i++) {
                const ex = this.ship.x - Math.cos(this.ship.angle) * SHIP_SIZE * 0.35;
                const ey = this.ship.y - Math.sin(this.ship.angle) * SHIP_SIZE * 0.35;
                const p  = new Particle(ex, ey, `hsl(${rand(20, 50)},100%,60%)`);
                p.vx      = -Math.cos(this.ship.angle) * rand(40, 100) + rand(-25, 25);
                p.vy      = -Math.sin(this.ship.angle) * rand(40, 100) + rand(-25, 25);
                p.life    = rand(0.1, 0.28);
                p.maxLife = p.life;
                p.size    = rand(0.8, 2.0);
                this.particles.push(p);
            }
        }

        if (this.bullets.length < MAX_BULLETS && this.ship.canFire()) {
            this.bullets.push(...this.ship.fire());
            this.snd.shoot();
        }

        this.bullets   = this.bullets.filter(b => b.update(dt));
        this.asteroids.forEach(a => a.update(dt));

        // UFO spawn
        this.ufoTimer -= dt;
        if (this.ufoTimer <= 0) {
            const size = (this.score >= 5000 && Math.random() < 0.4) ? 1 : 0;
            this.ufos.push(new Ufo(size, b => this.ufoBullets.push(b)));
            this.ufoTimer = 25 + rand(0, 15);
        }
        this.ufos = this.ufos.filter(u => u.update(dt, this.ship));

        // Bullet × Asteroid
        outer:
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                if (dist(b, a) < a.radius + b.radius) {
                    this._addScore(a.score);
                    this._boom(a.x, a.y, a.size);
                    if (Math.random() < POWERUP_SPAWN_CHANCE)
                        this.powerups.push(new PowerUp(a.x, a.y, POWERUP_TYPES[randInt(0, 2)]));
                    this.asteroids.splice(ai, 1, ...a.split());
                    this.bullets.splice(bi, 1);
                    continue outer;
                }
            }
        }

        // Bullet × UFO
        outerUfo:
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ui = this.ufos.length - 1; ui >= 0; ui--) {
                const u = this.ufos[ui];
                if (dist(b, u) < u.radius + b.radius) {
                    this._addScore(u.score);
                    this._boom(u.x, u.y, 1);
                    this.ufos.splice(ui, 1);
                    this.bullets.splice(bi, 1);
                    continue outerUfo;
                }
            }
        }

        // Ship × Asteroid
        if (this.ship.invulnerable <= 0) {
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                if (dist(this.ship, a) < a.radius + this.ship.radius) {
                    if (this.ship.shieldTimer > 0) {
                        this.ship.shieldTimer = 0;
                        this._boom(a.x, a.y, a.size);
                        this.asteroids.splice(ai, 1, ...a.split());
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // Ship × UFO
        if (this.ship && this.ship.invulnerable <= 0) {
            for (const u of this.ufos) {
                if (dist(this.ship, u) < u.radius + this.ship.radius) {
                    if (this.ship.shieldTimer > 0) {
                        this.ship.shieldTimer = 0;
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // UFO bullet × ship
        if (this.ship && this.ship.invulnerable <= 0) {
            for (let bi = this.ufoBullets.length - 1; bi >= 0; bi--) {
                const b = this.ufoBullets[bi];
                if (dist(b, this.ship) < b.radius + this.ship.radius) {
                    if (this.ship.shieldTimer > 0) {
                        this.ship.shieldTimer = 0;
                        this.ufoBullets.splice(bi, 1);
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // Ship × PowerUp
        if (this.ship) {
            for (let pi = this.powerups.length - 1; pi >= 0; pi--) {
                const pu = this.powerups[pi];
                if (dist(this.ship, pu) < this.ship.radius + pu.radius) {
                    if (pu.type === 'shield')     this.ship.shieldTimer = POWERUP_DURATION;
                    else if (pu.type === 'rapid') this.ship.rapidTimer  = POWERUP_DURATION;
                    else                          this.ship.spreadTimer = POWERUP_DURATION;
                    this.snd.powerUp(pu.type);
                    this.powerups.splice(pi, 1);
                }
            }
        }

        // Level clear (UFOs persist between levels)
        if (this.asteroids.length === 0) {
            this.snd.levelUp();
            this._nextLevel();
            if (this.ship) this.ship.invulnerable = INVULNERABLE_TIME;
        }

        Input.flush();
    }

    draw() {
        ctx.drawImage(bgCanvas, 0, 0);

        // Twinkling stars
        ctx.shadowBlur = 0;
        for (const s of STARS) {
            const alpha = s.a * (0.55 + 0.45 * Math.sin(this.t * 1.4 + s.phase));
            ctx.globalAlpha = alpha;
            ctx.fillStyle   = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (this.state === STATE.START) { this._drawStart(); return; }

        this.asteroids.forEach(a => a.draw());
        this.powerups.forEach(p => p.draw());
        this.ufos.forEach(u => u.draw());
        this.ufoBullets.forEach(b => b.draw());
        this.bullets.forEach(b => b.draw());
        this.particles.forEach(p => p.draw());
        if (this.ship) this.ship.draw();

        this._drawHUD();

        if (this.state === STATE.GAMEOVER) this._drawGameOver();
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    _nextLevel() {
        this.level++;
        const count = Math.min(INITIAL_ROCKS + this.level - 1, MAX_ROCKS_PER_LEVEL);
        const cx = W / 2, cy = H / 2;
        for (let i = 0; i < count; i++) {
            let x, y;
            do {
                x = rand(0, W);
                y = rand(0, H);
            } while (dist({ x, y }, { x: cx, y: cy }) < W * 0.22);
            this.asteroids.push(new Asteroid(x, y, 0));
        }
    }

    _addScore(pts) {
        this.score += pts;
        if (this.score > this.hiScore) {
            this.hiScore = this.score;
            localStorage.setItem('ast_hi', this.hiScore);
        }
        if (this.score >= this.nextExtra) {
            this.lives++;
            this.nextExtra += EXTRA_LIFE_SCORE;
            this.snd.extraLife();
        }
    }

    _boom(x, y, size) {
        const counts = [16, 10, 6];
        for (let i = 0; i < counts[size]; i++)
            this.particles.push(new Particle(x, y));
        [
            () => this.snd.explodeLarge(),
            () => this.snd.explodeMed(),
            () => this.snd.explodeSmall(),
        ][size]();
    }

    _killShip() {
        for (let i = 0; i < 22; i++)
            this.particles.push(new Particle(this.ship.x, this.ship.y, '#8ef'));
        this.snd.shipDie();
        this.lives--;
        this.ship       = null;
        this.state      = STATE.DEAD;
        this.deadTimer  = 2.2;
        this.bullets    = [];
        this.ufoBullets = [];
    }

    // ── Draw helpers ────────────────────────────────────────────────────────

    _drawHUD() {
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = '#ccc';
        ctx.font        = '18px monospace';
        ctx.textAlign   = 'left';
        ctx.fillText(String(this.score).padStart(6, '0'), 16, 28);
        ctx.textAlign   = 'right';
        ctx.fillText(`HI ${String(this.hiScore).padStart(6, '0')}`, W - 16, 28);
        ctx.textAlign   = 'center';
        ctx.fillText(`LVL ${this.level}`, W / 2, 28);

        // Life icons
        for (let i = 0; i < this.lives; i++) {
            ctx.save();
            ctx.translate(14 + i * 21, H - 16);
            ctx.rotate(-Math.PI / 2);
            ctx.beginPath();
            const s = 7;
            ctx.moveTo( s,           0);
            ctx.lineTo(-s * 0.65,   -s * 0.5);
            ctx.lineTo(-s * 0.35,    0);
            ctx.lineTo(-s * 0.65,    s * 0.5);
            ctx.closePath();
            ctx.strokeStyle = '#8cf';
            ctx.lineWidth   = 1.2;
            ctx.stroke();
            ctx.restore();
        }

        // Power-up status bars (bottom-right)
        if (this.ship) {
            const indicators = [];
            if (this.ship.shieldTimer  > 0) indicators.push({ label: 'SH', t: this.ship.shieldTimer,  col: '#4cf' });
            if (this.ship.rapidTimer   > 0) indicators.push({ label: 'RF', t: this.ship.rapidTimer,   col: '#f84' });
            if (this.ship.spreadTimer  > 0) indicators.push({ label: 'SP', t: this.ship.spreadTimer,  col: '#ff4' });

            ctx.font      = '13px monospace';
            ctx.textAlign = 'left';
            const barW = 48, barH = 16, gap = 6;
            indicators.forEach((ind, i) => {
                const bx  = W - 16 - (indicators.length - i) * (barW + gap);
                const by  = H - 52;
                const pct = ind.t / POWERUP_DURATION;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(bx, by, barW, barH);
                ctx.globalAlpha = 0.8;
                ctx.fillStyle   = ind.col;
                ctx.fillRect(bx, by, barW * pct, barH);
                ctx.globalAlpha = 1;
                ctx.fillStyle   = '#fff';
                ctx.fillText(ind.label, bx + 8, by + barH - 4);
            });
        }
    }

    _drawStart() {
        const cx = W / 2, cy = H / 2;
        ctx.textAlign   = 'center';
        ctx.shadowColor = '#4af';
        ctx.shadowBlur  = 30;
        ctx.fillStyle   = '#fff';
        ctx.font        = 'bold 72px monospace';
        ctx.fillText('ASTEROIDS', cx, cy - 90);

        ctx.shadowBlur  = 0;
        ctx.fillStyle   = '#888';
        ctx.font        = '18px monospace';
        ctx.fillText('ARROWS / WASD  —  rotate & thrust', cx, cy + 10);
        ctx.fillText('SPACE / Z  —  fire', cx, cy + 42);

        if (this.hiScore > 0) {
            ctx.fillStyle = '#fc0';
            ctx.font      = '16px monospace';
            ctx.fillText(`HI-SCORE  ${this.hiScore}`, cx, cy + 88);
        }

        if (Math.floor(Date.now() / 520) % 2) {
            ctx.fillStyle = '#fff';
            ctx.font      = '22px monospace';
            ctx.fillText('PRESS ENTER OR SPACE TO START', cx, cy + 140);
        }
    }

    _drawGameOver() {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);

        const cx = W / 2, cy = H / 2;
        ctx.textAlign   = 'center';
        ctx.shadowColor = '#f33';
        ctx.shadowBlur  = 28;
        ctx.fillStyle   = '#f55';
        ctx.font        = 'bold 64px monospace';
        ctx.fillText('GAME OVER', cx, cy - 55);

        ctx.shadowBlur = 0;
        ctx.fillStyle  = '#ccc';
        ctx.font       = '26px monospace';
        ctx.fillText(`SCORE  ${this.score}`, cx, cy + 15);

        if (this.score > 0 && this.score >= this.hiScore) {
            ctx.fillStyle = '#fc0';
            ctx.font      = '20px monospace';
            ctx.fillText('NEW HIGH SCORE!', cx, cy + 52);
        }

        if (Math.floor(Date.now() / 520) % 2) {
            ctx.fillStyle = '#aaa';
            ctx.font      = '18px monospace';
            ctx.fillText('PRESS ENTER OR SPACE TO PLAY AGAIN', cx, cy + 115);
        }
    }
}
