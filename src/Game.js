'use strict';

// ─── Game ────────────────────────────────────────────────────────────────────
const STATE = Object.freeze({ START: 0, PLAYING: 1, DEAD: 2, GAMEOVER: 3, HELP: 4, CONFIG: 5 });

// Presets for Beginner / Novice / Expert (index = mode - 1)
const MODES = [
    { bulletRange: 3, powerupFreq: 3, rockCount: 1, pumiceCount: 1, asteroidBounce: 1 }, // Beginner
    { bulletRange: 2, powerupFreq: 2, rockCount: 2, pumiceCount: 2, asteroidBounce: 1 }, // Novice
    { bulletRange: 1, powerupFreq: 1, rockCount: 3, pumiceCount: 3, asteroidBounce: 2 }, // Expert
];

class Game {
    constructor() {
        Matter.use(MatterWrap);
        this.engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });

        this.snd     = new Sound();
        this.hiScore = parseInt(localStorage.getItem('ast_hi') || '0');
        this.state   = STATE.START;
        this._debugCollision = false;
        this._dbgCC      = 0;
        this._dbgFPS     = 0;
        this._dbgFrameMs = 0;
        this._dbgPeakCC  = 0;
        this._dbgPeakTTL = 0;  // Frames bis Peak-Reset

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
        this.rocks       = [];
        this.pumices          = [];
        this.pumicePolys      = [];
        this.clusterAsteroids = [];
        this.rockClusters     = [];
        this.deadTimer   = 0;
        this.nextExtra   = EXTRA_LIFE_SCORE;
        this.ufoTimer    = 20;
        this.ufoHumTimer = 0;
        this.t           = 0;

        this.beatTimer    = 1.0;
        this.beatInterval = 1.0;
        this.beatPhase    = 0;

        this.config = { mode: 2, bulletRange: 2, powerupFreq: 2, rockCount: 2, pumiceCount: 2, asteroidBounce: 1, visualStyle: 2 };
        this._configCursor   = 0;
        this._configPrevState = STATE.START;

        this._rockCanvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
    }

    start() {
        this.score       = 0;
        this.lives       = 3;
        this.level       = 0;
        this.bullets     = [];
        this.asteroids   = [];
        this.particles   = [];
        this.powerups    = [];
        this.ufos        = [];
        this.ufoBullets       = [];
        this.clusterAsteroids = [];
        this.rockClusters     = [];
        Matter.World.clear(this.engine.world, false);
        const isMetaball  = this.config.visualStyle === 2;
        const [rMin, rMax] = this._rockCountRange;
        this.rocks        = isMetaball ? [] : Array.from({ length: randInt(rMin, rMax) }, () => new RockPoly(rand(60, W - 60), rand(60, H - 60)));
        this.rockClusters = isMetaball ? Array.from({ length: randInt(1, this.config.rockCount) }, () =>
            new RockCluster(rand(60, W - 60), rand(60, H - 60))) : [];
        this.deadTimer   = 0;
        this.nextExtra   = EXTRA_LIFE_SCORE;
        this.ufoTimer    = 20;
        this.ufoHumTimer = 0;
        this.beatTimer   = 1.0;
        this.beatPhase   = 0;
        const [pcMin, pcMax] = this._pumiceCountRange;
        const pumices = [];
        if (isMetaball) {
            for (let i = 0; i < randInt(pcMin, pcMax); i++) {
                const [px, py] = this._safePumicePos(pumices);
                pumices.push(new PumiceCluster(px, py));
            }
        }
        this.pumices = pumices;
        const pumicePolys = [];
        if (!isMetaball) {
            for (let i = 0; i < randInt(pcMin, pcMax); i++) {
                const [px, py] = this._safePumicePolyPos(pumicePolys);
                pumicePolys.push(new PumicePoly(px, py));
            }
        }
        this.pumicePolys = pumicePolys;
        this.ship        = this.config.visualStyle === 2 ? new ShipCluster() : new ShipPoly();
        [this.ship.x, this.ship.y] = this._safeShipPos();
        Matter.World.add(this.engine.world, this.rocks.map(r => r.body));
        Matter.World.add(this.engine.world, this.rockClusters.map(rc => rc.body));
        Matter.World.add(this.engine.world, this.pumices.flatMap(p => p.cells.map(c => c.body)));
        Matter.World.add(this.engine.world, this.pumicePolys.map(p => p.body));
        this._nextLevel();
        this.state = STATE.PLAYING;
    }

    update(dt) {
        dt = Math.min(dt, 1 / 20);
        this.t += dt;
        if (dt > 0) {
            this._dbgFPS     += (1 / dt        - this._dbgFPS)     * 0.1;
            this._dbgFrameMs += (dt * 1000      - this._dbgFrameMs) * 0.1;
        }

        if (this.state === STATE.START || this.state === STATE.GAMEOVER) {
            if (Input.start() || Input.config()) {
                this._configPrevState = this.state;
                this.state = STATE.CONFIG;
            }
            Input.flush();
            return;
        }

        if (this.state === STATE.HELP) {
            if (Input.help() || Input.wasPressed('Escape')) this.state = STATE.PLAYING;
            Input.flush();
            return;
        }

        if (this.state === STATE.CONFIG) {
            const readOnly = this._configPrevState === STATE.PLAYING;
            if (!readOnly) {
                const params    = ['mode', 'bulletRange', 'powerupFreq', 'rockCount', 'pumiceCount', 'asteroidBounce', 'visualStyle'];
                const paramMax  = { mode: 3, bulletRange: 3, powerupFreq: 3, rockCount: 3, pumiceCount: 3, asteroidBounce: 2, visualStyle: 2 };
                if (Input.wasPressed('ArrowUp'))   this._configCursor = (this._configCursor + params.length - 1) % params.length;
                if (Input.wasPressed('ArrowDown'))  this._configCursor = (this._configCursor + 1) % params.length;
                const key = params[this._configCursor];
                if (Input.wasPressed('ArrowLeft'))  this.config[key] = Math.max(1, this.config[key] - 1);
                if (Input.wasPressed('ArrowRight')) this.config[key] = Math.min(paramMax[key], this.config[key] + 1);
                if (key === 'mode') Object.assign(this.config, MODES[this.config.mode - 1]);
                if (key === 'mode' || key === 'asteroidBounce') this._applyAsteroidFilter();
            }
            if (Input.config() || Input.wasPressed('Enter')) {
                if (readOnly) this.state = STATE.PLAYING;
                else          this.start();
            }
            Input.flush();
            return;
        }

        if (this.state === STATE.PLAYING && Input.help()) {
            this.state = STATE.HELP;
            Input.flush();
            return;
        }

        if (this.state === STATE.PLAYING && Input.config()) {
            this._configPrevState = STATE.PLAYING;
            this.state = STATE.CONFIG;
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
            Matter.Engine.update(this.engine, dt * 1000);
            this._syncBodies();
            if (this.deadTimer <= 0) {
                if (this.lives > 0) {
                    this.ship = this.config.visualStyle === 2 ? new ShipCluster() : new ShipPoly();
                    [this.ship.x, this.ship.y] = this._safeShipPos();
                    this.state = STATE.PLAYING;
                } else {
                    this.state = STATE.GAMEOVER;
                }
            }
            Input.flush();
            return;
        }

        // ── PLAYING ──

        if (Input.wasPressed('F2') || Input.wasPressed('KeyQ')) this._debugCollision = !this._debugCollision;

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

        if (Input.teleport() && this.ship.invulnerable <= 0) {
            const [tx, ty] = this._safeShipPos();
            this.ship.teleport(tx, ty);
            this.snd.powerUp('shield');
        }

        if (this.bullets.length < MAX_BULLETS && this.ship.canFire()) {
            this.bullets.push(...this.ship.fire(this._bulletLife));
            this.snd.shoot();
        }

        this.bullets          = this.bullets.filter(b => b.update(dt));
        this.asteroids.forEach(a => a.update(dt));
        this.clusterAsteroids.forEach(ca => ca.update(dt));
        Matter.Engine.update(this.engine, dt * 1000);
        this._syncBodies();

        // UFO spawn
        this.ufoTimer -= dt;
        if (this.ufoTimer <= 0) {
            const size    = (this.score >= 5000 && Math.random() < 0.4) ? 1 : 0;
            const UfoClass = this.config.visualStyle === 2 ? UfoCluster : Ufo;
            this.ufos.push(new UfoClass(size, b => this.ufoBullets.push(b)));
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
                    if (Math.random() < this._powerupChance)
                        this.powerups.push(new PowerUp(a.x, a.y, POWERUP_TYPES[randInt(0, 3)]));
                    const children = a.split(Math.atan2(b.vy, b.vx));
                    Matter.World.remove(this.engine.world, a.body);
                    if (children.length) {
                        Matter.World.add(this.engine.world, children.map(c => c.body));
                        const f = this._asteroidCollisionFilter;
                        for (const c of children) Matter.Body.set(c.body, 'collisionFilter', f);
                    }
                    this.asteroids.splice(ai, 1, ...children);
                    this.bullets.splice(bi, 1);
                    continue outer;
                }
            }
        }

        // Bullet × ClusterAsteroid
        outerCA:
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ci = this.clusterAsteroids.length - 1; ci >= 0; ci--) {
                const ca = this.clusterAsteroids[ci];
                if (dist(b, ca) < ca.collisionRadius + b.radius) {
                    this._addScore(ca.score);
                    this._boom(ca.x, ca.y, ca.size);
                    if (Math.random() < this._powerupChance)
                        this.powerups.push(new PowerUp(ca.x, ca.y, POWERUP_TYPES[randInt(0, 3)]));
                    const children = ca.split(Math.atan2(b.vy, b.vx));
                    Matter.World.remove(this.engine.world, ca.body);
                    if (children.length) {
                        Matter.World.add(this.engine.world, children.map(c => c.body));
                        const f = this._asteroidCollisionFilter;
                        for (const c of children) Matter.Body.set(c.body, 'collisionFilter', f);
                    }
                    this.clusterAsteroids.splice(ci, 1, ...children);
                    this.bullets.splice(bi, 1);
                    continue outerCA;
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

        // Bullet × Rock
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (this.rocks.some(r => dist(b, r) < r.radius + b.radius)) {
                this.bullets.splice(bi, 1);
            }
        }

        // Bullet × RockCluster
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (this.rockClusters.some(rc => dist(b, rc) < rc.collisionRadius + b.radius)) {
                this.bullets.splice(bi, 1);
            }
        }

        // Bullet × Pumice
        outerPumice:
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (const p of this.pumices) {
                const hits = p.findHit(b.x, b.y, b.radius);
                if (hits.length === 0) continue;
                for (const c of hits) {
                    c.alive = false;
                    Matter.World.remove(this.engine.world, c.body);
                    for (let k = 0; k < 3; k++)
                        this.particles.push(new Particle(c.x, c.y, `hsl(${rand(25,40)},18%,${rand(55,72)}%)`));
                }
                p.cullIsolated(this.engine.world);
                this.bullets.splice(bi, 1);
                continue outerPumice;
            }
        }
        this.pumices = this.pumices.filter(p => p.alive);

        // Bullet × PumicePoly
        outerPP:
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let pi = this.pumicePolys.length - 1; pi >= 0; pi--) {
                const pp = this.pumicePolys[pi];
                if (pp.collidesWithCircle(b.x, b.y, b.radius)) {
                    const { destroyed, oldBody, newBody } = pp.hit(b.x, b.y);
                    Matter.World.remove(this.engine.world, oldBody);
                    if (newBody) Matter.World.add(this.engine.world, newBody);
                    for (let k = 0; k < 5; k++)
                        this.particles.push(new Particle(b.x, b.y, `hsl(${rand(25,40)},18%,${rand(60,78)}%)`));
                    if (destroyed) this._boom(pp.x, pp.y, 1);
                    this.bullets.splice(bi, 1);
                    continue outerPP;
                }
            }
        }
        this.pumicePolys = this.pumicePolys.filter(p => p.alive);

        // Ship × Asteroid
        if (this.ship.invulnerable <= 0) {
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                if (dist(this.ship, a) < a.radius + this.ship.hitRadius) {
                    if (this.ship.shieldTimer > 0) {
                        this._boom(a.x, a.y, a.size);
                        const children = a.split();
                        Matter.World.remove(this.engine.world, a.body);
                        if (children.length) {
                            Matter.World.add(this.engine.world, children.map(c => c.body));
                            const f = this._asteroidCollisionFilter;
                            for (const c of children) Matter.Body.set(c.body, 'collisionFilter', f);
                        }
                        this.asteroids.splice(ai, 1, ...children);
                        this._bounceShip(a.x, a.y);
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // Ship × ClusterAsteroid
        if (this.ship && this.ship.invulnerable <= 0) {
            for (let ci = this.clusterAsteroids.length - 1; ci >= 0; ci--) {
                const ca = this.clusterAsteroids[ci];
                if (dist(this.ship, ca) < ca.collisionRadius + this.ship.hitRadius) {
                    if (this.ship.shieldTimer > 0) {
                        this._boom(ca.x, ca.y, ca.size);
                        const children = ca.split();
                        Matter.World.remove(this.engine.world, ca.body);
                        if (children.length) {
                            Matter.World.add(this.engine.world, children.map(c => c.body));
                            const f = this._asteroidCollisionFilter;
                            for (const c of children) Matter.Body.set(c.body, 'collisionFilter', f);
                        }
                        this.clusterAsteroids.splice(ci, 1, ...children);
                        this._bounceShip(ca.x, ca.y);
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // Ship × Rock
        if (this.ship && this.ship.invulnerable <= 0) {
            for (const r of this.rocks) {
                if (dist(this.ship, r) < r.radius + this.ship.hitRadius) {
                    if (this.ship.shieldTimer > 0) {
                        this._bounceShip(r.x, r.y);
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // Ship × RockCluster
        if (this.ship && this.ship.invulnerable <= 0) {
            for (const rc of this.rockClusters) {
                if (dist(this.ship, rc) < rc.collisionRadius + this.ship.hitRadius) {
                    if (this.ship.shieldTimer > 0) this._bounceShip(rc.x, rc.y);
                    else this._killShip();
                    break;
                }
            }
        }

        // Ship × Pumice (per-cell — gleiche Methode wie Bullets, kein unsichtbarer Bounding-Circle)
        if (this.ship && this.ship.invulnerable <= 0) {
            for (const p of this.pumices) {
                if (!p.alive) continue;
                const hits = p.findHit(this.ship.x, this.ship.y, this.ship.hitRadius);
                if (hits.length > 0) {
                    if (this.ship.shieldTimer > 0) this._bounceShip(p.x, p.y);
                    else this._killShip();
                    break;
                }
            }
        }

        // Ship × PumicePoly
        if (this.ship && this.ship.invulnerable <= 0) {
            for (const pp of this.pumicePolys) {
                if (pp.collidesWithCircle(this.ship.x, this.ship.y, this.ship.hitRadius)) {
                    if (this.ship.shieldTimer > 0) this._bounceShip(pp.x, pp.y);
                    else this._killShip();
                    break;
                }
            }
        }

        // Ship × UFO
        if (this.ship && this.ship.invulnerable <= 0) {
            for (const u of this.ufos) {
                if (dist(this.ship, u) < u.radius + this.ship.hitRadius) {
                    if (this.ship.shieldTimer > 0) {
                        this._bounceShip(u.x, u.y);
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
                if (dist(b, this.ship) < b.radius + this.ship.hitRadius) {
                    if (this.ship.shieldTimer > 0) {
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
                    if (pu.type === 'shield')       this.ship.shieldTimer = this._powerupDuration;
                    else if (pu.type === 'rapid')  this.ship.rapidTimer  = this._powerupDuration;
                    else if (pu.type === 'spread') this.ship.spreadTimer = this._powerupDuration;
                    else                           this.ship.heavyTimer  = this._powerupDuration;
                    this.snd.powerUp(pu.type);
                    this.powerups.splice(pi, 1);
                }
            }
        }

        // Kollisionsprüfungen zählen (max. theoretisch: Bullets × alle + Ship × alle)
        if (this._debugCollision) {
            const pumiceCells = this.pumices.reduce((s, p) => s + p.cells.filter(c => c.alive).length, 0);
            const perBullet   = this.asteroids.length + this.clusterAsteroids.length
                              + this.ufos.length + this.rocks.length + this.rockClusters.length
                              + pumiceCells + this.pumicePolys.length;
            const shipChecks  = this.ship ? (this.asteroids.length + this.clusterAsteroids.length
                              + this.rocks.length + this.rockClusters.length
                              + pumiceCells + this.pumicePolys.length
                              + this.ufos.length + this.ufoBullets.length + this.powerups.length) : 0;
            this._dbgCC = this.bullets.length * perBullet + shipChecks;
            if (this._dbgCC > this._dbgPeakCC) {
                this._dbgPeakCC  = this._dbgCC;
                this._dbgPeakTTL = 120;          // Peak gilt 120 Frames (~2 s)
            } else if (--this._dbgPeakTTL <= 0) {
                this._dbgPeakCC  = this._dbgCC;  // Fenster abgelaufen → zurücksetzen
                this._dbgPeakTTL = 120;
            }
        }

        // Level clear (UFOs persist between levels)
        if (this.asteroids.length === 0 && this.clusterAsteroids.length === 0) {
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

        if (this.state === STATE.START)  { this._drawStart();  return; }
        if (this.state === STATE.HELP)   { this._drawHelp();   return; }
        if (this.state === STATE.CONFIG) { this._drawConfig(); return; }

        this._drawRocks();
        this.rockClusters.forEach(rc => rc.draw());
        this.pumices.forEach(p => p.draw());
        this.pumicePolys.forEach(p => p.draw());
        this.asteroids.forEach(a => a.draw());
        this.clusterAsteroids.forEach(ca => ca.draw());
        this.powerups.forEach(p => p.draw());
        this.ufos.forEach(u => u.draw());
        this.ufoBullets.forEach(b => b.draw());
        this.bullets.forEach(b => b.draw());
        this.particles.forEach(p => p.draw());
        if (this.ship) this.ship.draw();

        // ── Collision debug overlay (Q / F2 to toggle) ──────────────────────
        if (this._debugCollision) {
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.lineWidth   = 1.5;
            const drawC = (x, y, r, col) => {
                ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
                ctx.strokeStyle = col; ctx.stroke();
            };
            // Obstacles
            this.rocks.forEach(r           => drawC(r.x,  r.y,  r.radius,           '#f44'));
            this.rockClusters.forEach(rc   => drawC(rc.x, rc.y, rc.collisionRadius,  '#f44'));
            this.asteroids.forEach(a       => drawC(a.x,  a.y,  a.radius,            '#f84'));
            this.clusterAsteroids.forEach(ca => drawC(ca.x, ca.y, ca.collisionRadius,'#f84'));
            this.pumices.forEach(p         => p.cells.filter(c => c.alive).forEach(c => drawC(c.x, c.y, c.r, '#f4f')));
            this.pumicePolys.forEach(pp    => drawC(pp.x, pp.y, pp.radius,           '#f4f'));
            // Enemies
            this.ufos.forEach(u            => drawC(u.x,  u.y,  u.radius,            '#f00'));
            this.ufoBullets.forEach(b      => drawC(b.x,  b.y,  b.radius,            '#f60'));
            // Player
            this.bullets.forEach(b         => drawC(b.x,  b.y,  b.radius,            '#0f4'));
            this.powerups.forEach(p        => drawC(p.x,  p.y,  p.radius,            '#ff0'));
            if (this.ship) {
                drawC(this.ship.x, this.ship.y, this.ship.radius,    '#4ff');  // hull
                if (this.ship.hitRadius > this.ship.radius)
                    drawC(this.ship.x, this.ship.y, this.ship.hitRadius, '#0cf');  // shield bubble
            }
            // Debug-Overlay (bottom-right)
            ctx.globalAlpha = 0.85;
            ctx.font        = '11px monospace';
            ctx.textAlign   = 'right';

            const fps = Math.round(this._dbgFPS);
            const ms  = this._dbgFrameMs.toFixed(1);
            const entities = this.asteroids.length + this.clusterAsteroids.length
                           + this.rocks.length + this.rockClusters.length
                           + this.pumices.length + this.pumicePolys.length
                           + this.ufos.length + this.ufoBullets.length
                           + this.bullets.length + this.powerups.length
                           + (this.ship ? 1 : 0);

            const line = (text, col, y) => { ctx.fillStyle = col; ctx.fillText(text, W - 6, y); };
            line(`Partikel:  ${this.particles.length}`,                                                             '#888',  H - 76);
            line(`Entities:  ${entities}`,                                                                          '#aaa',  H - 62);
            line(`Kollision: ${this._dbgCC} / Peak: ${this._dbgPeakCC}`, this._dbgPeakCC > 200 ? '#f84' : this._dbgPeakCC > 80 ? '#ff4' : '#4f8', H - 48);
            line(`Frame:     ${ms} ms`,                                   parseFloat(ms) > 20 ? '#f84' : parseFloat(ms) > 17 ? '#ff4' : '#4f8',    H - 34);
            line(`FPS:       ${fps}`,                                      fps < 50 ? '#f84' : fps < 58 ? '#ff4' : '#4f8',                          H - 20);
            ctx.restore();
        }

        this._drawHUD();

        if (this.state === STATE.GAMEOVER) this._drawGameOver();
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    _safeShipPos() {
        const sR = SHIP_SIZE * 0.7;
        let x, y, tries = 0;
        // Generous buffer first; if no spot found, fall back to minimum-safe spacing
        for (const margin of [sR + 50, sR + 15]) {
            tries = 0;
            do {
                x = rand(60, W - 60);
                y = rand(60, H - 60);
                tries++;
                const collides =
                    this.rocks.some(r => dist({ x, y }, r) < r.radius + margin) ||
                    this.rockClusters.some(rc => dist({ x, y }, rc) < rc.radius + margin) ||
                    this.asteroids.some(a => dist({ x, y }, a) < a.radius + margin) ||
                    this.clusterAsteroids.some(ca => dist({ x, y }, ca) < ca.radius + margin) ||
                    this.pumices.some(p => p.cells.some(c => c.alive && dist({ x, y }, c) < c.r + margin)) ||
                    this.pumicePolys.some(pp => dist({ x, y }, pp) < pp.radius + margin);
                if (!collides) return [x, y];
            } while (tries < 300);
        }
        return [x, y];
    }

    _safePumicePos(placed) {
        const margin = 54 + 10;
        let x, y, tries = 0;
        do {
            x = rand(80, W - 80);
            y = rand(80, H - 80);
            tries++;
        } while (tries < 200 && (
            this.rocks.some(r        => dist({ x, y }, r)  < r.radius  + margin) ||
            this.rockClusters.some(rc => dist({ x, y }, rc) < rc.radius + margin) ||
            placed.some(p            => dist({ x, y }, p)  < p.radius  + margin)
        ));
        return [x, y];
    }

    _safePumicePolyPos(placed) {
        const margin = 50 + 10;
        let x, y, tries = 0;
        do {
            x = rand(80, W - 80);
            y = rand(80, H - 80);
            tries++;
        } while (tries < 200 && (
            this.rocks.some(r        => dist({ x, y }, r)  < r.radius  + margin) ||
            this.rockClusters.some(rc => dist({ x, y }, rc) < rc.radius + margin) ||
            placed.some(p            => dist({ x, y }, p)  < p.radius  + margin)
        ));
        return [x, y];
    }

    _syncBodies() {
        for (const a of this.asteroids) {
            a.x = a.body.position.x;
            a.y = a.body.position.y;
        }
        for (const ca of this.clusterAsteroids) {
            ca.x = ca.body.position.x;
            ca.y = ca.body.position.y;
        }
    }

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
            const useCluster = this.config.visualStyle === 2;
            const a = useCluster ? new ClusterAsteroid(x, y, 0) : new AsteroidPoly(x, y, 0);
            if (useCluster) this.clusterAsteroids.push(a);
            else            this.asteroids.push(a);
            Matter.World.add(this.engine.world, a.body);
        }
        this._applyAsteroidFilter();
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

    _drawRocks() {
        if (!this.rocks.length) return;

        const off    = this._rockCanvas;
        const offCtx = off.getContext('2d');
        offCtx.clearRect(0, 0, W, H);

        const buildPath = (rock, tctx) => {
            const cos = Math.cos(rock.rot), sin = Math.sin(rock.rot);
            tctx.beginPath();
            rock.verts.forEach(({ a, r }, i) => {
                const lx = Math.cos(a) * r, ly = Math.sin(a) * r;
                const wx = rock.x + cos * lx - sin * ly;
                const wy = rock.y + sin * lx + cos * ly;
                i === 0 ? tctx.moveTo(wx, wy) : tctx.lineTo(wx, wy);
            });
            tctx.closePath();
        };

        // Pass 1: stroke with glow — visible only where not covered by fill
        offCtx.strokeStyle = '#7a5c3a';
        offCtx.lineWidth   = 2.5;
        offCtx.shadowColor = '#4a3820';
        offCtx.shadowBlur  = 10;
        for (const rock of this.rocks) { buildPath(rock, offCtx); offCtx.stroke(); }
        offCtx.shadowBlur  = 0;

        // Pass 2: opaque fill erases internal strokes at overlaps
        offCtx.fillStyle = 'rgb(72, 54, 36)';
        for (const rock of this.rocks) { buildPath(rock, offCtx); offCtx.fill(); }

        ctx.globalAlpha = 0.45;
        ctx.drawImage(off, 0, 0);
        ctx.globalAlpha = 1;
    }

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

        // Life icons (bottom-left, unterhalb der Power-up-Bars)
        for (let i = 0; i < this.lives; i++) {
            ctx.save();
            ctx.translate(14 + i * 21, H - 10);
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

        // Power-up status bars (bottom-left, oberhalb der Life-Icons)
        if (this.ship) {
            const indicators = [];
            if (this.ship.shieldTimer  > 0) indicators.push({ label: 'SH', t: this.ship.shieldTimer,  col: '#4cf' });
            if (this.ship.rapidTimer   > 0) indicators.push({ label: 'RF', t: this.ship.rapidTimer,   col: '#f84' });
            if (this.ship.spreadTimer  > 0) indicators.push({ label: 'SP', t: this.ship.spreadTimer,  col: '#ff4' });
            if (this.ship.heavyTimer   > 0) indicators.push({ label: 'HV', t: this.ship.heavyTimer,   col: '#f64' });

            ctx.font      = '13px monospace';
            ctx.textAlign = 'left';
            const barW = 48, barH = 16, gap = 6;
            indicators.forEach((ind, i) => {
                const bx  = 8 + i * (barW + gap);
                const by  = H - 40;   // oberhalb der Life-Icons (H-10 ± 7px)
                const pct = ind.t / this._powerupDuration;
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

    get _bulletLife()             { return [0.35, 0.65, 1.0][this.config.bulletRange  - 1]; }
    get _powerupChance()          { return [0.05, 0.12, 0.25][this.config.powerupFreq - 1]; }
    get _powerupDuration()        { return [5,    7,    10  ][this.config.powerupFreq - 1]; }
    get _rockCountRange()         { return [[1,5],[5,10],[10,20]][this.config.rockCount - 1]; }
    get _pumiceCountRange()       { return [[0,0],[1,3],[3,6]][this.config.pumiceCount - 1]; }
    get _asteroidCollisionFilter(){ return this.config.asteroidBounce === 2 ? { category: 0x0001, mask: 0xFFFFFFFF, group: 0 } : { group: -1 }; }

    _bounceShip(ox, oy) {
        const dx = this.ship.x - ox, dy = this.ship.y - oy;
        const d  = Math.hypot(dx, dy) || 1;
        const nx = dx / d, ny = dy / d;
        const dot = this.ship.vx * nx + this.ship.vy * ny;
        this.ship.vx -= 2 * dot * nx;
        this.ship.vy -= 2 * dot * ny;
        const spd = Math.hypot(this.ship.vx, this.ship.vy);
        if (spd < 220) { this.ship.vx = nx * 220; this.ship.vy = ny * 220; }
    }

    _applyAsteroidFilter() {
        const f = this._asteroidCollisionFilter;
        for (const a  of this.asteroids)        Matter.Body.set(a.body,  'collisionFilter', f);
        for (const ca of this.clusterAsteroids) Matter.Body.set(ca.body, 'collisionFilter', f);
    }

    _drawConfig() {
        const cx = W / 2;
        const readOnly = this._configPrevState === STATE.PLAYING;

        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign   = 'center';
        ctx.shadowColor = '#4af';
        ctx.shadowBlur  = 24;
        ctx.fillStyle   = '#fff';
        ctx.font        = 'bold 30px monospace';
        ctx.fillText('KONFIGURATION', cx, 44);
        ctx.shadowBlur  = 0;

        if (readOnly) {
            ctx.fillStyle = '#f84';
            ctx.font      = 'bold 12px monospace';
            ctx.fillText('READ ONLY', cx, 62);
        }

        const params = [
            { key: 'mode',           label: 'Modus',                  opts: ['Beginner', 'Novice', 'Expert'] },
            { key: 'bulletRange',    label: 'Reichweite Schüsse',     opts: ['kurz',   'normal', 'weit']     },
            { key: 'powerupFreq',    label: 'Powerups',               opts: ['selten / kurz', 'normal', 'häufig / lang'] },
            { key: 'rockCount',      label: 'Anzahl Rocks',           opts: ['wenige', 'normal', 'viele']    },
            { key: 'pumiceCount',    label: 'Anzahl Bimsstein',       opts: ['keine',  'wenige', 'viele']    },
            { key: 'asteroidBounce', label: 'Asteroiden-Kollisionen', opts: ['aus',    'ein']                },
            { key: 'visualStyle',    label: 'Visueller Stil',          opts: ['Polygon', 'Metaball']            },
        ];

        let y = 80;
        params.forEach((p, i) => {
            const active = i === this._configCursor;
            const val    = this.config[p.key];

            ctx.textAlign = 'center';
            ctx.font      = active ? 'bold 14px monospace' : '13px monospace';
            ctx.fillStyle = active ? '#4af' : '#888';
            ctx.fillText(p.label, cx, y);
            y += 22;

            const count  = p.opts.length;
            const slotW  = 120, gap = 12;
            const totalW = count * slotW + (count - 1) * gap;
            const startX = cx - totalW / 2;

            for (let n = 1; n <= count; n++) {
                const selected = val === n;
                const bx = startX + (n - 1) * (slotW + gap);
                const by = y;

                ctx.fillStyle   = selected ? (active ? '#4af' : '#557') : 'rgba(255,255,255,0.06)';
                ctx.strokeStyle = selected ? (active ? '#4af' : '#557') : 'rgba(255,255,255,0.2)';
                ctx.lineWidth   = 1.5;
                ctx.beginPath();
                ctx.roundRect(bx, by, slotW, 28, 6);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = selected ? '#fff' : '#666';
                ctx.font      = (selected ? 'bold ' : '') + '12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${n}  ${p.opts[n - 1]}`, bx + slotW / 2, by + 18);
            }
            y += 44;
        });

        ctx.fillStyle   = '#555';
        ctx.font        = '13px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText(
            readOnly
                ? 'ENTER / C  Zurück ins Spiel'
                : '↑ ↓  Parameter   ← →  Wert   ENTER  Spiel starten',
            cx, 548
        );
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
        ctx.fillText('SHIFT + ← →  —  strafe', cx, cy + 36);
        ctx.fillText('SPACE / Z  —  fire', cx, cy + 62);

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

    _drawHelp() {
        const cx = W / 2, cy = H / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign   = 'center';
        ctx.shadowColor = '#4af';
        ctx.shadowBlur  = 24;
        ctx.fillStyle   = '#fff';
        ctx.font        = 'bold 36px monospace';
        ctx.fillText('HILFE', cx, cy - 200);
        ctx.shadowBlur = 0;

        const _lm  = new Date(document.lastModified);
        const _pad = n => String(n).padStart(2, '0');
        ctx.fillStyle = '#555';
        ctx.font      = '12px monospace';
        ctx.fillText(
            `Stand: ${_pad(_lm.getDate())}.${_pad(_lm.getMonth()+1)}.${_lm.getFullYear()}  ${_pad(_lm.getHours())}:${_pad(_lm.getMinutes())} Uhr`,
            cx, cy - 178
        );

        const sections = [
            { head: 'STEUERUNG', rows: [
                ['Pfeiltasten / WASD',    'Drehen & Schub'],
                ['Shift + ← / →',        'Seitwärts'],
                ['Space / Z',             'Schießen'],
                ['Enter / Space',         'Starten / Neustart'],
                ['H / ESC',               'Hilfe ein/aus'],
                ['C',                     'Konfiguration'],
                ['S / Pfeil-unten',       'Teleportieren'],
            ]},
            { head: 'POWER-UPS', rows: [
                ['SH — Shield',  'Absorbiert einen Treffer'],
                ['RF — Rapid',   'Schnellfeuer'],
                ['SP — Spread',  'Dreifachschuss (5 s)'],
            ]},
            { head: 'PUNKTE', rows: [
                ['Großer Asteroid',   '20'],
                ['Mittlerer Asteroid','50'],
                ['Kleiner Asteroid',  '100'],
                ['Großes UFO',        '200'],
                ['Kleines UFO',       '1 000'],
                ['Extra-Leben',       'alle 10 000 Pkt.'],
            ]},
        ];

        let y = cy - 148;
        ctx.font = '13px monospace';

        for (const sec of sections) {
            ctx.fillStyle   = '#4af';
            ctx.font        = 'bold 14px monospace';
            ctx.textAlign   = 'center';
            ctx.fillText(sec.head, cx, y);
            y += 22;

            ctx.font      = '13px monospace';
            ctx.fillStyle = '#ccc';
            for (const [left, right] of sec.rows) {
                ctx.textAlign = 'right';
                ctx.fillText(left, cx - 12, y);
                ctx.fillStyle = '#888';
                ctx.fillText('—', cx, y);
                ctx.fillStyle = '#ccc';
                ctx.textAlign = 'left';
                ctx.fillText(right, cx + 12, y);
                y += 19;
            }
            y += 10;
        }

        if (Math.floor(Date.now() / 520) % 2) {
            ctx.fillStyle = '#666';
            ctx.font      = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('H oder ESC — Zurück zum Spiel', cx, cy + 222);
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

