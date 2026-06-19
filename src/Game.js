import { W, H, rand, randInt, TAU, dist, clamp } from "./utils.js";
import {
  WW,
  WH,
  setWorldDimensions,
  CONFIG_PARAMS,
  GAME_MODES,
  EXTRA_LIFE_SCORE,
  UFO_SPAWN_MIN,
  UFO_HUM_INTERVAL,
  INVULNERABLE_TIME,
  BEAT_INTERVAL_MAX,
  BEAT_INTERVAL_MIN,
  BEAT_DENSITY_FACTOR,
  ASTEROID_SPEED,
  ASTEROID_SPIN_FACTOR,
  SHIP_SIZE,
  SHIP_HULL_FACTOR,
  MAX_BULLETS,
  UFO_SMALL_SCORE_THRESHOLD,
  UFO_SMALL_CHANCE,
  UFO_SPAWN_JITTER,
  SOLAR_START_LEVEL,
  SOLAR_MAX_COUNT,
  SOLAR_SATELLITE_MIN,
  SOLAR_SATELLITE_MAX,
  SOLAR_TETHER_MIN,
  SOLAR_TETHER_MAX,
  SOLAR_ORBIT_SPEED_MIN,
  SOLAR_ORBIT_SPEED_MAX,
  SOLAR_SPAWN_MARGIN,
  TURRET_START_LEVEL,
  TURRET_MAX_COUNT,
  TURRET_RADIUS,
  PUMICE_RADIUS_MAX,
  PUMICE_COUNT_RANGES,
  SPAWN_SAFE_RADIUS_FACTOR,
  BULLET_LIFE_LEVELS,
  POWERUP_CHANCE_LEVELS,
  POWERUP_DURATION_LEVELS,
  INITIAL_ROCKS,
  MAX_ROCKS_PER_LEVEL,
  RESPAWN_DELAY,
  SHIP_DEATH_PARTICLES,
  DEBRIS_COUNT_MIN,
  DEBRIS_COUNT_MAX,
  DEBRIS_SPEED_MIN,
  DEBRIS_SPEED_MAX,
  BOOM_PARTICLE_COUNTS,
  STARS,
  STAR_PARALLAX,
  bgCanvas,
  DBG_COLLISION_WARN,
  DBG_COLLISION_CRIT,
  DBG_FRAME_WARN_MS,
  DBG_FRAME_CRIT_MS,
  DBG_FPS_WARN,
  DBG_FPS_CRIT,
} from "./Globals.js";
import { Input } from "./input.js";
import { Matter } from "./physics.js";
import { World } from "./World.js";
import { Particle } from "./entities/Particle.js";
import { Debris } from "./entities/Debris.js";
import { Turret } from "./entities/Turret.js";
import { SolarSystem } from "./entities/SolarSystem.js";
import { BackgroundSaturn } from "./entities/BackgroundSaturn.js";
import { MetaballMode } from "./VisualMode.js";
import { CollisionSystem } from "./CollisionSystem.js";
import { UIRenderer } from "./UIRenderer.js";

// ─── Game ────────────────────────────────────────────────────────────────────
export const STATE = Object.freeze({
  START: 0,
  PLAYING: 1,
  DEAD: 2,
  GAMEOVER: 3,
  HELP: 4,
  CONFIG: 5,
  CONFIG_DETAIL: 6,
  QUIT_CONFIRM: 7,
});

const _VALID_TRANSITIONS = {
  [STATE.START]: [STATE.CONFIG],
  [STATE.GAMEOVER]: [STATE.CONFIG],
  [STATE.CONFIG]: [STATE.START, STATE.GAMEOVER, STATE.PLAYING, STATE.CONFIG_DETAIL],
  [STATE.CONFIG_DETAIL]: [STATE.CONFIG],
  [STATE.PLAYING]: [STATE.CONFIG, STATE.DEAD, STATE.HELP, STATE.QUIT_CONFIRM],
  [STATE.DEAD]: [STATE.PLAYING, STATE.GAMEOVER],
  [STATE.HELP]: [STATE.PLAYING],
  [STATE.QUIT_CONFIRM]: [STATE.PLAYING, STATE.GAMEOVER],
};

const _CONFIG_PARAM_KEYS = Object.keys(CONFIG_PARAMS);

const _BOOM_SOUNDS = ["explodeLarge", "explodeMed", "explodeSmall"];

export class Game {
  // ─── World proxies ──────────────────────────────────────────────────────────
  get engine() {
    return this.world.engine;
  }
  get snd() {
    return this.world.snd;
  }
  get mode() {
    return this.world.mode;
  }
  set mode(v) {
    this.world.mode = v;
  }
  get saturn() {
    return this.world.saturn;
  }
  set saturn(v) {
    this.world.saturn = v;
  }
  get ship() {
    return this.world.ship;
  }
  set ship(v) {
    this.world.ship = v;
  }
  get bullets() {
    return this.world.bullets;
  }
  set bullets(v) {
    this.world.bullets = v;
  }
  get asteroids() {
    return this.world.asteroids;
  }
  set asteroids(v) {
    this.world.asteroids = v;
  }
  get particles() {
    return this.world.particles;
  }
  set particles(v) {
    this.world.particles = v;
  }
  get powerups() {
    return this.world.powerups;
  }
  set powerups(v) {
    this.world.powerups = v;
  }
  get ufos() {
    return this.world.ufos;
  }
  set ufos(v) {
    this.world.ufos = v;
  }
  get ufoBullets() {
    return this.world.ufoBullets;
  }
  set ufoBullets(v) {
    this.world.ufoBullets = v;
  }
  get rocks() {
    return this.world.rocks;
  }
  set rocks(v) {
    this.world.rocks = v;
  }
  get pumices() {
    return this.world.pumices;
  }
  set pumices(v) {
    this.world.pumices = v;
  }
  get debris() {
    return this.world.debris;
  }
  set debris(v) {
    this.world.debris = v;
  }
  get solarSystems() {
    return this.world.solarSystems;
  }
  set solarSystems(v) {
    this.world.solarSystems = v;
  }
  get turrets() {
    return this.world.turrets;
  }
  set turrets(v) {
    this.world.turrets = v;
  }
  get deadTimer() {
    return this.world.deadTimer;
  }
  set deadTimer(v) {
    this.world.deadTimer = v;
  }
  get ufoTimer() {
    return this.world.ufoTimer;
  }
  set ufoTimer(v) {
    this.world.ufoTimer = v;
  }
  get ufoHumTimer() {
    return this.world.ufoHumTimer;
  }
  set ufoHumTimer(v) {
    this.world.ufoHumTimer = v;
  }
  get beatTimer() {
    return this.world.beatTimer;
  }
  set beatTimer(v) {
    this.world.beatTimer = v;
  }
  get beatInterval() {
    return this.world.beatInterval;
  }
  set beatInterval(v) {
    this.world.beatInterval = v;
  }
  get beatPhase() {
    return this.world.beatPhase;
  }
  set beatPhase(v) {
    this.world.beatPhase = v;
  }

  constructor() {
    this.world = new World();

    this.hiScore = parseInt(localStorage.getItem("ast_hi") || "0");
    this.state = STATE.START;
    this._debugCollision = false;
    this._dbgCC = 0;
    this._dbgFPS = 0;
    this._dbgFrameMs = 0;
    this._dbgPeakCC = 0;
    this._dbgPeakTTL = 0;

    this.score = 0;
    this.lives = 3;
    this.level = 0;
    this.nextExtra = EXTRA_LIFE_SCORE;
    this.t = 0;

    this._camX = 0;
    this._camY = 0;

    this.collisions = new CollisionSystem(this);
    this.ui = new UIRenderer(this);

    this.config = {
      mode: 3,

      bulletRange: 1,
      powerupFreq: 1,
      rockCount: 3,
      pumiceCount: 3,
      asteroidBounce: 2,
      worldSize: 3,
    };
    this._configCursor = 0;
    this._detailCursor = 0;
    this._configFocus = "mode";
    this._configPrevState = STATE.START;
  }

  start() {
    setWorldDimensions(W * (this.config.worldSize || 1), H * (this.config.worldSize || 1));
    this.saturn = new BackgroundSaturn(WW / 2, WH / 2);
    this._camX = 0;
    this._camY = 0;
    this.mode = new MetaballMode();
    this.score = 0;
    this.lives = 3;
    this.level = 0;
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerups = [];
    this.ufos = [];
    this.ufoBullets = [];
    this.debris = [];
    this.solarSystems = [];
    this.turrets = [];
    Matter.World.clear(this.engine.world, false);
    const rockCount = randInt(1, this.config.rockCount);
    this.rocks = Array.from({ length: rockCount }, () =>
      this.mode.createRock(rand(60, WW - 60), rand(60, WH - 60)),
    );
    this.deadTimer = 0;
    this.nextExtra = EXTRA_LIFE_SCORE;
    this.ufoTimer = UFO_SPAWN_MIN;
    this.ufoHumTimer = 0;
    this.beatTimer = 1.0;
    this.beatPhase = 0;
    const [pcMin, pcMax] = this._pumiceCountRange;
    const pumices = [];
    for (let i = 0; i < randInt(pcMin, pcMax); i++) {
      const [px, py] = this._safePumicePos(pumices);
      pumices.push(this.mode.createPumice(px, py));
    }
    this.pumices = pumices;
    this.ship = this.mode.createShip();
    [this.ship.x, this.ship.y] = this._safeShipPos();
    Matter.Body.setPosition(this.ship.body, { x: this.ship.x, y: this.ship.y });
    Matter.World.add(this.engine.world, this.ship.body);
    Matter.World.add(
      this.engine.world,
      this.rocks.map((r) => r.body),
    );
    for (const p of this.pumices) {
      if (p.cells)
        Matter.World.add(
          this.engine.world,
          p.cells.map((c) => c.body),
        );
      else if (p.body) Matter.World.add(this.engine.world, p.body);
    }
    this._nextLevel();
    this._transitionTo(STATE.PLAYING);
  }

  _updateAudio(dt) {
    this.beatTimer -= dt;
    if (this.beatTimer <= 0) {
      this.beatInterval = clamp(
        BEAT_INTERVAL_MAX - this.asteroids.length * BEAT_DENSITY_FACTOR,
        BEAT_INTERVAL_MIN,
        BEAT_INTERVAL_MAX,
      );
      this.beatTimer = this.beatInterval;
      this.beatPhase ^= 1;
      this.snd.throb(this.beatPhase);
    }
    if (this.ufos.length > 0) {
      this.ufoHumTimer -= dt;
      if (this.ufoHumTimer <= 0) {
        this.snd.ufoHum();
        this.ufoHumTimer = UFO_HUM_INTERVAL;
      }
    }
  }

  // All logic that runs only in STATE.PLAYING.
  _updatePlayingState(dt) {
    if (Input.wasPressed("F2") || Input.wasPressed("KeyQ"))
      this._debugCollision = !this._debugCollision;

    this._updateShipAndBullets(dt);
    this._updateUFOs(dt);
    this.collisions.updateBullet();
    this.collisions.updateShip();
    this._tickDebris(dt);
    this.solarSystems = this.solarSystems.filter((s) => s.update(dt));
    this.turrets = this.turrets.filter((t) => t.update(dt));
    this._updateDebugStats();

    if (
      this.asteroids.filter((a) => !a.isSatellite).length === 0 &&
      this.solarSystems.length === 0
    ) {
      this.snd.levelUp();
      this._nextLevel();
      if (this.ship) this.ship.invulnerable = INVULNERABLE_TIME;
    }

    if (this.ship) {
      this._camX = Math.max(0, Math.min(this.ship.x - W / 2, WW - W));
      this._camY = Math.max(0, Math.min(this.ship.y - H / 2, WH - H));
    }

    Input.flush();
  }

  update(dt) {
    dt = Math.min(dt, 1 / 20);
    this.t += dt;
    if (dt > 0) {
      this._dbgFPS += (1 / dt - this._dbgFPS) * 0.1;
      this._dbgFrameMs += (dt * 1000 - this._dbgFrameMs) * 0.1;
    }

    if (this._updateStateInput()) return;

    this._updateAudio(dt);

    // Update universally (all non-START states)
    if (this.saturn) this.saturn.update(dt);
    this.particles = this.particles.filter((p) => p.update(dt));
    this.powerups = this.powerups.filter((p) => p.update(dt));
    this.ufoBullets = this.ufoBullets.filter((b) => b.update(dt));

    if (this.state === STATE.DEAD) {
      this._updateDeadState(dt);
      return;
    }

    this._updatePlayingState(dt);
  }

  // All world-space entity drawing, inside the camera transform.
  _drawEntities() {
    ctx.save();
    ctx.translate(-this._camX, -this._camY);
    if (this.saturn) this.saturn.draw(ctx);
    this.turrets.forEach((t) => t.draw(ctx));
    this.rocks.forEach((r) => r.draw(ctx));
    this.pumices.forEach((p) => p.draw(ctx));
    this.solarSystems.forEach((s) => s.draw(ctx)); // centers drawn before satellites
    this.asteroids.forEach((a) => a.draw(ctx));
    this.debris.forEach((d) => d.draw(ctx));
    this.powerups.forEach((p) => p.draw(ctx));
    this.ufos.forEach((u) => u.draw(ctx));
    this.ufoBullets.forEach((b) => b.draw(ctx));
    this.bullets.forEach((b) => b.draw(ctx));
    this.particles.forEach((p) => p.draw(ctx));
    if (this.ship) this.ship.draw(ctx);
    if (this._debugCollision) this._drawDebugOverlay();
    ctx.restore(); // back to screen space
  }

  draw() {
    ctx.drawImage(bgCanvas, 0, 0);

    ctx.shadowBlur = 0;
    for (const s of STARS) {
      const sx = (((s.x - this._camX * STAR_PARALLAX) % W) + W) % W;
      const sy = (((s.y - this._camY * STAR_PARALLAX) % H) + H) % H;
      const alpha = s.a * (0.55 + 0.45 * Math.sin(this.t * 1.4 + s.phase));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.state === STATE.START) {
      this.ui.drawStart(ctx);
      return;
    }
    if (this.state === STATE.HELP) {
      this.ui.drawHelp(ctx);
      return;
    }
    if (this.state === STATE.CONFIG) {
      this.ui.drawConfig(ctx);
      return;
    }
    if (this.state === STATE.CONFIG_DETAIL) {
      this.ui.drawConfigDetail(ctx);
      return;
    }

    ctx.save();
    ctx.translate(-this._camX, -this._camY);
    if (this.saturn) this.saturn.draw(ctx);
    this.turrets.forEach((t) => t.draw(ctx));
    this.rocks.forEach((r) => r.draw(ctx));
    this.pumices.forEach((p) => p.draw(ctx));
    this.solarSystems.forEach((s) => s.draw(ctx));
    this.asteroids.forEach((a) => a.draw(ctx));
    this.debris.forEach((d) => d.draw(ctx));
    this.powerups.forEach((p) => p.draw(ctx));
    this.ufos.forEach((u) => u.draw(ctx));
    this.ufoBullets.forEach((b) => b.draw(ctx));
    this.bullets.forEach((b) => b.draw(ctx));
    this.particles.forEach((p) => p.draw(ctx));
    if (this.ship) this.ship.draw(ctx);
    if (this._debugCollision) this._drawDebugOverlay();
    ctx.restore();

    this.ui.drawHUD(ctx);
    if (this._debugCollision) this._drawDebugStats();
    if (this.state === STATE.QUIT_CONFIRM) this.ui.drawQuitConfirm(ctx);
    if (this.state === STATE.GAMEOVER) this.ui.drawGameOver(ctx);
  }

  _drawDebugOverlay() {
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 2;
    const drawC = (x, y, r, col) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.strokeStyle = col;
      ctx.stroke();
    };
    this.rocks.forEach((r) => drawC(r.x, r.y, r.collisionRadius, "#f44"));
    this.asteroids.forEach((a) => drawC(a.x, a.y, a.radius, "#f84"));
    this.pumices.forEach((p) => {
      if (p.cells) p.cells.filter((c) => c.alive).forEach((c) => drawC(c.x, c.y, c.r, "#f4f"));
      else if (p.alive) drawC(p.x, p.y, p.radius, "#f4f");
    });
    this.ufos.forEach((u) => drawC(u.x, u.y, u.radius, "#f00"));
    this.ufoBullets.forEach((b) => drawC(b.x, b.y, b.radius, "#f60"));
    this.bullets.forEach((b) => drawC(b.x, b.y, b.radius, "#0f4"));
    this.powerups.forEach((p) => drawC(p.x, p.y, p.radius, "#ff0"));
    if (this.ship) {
      drawC(this.ship.x, this.ship.y, this.ship.radius, "#4ff");
      if (this.ship.hitRadius > this.ship.radius)
        drawC(this.ship.x, this.ship.y, this.ship.hitRadius, "#0cf");
    }
    ctx.restore();
  }

  _drawDebugStats() {
    const fps = Math.round(this._dbgFPS);
    const ms = this._dbgFrameMs.toFixed(1);
    const entities =
      this.asteroids.length +
      this.rocks.length +
      this.pumices.length +
      this.ufos.length +
      this.ufoBullets.length +
      this.bullets.length +
      this.powerups.length +
      this.debris.length +
      (this.ship ? 1 : 0);

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.shadowBlur = 0;
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    const line = (text, col, y) => {
      ctx.fillStyle = col;
      ctx.fillText(text, W - 6, y);
    };
    line(`Particles: ${this.particles.length}`, "#888", H - 76);
    line(`Entities:  ${entities}`, "#aaa", H - 62);
    line(
      `Collision: ${this._dbgCC} / Peak: ${this._dbgPeakCC}`,
      this._dbgPeakCC > DBG_COLLISION_CRIT
        ? "#f84"
        : this._dbgPeakCC > DBG_COLLISION_WARN
          ? "#ff4"
          : "#4f8",
      H - 48,
    );
    line(
      `Frame:     ${ms} ms`,
      parseFloat(ms) > DBG_FRAME_CRIT_MS
        ? "#f84"
        : parseFloat(ms) > DBG_FRAME_WARN_MS
          ? "#ff4"
          : "#4f8",
      H - 34,
    );
    line(
      `FPS:       ${fps}`,
      fps < DBG_FPS_CRIT ? "#f84" : fps < DBG_FPS_WARN ? "#ff4" : "#4f8",
      H - 20,
    );
    ctx.restore();
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  _safeShipPos() {
    const sR = SHIP_SIZE * SHIP_HULL_FACTOR;
    let x,
      y,
      tries = 0;
    for (const margin of [sR + 50, sR + 15]) {
      tries = 0;
      do {
        x = rand(60, WW - 60);
        y = rand(60, WH - 60);
        tries++;
        const collides =
          this.rocks.some((r) => dist({ x, y }, r) < r.collisionRadius + margin) ||
          this.asteroids.some((a) => dist({ x, y }, a) < a.collisionRadius + margin) ||
          this.pumices.some((p) => p.pointInsideMargin(x, y, margin));
        if (!collides) return [x, y];
      } while (tries < 300);
    }
    return [x, y];
  }

  _safePumicePos(placed) {
    const margin = PUMICE_RADIUS_MAX + 10;
    let x,
      y,
      tries = 0;
    do {
      x = rand(80, WW - 80);
      y = rand(80, WH - 80);
      tries++;
    } while (
      tries < 200 &&
      (this.rocks.some((r) => dist({ x, y }, r) < r.collisionRadius + margin) ||
        placed.some((p) => dist({ x, y }, p) < p.radius + margin))
    );
    return [x, y];
  }

  _syncBodies() {
    for (const a of this.asteroids) {
      a.x = a.body.position.x;
      a.y = a.body.position.y;
      a.rot = a.body.angle;
    }
  }

  _capAsteroidSpeeds() {
    for (const a of this.asteroids) {
      const v = a.body.velocity;
      const spd = Math.hypot(v.x, v.y);
      const maxSpd = (ASTEROID_SPEED[a.size] * 2.5) / 60;
      if (spd > maxSpd) {
        Matter.Body.setVelocity(a.body, {
          x: (v.x / spd) * maxSpd,
          y: (v.y / spd) * maxSpd,
        });
      }
    }
  }

  _asteroidsForLevel() {
    return Math.min(INITIAL_ROCKS + this.level - 1, MAX_ROCKS_PER_LEVEL);
  }

  _solarCountForLevel() {
    return Math.min(Math.floor((this.level - SOLAR_START_LEVEL) / 2) + 1, SOLAR_MAX_COUNT);
  }

  _turretCountForLevel() {
    return Math.min(this.level - TURRET_START_LEVEL + 1, TURRET_MAX_COUNT);
  }

  _nextLevel() {
    this.level++;
    const count = this._asteroidsForLevel();
    const cx = WW / 2,
      cy = WH / 2;
    const maxBumps = Math.min(Math.max(this.level - 1, 1), 7);
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = rand(0, WW);
        y = rand(0, WH);
      } while (dist({ x, y }, { x: cx, y: cy }) < WW * SPAWN_SAFE_RADIUS_FACTOR);
      const a = this.mode.createAsteroid(x, y, 0, null, maxBumps);
      this.asteroids.push(a);
      Matter.World.add(this.engine.world, a.body);
    }
    this._applyAsteroidFilter();

    if (this.level >= SOLAR_START_LEVEL) {
      const solarCount = this._solarCountForLevel();
      for (let si = 0; si < solarCount; si++) {
        const ax = rand(WW * SOLAR_SPAWN_MARGIN, WW * (1 - SOLAR_SPAWN_MARGIN));
        const ay = rand(WH * SOLAR_SPAWN_MARGIN, WH * (1 - SOLAR_SPAWN_MARGIN));
        const satelliteCount = randInt(SOLAR_SATELLITE_MIN, SOLAR_SATELLITE_MAX);
        const sys = new SolarSystem(ax, ay, satelliteCount);
        this.solarSystems.push(sys);
        Matter.World.add(this.engine.world, sys.body);
        for (let j = 0; j < satelliteCount; j++) {
          const tetherLen = rand(SOLAR_TETHER_MIN, SOLAR_TETHER_MAX);
          const spawnAngle = (j / satelliteCount) * TAU + rand(-0.3, 0.3);
          const sx = ax + Math.cos(spawnAngle) * tetherLen;
          const sy = ay + Math.sin(spawnAngle) * tetherLen;
          const orbitSpeed = rand(SOLAR_ORBIT_SPEED_MIN, SOLAR_ORBIT_SPEED_MAX);
          const sat = this.mode.createSatellite(sx, sy, ax, ay, sys, 2, 0, orbitSpeed);
          this.asteroids.push(sat);
          sys.satellites.push(sat);
          Matter.World.add(this.engine.world, [sat.body, sat.constraint]);
          Matter.Body.set(sat.body, "collisionFilter", this._asteroidCollisionFilter);
        }
      }
    }

    if (this.level >= TURRET_START_LEVEL) {
      const turretCount = this._turretCountForLevel();
      for (let i = 0; i < turretCount; i++) {
        let tx, ty;
        do {
          tx = rand(TURRET_RADIUS * 2, WW - TURRET_RADIUS * 2);
          ty = rand(TURRET_RADIUS * 2, WH - TURRET_RADIUS * 2);
        } while (dist({ x: tx, y: ty }, { x: WW / 2, y: WH / 2 }) < WW * SPAWN_SAFE_RADIUS_FACTOR);
        this.turrets.push(new Turret(tx, ty, (b) => this.ufoBullets.push(b)));
      }
    }
  }

  _addScore(pts) {
    this.score += pts;
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      localStorage.setItem("ast_hi", this.hiScore);
    }
    if (this.score >= this.nextExtra) {
      this.lives++;
      this.nextExtra += EXTRA_LIFE_SCORE;
      this.snd.extraLife();
    }
  }

  _boom(x, y, size) {
    for (let i = 0; i < BOOM_PARTICLE_COUNTS[size]; i++) this.particles.push(new Particle(x, y));
    this.snd[_BOOM_SOUNDS[size]]();
  }

  _transitionTo(newState) {
    if (this._debugCollision) {
      const allowed = _VALID_TRANSITIONS[this.state] ?? [];
      if (!allowed.includes(newState)) {
        console.warn(`[state] unexpected transition ${this.state} → ${newState}`);
      }
    }
    this.state = newState;
  }

  _destroyAsteroid(asteroid, bulletAngle, debrisVx, debrisVy, spinCross) {
    this._boom(asteroid.x, asteroid.y, asteroid.size);
    this._spawnDebris(asteroid.x, asteroid.y, debrisVx, debrisVy);
    const children = asteroid.split(bulletAngle);
    for (const c of children) c.rotSpeed += spinCross * ASTEROID_SPIN_FACTOR;
    asteroid.onDestroy(this);
    this._addAsteroidsToWorld(children);
    return children;
  }

  _killShip() {
    for (let i = 0; i < SHIP_DEATH_PARTICLES; i++)
      this.particles.push(new Particle(this.ship.x, this.ship.y, "#8ef"));
    this.snd.shipDie();
    this.lives--;
    Matter.World.remove(this.engine.world, this.ship.body);
    this.ship = null;
    this._transitionTo(STATE.DEAD);
    this.deadTimer = RESPAWN_DELAY;
    this.bullets = [];
    this.ufoBullets = [];
  }

  _updateStateInput() {
    switch (this.state) {
      case STATE.START:
      case STATE.GAMEOVER:
        return this._handleStartInput();
      case STATE.HELP:
        return this._handleHelpInput();
      case STATE.CONFIG:
        return this._handleConfigInput();
      case STATE.CONFIG_DETAIL:
        return this._handleConfigDetailInput();
      case STATE.QUIT_CONFIRM:
        return this._handleQuitConfirmInput();
      case STATE.PLAYING:
        return this._handlePlayingInput();
      default:
        return false;
    }
  }

  _handleStartInput() {
    if (Input.start() || Input.config()) {
      this._configPrevState = this.state;
      this._configFocus = "mode";
      this._transitionTo(STATE.CONFIG);
    }
    Input.flush();
    return true;
  }

  _handleHelpInput() {
    if (Input.help() || Input.wasPressed("Escape")) this._transitionTo(STATE.PLAYING);
    Input.flush();
    return true;
  }

  _cfgFocusNav() {
    if (Input.wasPressed("ArrowDown") && this._configFocus === "mode")
      this._configFocus = "details";
    if (Input.wasPressed("ArrowUp") && this._configFocus === "details") this._configFocus = "mode";
  }

  _cfgModeChange(readOnly) {
    if (readOnly) return;
    const prevMode = this.config.mode;
    if (Input.wasPressed("ArrowLeft")) this.config.mode = Math.max(1, this.config.mode - 1);
    if (Input.wasPressed("ArrowRight")) this.config.mode = Math.min(3, this.config.mode + 1);
    if (this.config.mode !== prevMode) {
      Object.assign(this.config, GAME_MODES[this.config.mode - 1]);
      this._applyAsteroidFilter();
    }
  }

  _handleConfigInput() {
    const readOnly = this._configPrevState === STATE.PLAYING;
    this._cfgFocusNav();
    this._cfgModeChange(readOnly);

    if (
      Input.wasPressed("KeyD") ||
      (Input.wasPressed("Enter") && this._configFocus === "details")
    ) {
      this._detailCursor = 0;
      this._transitionTo(STATE.CONFIG_DETAIL);
      Input.flush();
      return true;
    }

    if (Input.wasPressed("Escape")) {
      this._transitionTo(this._configPrevState);
      Input.flush();
      return true;
    }

    if ((Input.wasPressed("Enter") && this._configFocus === "mode") || Input.config()) {
      if (readOnly) this._transitionTo(STATE.PLAYING);
      else this.start();
    }
    Input.flush();
    return true;
  }

  _cfgDetailNav(readOnly) {
    if (readOnly) return;
    const params = _CONFIG_PARAM_KEYS;
    if (Input.wasPressed("ArrowUp"))
      this._detailCursor = (this._detailCursor + params.length - 1) % params.length;
    if (Input.wasPressed("ArrowDown"))
      this._detailCursor = (this._detailCursor + 1) % params.length;
    const key = params[this._detailCursor];
    if (Input.wasPressed("ArrowLeft")) this.config[key] = Math.max(1, this.config[key] - 1);
    if (Input.wasPressed("ArrowRight"))
      this.config[key] = Math.min(CONFIG_PARAMS[key].max, this.config[key] + 1);
    if (key === "asteroidBounce") this._applyAsteroidFilter();
  }

  _handleConfigDetailInput() {
    const readOnly = this._configPrevState === STATE.PLAYING;
    const params = _CONFIG_PARAM_KEYS;
    if (!readOnly) {
      if (Input.wasPressed("ArrowUp"))
        this._detailCursor = (this._detailCursor + params.length - 1) % params.length;
      if (Input.wasPressed("ArrowDown"))
        this._detailCursor = (this._detailCursor + 1) % params.length;
      const key = params[this._detailCursor];
      if (Input.wasPressed("ArrowLeft")) this.config[key] = Math.max(1, this.config[key] - 1);
      if (Input.wasPressed("ArrowRight"))
        this.config[key] = Math.min(CONFIG_PARAMS[key].max, this.config[key] + 1);
      if (key === "asteroidBounce") this._applyAsteroidFilter();
    }
    if (Input.wasPressed("Escape") || Input.wasPressed("KeyD") || Input.wasPressed("Enter")) {
      this._configFocus = "mode";
      this._transitionTo(STATE.CONFIG);
    }
    Input.flush();
    return true;
  }

  _handleQuitConfirmInput() {
    if (Input.wasPressed("KeyY") || Input.wasPressed("KeyZ")) {
      this._transitionTo(STATE.GAMEOVER);
    } else if (Input.wasPressed("KeyN") || Input.wasPressed("Escape")) {
      this._transitionTo(STATE.PLAYING);
    }
    Input.flush();
    return true;
  }

  _handlePlayingInput() {
    if (Input.wasPressed("Escape")) {
      this._transitionTo(STATE.QUIT_CONFIRM);
      Input.flush();
      return true;
    }
    if (Input.help()) {
      this._transitionTo(STATE.HELP);
      Input.flush();
      return true;
    }
    if (Input.config()) {
      this._configPrevState = STATE.PLAYING;
      this._configFocus = "mode";
      this._transitionTo(STATE.CONFIG);
      Input.flush();
      return true;
    }
    return false;
  }

  _updateDeadState(dt) {
    this.deadTimer -= dt;
    this.asteroids.forEach((a) => a.update(dt));
    this.ufos = this.ufos.filter((u) => u.update(dt, null));
    this.solarSystems = this.solarSystems.filter((s) => s.update(dt));
    Matter.Engine.update(this.engine, dt * 1000);
    this._syncBodies();
    this._capAsteroidSpeeds();
    this._tickDebris(dt);
    if (this.deadTimer <= 0) {
      if (this.lives > 0) {
        this.ship = this.mode.createShip();
        [this.ship.x, this.ship.y] = this._safeShipPos();
        Matter.Body.setPosition(this.ship.body, {
          x: this.ship.x,
          y: this.ship.y,
        });
        Matter.World.add(this.engine.world, this.ship.body);
        this._transitionTo(STATE.PLAYING);
      } else {
        this._transitionTo(STATE.GAMEOVER);
      }
    }
    Input.flush();
  }

  _updateShipAndBullets(dt) {
    this.ship.update(dt);

    if (this.ship.thrusting) {
      for (let i = 0; i < 2; i++) {
        const ex = this.ship.x - Math.cos(this.ship.angle) * SHIP_SIZE * 0.35;
        const ey = this.ship.y - Math.sin(this.ship.angle) * SHIP_SIZE * 0.35;
        const p = new Particle(ex, ey, `hsl(${rand(20, 50)},100%,60%)`);
        p.vx = -Math.cos(this.ship.angle) * rand(40, 100) + rand(-25, 25);
        p.vy = -Math.sin(this.ship.angle) * rand(40, 100) + rand(-25, 25);
        p.life = rand(0.1, 0.28);
        p.maxLife = p.life;
        p.size = rand(0.8, 2.0);
        this.particles.push(p);
      }
    }

    if (Input.teleport() && this.ship.invulnerable <= 0) {
      const [tx, ty] = this._safeShipPos();
      this.ship.teleport(tx, ty);
      this.snd.powerUp("shield");
    }

    if (this.bullets.length < MAX_BULLETS && this.ship.canFire()) {
      this.bullets.push(...this.ship.fire(this._bulletLife));
      this.snd.shoot();
    }

    this.bullets = this.bullets.filter((b) => b.update(dt));
    this.asteroids.forEach((a) => a.update(dt));

    Matter.Body.setPosition(this.ship.body, { x: this.ship.x, y: this.ship.y });
    Matter.Body.setVelocity(this.ship.body, {
      x: this.ship.vx / 60,
      y: this.ship.vy / 60,
    });

    Matter.Engine.update(this.engine, dt * 1000);
    this._syncBodies();
    this._capAsteroidSpeeds();
  }

  _updateUFOs(dt) {
    this.ufoTimer -= dt;
    if (this.ufoTimer <= 0) {
      const size =
        this.score >= UFO_SMALL_SCORE_THRESHOLD && Math.random() < UFO_SMALL_CHANCE ? 1 : 0;
      this.ufos.push(this.mode.createUfo(size, (b) => this.ufoBullets.push(b)));
      this.ufoTimer = UFO_SPAWN_MIN + rand(0, UFO_SPAWN_JITTER);
    }
    this.ufos = this.ufos.filter((u) => u.update(dt, this.ship));
  }

  _updateDebugStats() {
    if (!this._debugCollision) return;
    const pumiceUnits = this.pumices.reduce(
      (s, p) => s + (p.cells ? p.cells.filter((c) => c.alive).length : 1),
      0,
    );
    const perBullet = this.asteroids.length + this.ufos.length + this.rocks.length + pumiceUnits;
    const shipChecks = this.ship
      ? this.asteroids.length +
        this.rocks.length +
        pumiceUnits +
        this.ufos.length +
        this.ufoBullets.length +
        this.powerups.length
      : 0;
    this._dbgCC = this.bullets.length * perBullet + shipChecks;
    if (this._dbgCC > this._dbgPeakCC) {
      this._dbgPeakCC = this._dbgCC;
      this._dbgPeakTTL = 120;
    } else if (--this._dbgPeakTTL <= 0) {
      this._dbgPeakCC = this._dbgCC;
      this._dbgPeakTTL = 120;
    }
  }

  get _bulletLife() {
    return BULLET_LIFE_LEVELS[this.config.bulletRange - 1];
  }
  get _powerupChance() {
    return POWERUP_CHANCE_LEVELS[this.config.powerupFreq - 1];
  }
  get _powerupDuration() {
    return POWERUP_DURATION_LEVELS[this.config.powerupFreq - 1];
  }
  get _pumiceCountRange() {
    return PUMICE_COUNT_RANGES[this.config.pumiceCount - 1];
  }
  get isConfigReadOnly() {
    return this._configPrevState === STATE.PLAYING;
  }

  get _asteroidCollisionFilter() {
    return this.config.asteroidBounce === 2
      ? { category: 0x0001, mask: 0xffffffff, group: 0 }
      : { group: -1 };
  }

  _bounceShip(ox, oy) {
    this.ship.bounceOff(ox, oy);
  }

  _applyAsteroidFilter() {
    const f = this._asteroidCollisionFilter;
    for (const a of this.asteroids) Matter.Body.set(a.body, "collisionFilter", f);
  }

  _addAsteroidsToWorld(asteroids) {
    if (!asteroids.length) return;
    Matter.World.add(
      this.engine.world,
      asteroids.map((a) => a.body),
    );
    const f = this._asteroidCollisionFilter;
    for (const a of asteroids) {
      Matter.Body.set(a.body, "collisionFilter", f);
      if (a.constraint) Matter.World.add(this.engine.world, a.constraint);
    }
  }

  _spawnDebris(ax, ay, impulseVx, impulseVy) {
    const count = randInt(DEBRIS_COUNT_MIN, DEBRIS_COUNT_MAX);
    const baseSpeed = Math.hypot(impulseVx, impulseVy) * 0.3;
    for (let k = 0; k < count; k++) {
      const angle = rand(0, TAU);
      const speed = rand(DEBRIS_SPEED_MIN, DEBRIS_SPEED_MAX) + baseSpeed;
      const d = new Debris(
        ax + rand(-6, 6),
        ay + rand(-6, 6),
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      );
      Matter.World.add(this.engine.world, d.body);
      this.debris.push(d);
    }
  }

  _tickDebris(dt) {
    this.debris = this.debris.filter((d) => {
      if (!d.update(dt)) {
        Matter.World.remove(this.engine.world, d.body);
        return false;
      }
      return true;
    });
  }
}
