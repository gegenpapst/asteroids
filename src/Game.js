"use strict";

// ─── Game ────────────────────────────────────────────────────────────────────
const STATE = Object.freeze({
  START: 0,
  PLAYING: 1,
  DEAD: 2,
  GAMEOVER: 3,
  HELP: 4,
  CONFIG: 5,
  CONFIG_DETAIL: 6,
  QUIT_CONFIRM: 7,
});

// Presets for Beginner / Novice / Expert (index = mode - 1)
const MODES = [
  {
    bulletRange: 3,
    powerupFreq: 3,
    rockCount: 1,
    pumiceCount: 1,
    asteroidBounce: 1,
  }, // Beginner
  {
    bulletRange: 2,
    powerupFreq: 2,
    rockCount: 2,
    pumiceCount: 2,
    asteroidBounce: 1,
  }, // Novice
  {
    bulletRange: 1,
    powerupFreq: 1,
    rockCount: 3,
    pumiceCount: 3,
    asteroidBounce: 2,
  }, // Expert
];

class Game {
  constructor() {
    Matter.use(MatterWrap);
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });

    this.snd = new Sound();
    this.hiScore = parseInt(localStorage.getItem("ast_hi") || "0");
    this.state = STATE.START;
    this._debugCollision = false;
    this._dbgCC = 0;
    this._dbgFPS = 0;
    this._dbgFrameMs = 0;
    this._dbgPeakCC = 0;
    this._dbgPeakTTL = 0; // frames until peak reset

    this.score = 0;
    this.lives = 3;
    this.level = 0;
    this.ship = null;
    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerups = [];
    this.ufos = [];
    this.ufoBullets = [];
    this.rocks = [];
    this.pumices = [];
    this.debris = [];
    this.solarSystems = [];
    this.deadTimer = 0;
    this.nextExtra = EXTRA_LIFE_SCORE;
    this.ufoTimer = UFO_SPAWN_MIN;
    this.ufoHumTimer = 0;
    this.t = 0;

    this.beatTimer = 1.0;
    this.beatInterval = 1.0;
    this.beatPhase = 0;

    this.config = {
      mode: 3,
      bulletRange: 1,
      powerupFreq: 1,
      rockCount: 3,
      pumiceCount: 3,
      asteroidBounce: 2,
    };
    this._configCursor = 0;
    this._detailCursor = 0;
    this._configFocus = "mode"; // "mode" | "details"
    this._configPrevState = STATE.START;
  }

  start() {
    this.mode = VISUAL_MODES[0];
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
    Matter.World.clear(this.engine.world, false);
    const rockCount = randInt(1, this.config.rockCount);
    this.rocks = Array.from({ length: rockCount }, () =>
      this.mode.createRock(rand(60, W - 60), rand(60, H - 60)),
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
    // PumiceCluster: one body per cell
    for (const p of this.pumices) {
      if (p.cells)
        Matter.World.add(
          this.engine.world,
          p.cells.map((c) => c.body),
        );
      else if (p.body) Matter.World.add(this.engine.world, p.body);
    }
    this._nextLevel();
    this.state = STATE.PLAYING;
  }

  update(dt) {
    dt = Math.min(dt, 1 / 20);
    this.t += dt;
    if (dt > 0) {
      this._dbgFPS += (1 / dt - this._dbgFPS) * 0.1;
      this._dbgFrameMs += (dt * 1000 - this._dbgFrameMs) * 0.1;
    }

    if (this._updateStateInput()) return;

    // Beat throb
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

    // UFO hum
    if (this.ufos.length > 0) {
      this.ufoHumTimer -= dt;
      if (this.ufoHumTimer <= 0) {
        this.snd.ufoHum();
        this.ufoHumTimer = UFO_HUM_INTERVAL;
      }
    }

    // Update universally (all non-START states)
    this.particles = this.particles.filter((p) => p.update(dt));
    this.powerups = this.powerups.filter((p) => p.update(dt));
    this.ufoBullets = this.ufoBullets.filter((b) => b.update(dt));

    if (this.state === STATE.DEAD) {
      this._updateDeadState(dt);
      return;
    }

    // ── PLAYING ──

    if (Input.wasPressed("F2") || Input.wasPressed("KeyQ"))
      this._debugCollision = !this._debugCollision;

    this._updateShipAndBullets(dt);
    this._updateUFOs(dt);
    this._updateBulletCollisions();
    this._updateShipCollisions();
    this._tickDebris(dt);
    this.solarSystems = this.solarSystems.filter((s) => s.update(dt));
    this._updateDebugStats();

    // Level clear (UFOs persist between levels; solar systems must be fully destroyed first)
    if (
      this.asteroids.filter((a) => !a.isSatellite).length === 0 &&
      this.solarSystems.length === 0
    ) {
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
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.state === STATE.START) {
      this._drawStart();
      return;
    }
    if (this.state === STATE.HELP) {
      this._drawHelp();
      return;
    }
    if (this.state === STATE.CONFIG) {
      this._drawConfig();
      return;
    }
    if (this.state === STATE.CONFIG_DETAIL) {
      this._drawConfigDetail();
      return;
    }

    this._drawRocks();
    this.pumices.forEach((p) => p.draw());
    this.solarSystems.forEach((s) => s.draw()); // centers drawn before satellites
    this.asteroids.forEach((a) => a.draw());
    this.debris.forEach((d) => d.draw());
    this.powerups.forEach((p) => p.draw());
    this.ufos.forEach((u) => u.draw());
    this.ufoBullets.forEach((b) => b.draw());
    this.bullets.forEach((b) => b.draw());
    this.particles.forEach((p) => p.draw());
    if (this.ship) this.ship.draw();

    // ── Collision debug overlay (Q / F2 to toggle) ──────────────────────
    if (this._debugCollision) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5;
      const drawC = (x, y, r, col) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.strokeStyle = col;
        ctx.stroke();
      };
      // Obstacles
      this.rocks.forEach((r) => drawC(r.x, r.y, r.collisionRadius, "#f44"));
      this.asteroids.forEach((a) => {
        const pts = a.body.parts;
        if (pts && pts.length > 1) {
          // Compound body: draw each sub-circle (parts[0] is the parent hull, skip it)
          for (let i = 1; i < pts.length; i++)
            drawC(pts[i].position.x, pts[i].position.y, pts[i].circleRadius, "#f84");
        } else {
          drawC(a.x, a.y, a.collisionRadius, "#f84");
        }
      });
      this.pumices.forEach((p) => {
        if (p.cells) p.cells.filter((c) => c.alive).forEach((c) => drawC(c.x, c.y, c.r, "#f4f"));
        else if (p.alive) drawC(p.x, p.y, p.radius, "#f4f");
      });
      // Enemies
      this.ufos.forEach((u) => drawC(u.x, u.y, u.radius, "#f00"));
      this.ufoBullets.forEach((b) => drawC(b.x, b.y, b.radius, "#f60"));
      // Player
      this.bullets.forEach((b) => drawC(b.x, b.y, b.radius, "#0f4"));
      this.powerups.forEach((p) => drawC(p.x, p.y, p.radius, "#ff0"));
      if (this.ship) {
        drawC(this.ship.x, this.ship.y, this.ship.radius, "#4ff"); // hull
        if (this.ship.hitRadius > this.ship.radius)
          drawC(this.ship.x, this.ship.y, this.ship.hitRadius, "#0cf"); // shield bubble
      }
      // Debug-Overlay (bottom-right)
      ctx.globalAlpha = 0.85;
      ctx.font = "11px monospace";
      ctx.textAlign = "right";

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

      const line = (text, col, y) => {
        ctx.fillStyle = col;
        ctx.fillText(text, W - 6, y);
      };
      line(`Particles: ${this.particles.length}`, "#888", H - 76);
      line(`Entities:  ${entities}`, "#aaa", H - 62);
      line(
        `Collision: ${this._dbgCC} / Peak: ${this._dbgPeakCC}`,
        this._dbgPeakCC > 200 ? "#f84" : this._dbgPeakCC > 80 ? "#ff4" : "#4f8",
        H - 48,
      );
      line(
        `Frame:     ${ms} ms`,
        parseFloat(ms) > 20 ? "#f84" : parseFloat(ms) > 17 ? "#ff4" : "#4f8",
        H - 34,
      );
      line(`FPS:       ${fps}`, fps < 50 ? "#f84" : fps < 58 ? "#ff4" : "#4f8", H - 20);
      ctx.restore();
    }

    this._drawHUD();

    if (this.state === STATE.QUIT_CONFIRM) this._drawQuitConfirm();
    if (this.state === STATE.GAMEOVER) this._drawGameOver();
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  _safeShipPos() {
    const sR = SHIP_SIZE * SHIP_HULL_FACTOR;
    let x,
      y,
      tries = 0;
    // Generous buffer first; if no spot found, fall back to minimum-safe spacing
    for (const margin of [sR + 50, sR + 15]) {
      tries = 0;
      do {
        x = rand(60, W - 60);
        y = rand(60, H - 60);
        tries++;
        const collides =
          this.rocks.some((r) => dist({ x, y }, r) < r.collisionRadius + margin) ||
          this.asteroids.some((a) => dist({ x, y }, a) < a.collisionRadius + margin) ||
          this.pumices.some((p) => p.pointInsideMargin(x, y, margin));
        if (!collides) return [x, y];
      } while (tries < SAFE_POS_TRIES);
    }
    return [x, y];
  }

  _safePumicePos(placed) {
    const margin = 54 + 10;
    let x,
      y,
      tries = 0;
    do {
      x = rand(80, W - 80);
      y = rand(80, H - 80);
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

  // Clamp each asteroid's Matter body velocity to prevent restitution:1 collisions
  // from compounding speed unboundedly over many frames.
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

  _nextLevel() {
    this.level++;
    const count = Math.min(INITIAL_ROCKS + this.level - 1, MAX_ROCKS_PER_LEVEL);
    const cx = W / 2,
      cy = H / 2;
    const maxBumps = Math.min(Math.max(this.level - 1, 1), 7);
    for (let i = 0; i < count; i++) {
      let x, y;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (dist({ x, y }, { x: cx, y: cy }) < W * 0.22);
      const a = this.mode.createAsteroid(x, y, 0, null, maxBumps);
      this.asteroids.push(a);
      Matter.World.add(this.engine.world, a.body);
    }
    this._applyAsteroidFilter();

    // Solar systems: appear from level SOLAR_START_LEVEL, max SOLAR_MAX_COUNT at a time
    if (this.level >= SOLAR_START_LEVEL) {
      const solarCount = Math.min(
        Math.floor((this.level - SOLAR_START_LEVEL) / 2) + 1,
        SOLAR_MAX_COUNT,
      );
      for (let si = 0; si < solarCount; si++) {
        const ax = rand(W * 0.2, W * 0.8);
        const ay = rand(H * 0.2, H * 0.8);
        const satelliteCount = randInt(SOLAR_SATELLITE_MIN, SOLAR_SATELLITE_MAX);
        const sys = new SolarSystem(ax, ay, satelliteCount);
        this.solarSystems.push(sys);
        for (let j = 0; j < satelliteCount; j++) {
          const tetherLen = rand(SOLAR_TETHER_MIN, SOLAR_TETHER_MAX);
          const spawnAngle = (j / satelliteCount) * TAU + rand(-0.3, 0.3);
          const sx = ax + Math.cos(spawnAngle) * tetherLen;
          const sy = ay + Math.sin(spawnAngle) * tetherLen;
          const sat = this.mode.createSatellite(sx, sy, ax, ay, sys, 1, maxBumps);
          this.asteroids.push(sat);
          Matter.World.add(this.engine.world, [sat.body, sat.constraint]);
          Matter.Body.set(sat.body, "collisionFilter", this._asteroidCollisionFilter);
        }
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
    [() => this.snd.explodeLarge(), () => this.snd.explodeMed(), () => this.snd.explodeSmall()][
      size
    ]();
  }

  _killShip() {
    for (let i = 0; i < 22; i++)
      this.particles.push(new Particle(this.ship.x, this.ship.y, "#8ef"));
    this.snd.shipDie();
    this.lives--;
    Matter.World.remove(this.engine.world, this.ship.body);
    this.ship = null;
    this.state = STATE.DEAD;
    this.deadTimer = RESPAWN_DELAY;
    this.bullets = [];
    this.ufoBullets = [];
  }

  // Handles all state transitions based on input (START, HELP, CONFIG, PLAYING keys).
  // Returns `true` if update() should abort (state needs no further processing).
  _updateStateInput() {
    if (this.state === STATE.START || this.state === STATE.GAMEOVER) {
      if (Input.start() || Input.config()) {
        this._configPrevState = this.state;
        this._configFocus = "mode";
        this.state = STATE.CONFIG;
      }
      Input.flush();
      return true;
    }

    if (this.state === STATE.HELP) {
      if (Input.help() || Input.wasPressed("Escape")) this.state = STATE.PLAYING;
      Input.flush();
      return true;
    }

    if (this.state === STATE.CONFIG) {
      const readOnly = this._configPrevState === STATE.PLAYING;

      // Switch focus between mode tiles and the details button
      if (Input.wasPressed("ArrowDown") && this._configFocus === "mode")
        this._configFocus = "details";
      if (Input.wasPressed("ArrowUp") && this._configFocus === "details")
        this._configFocus = "mode";

      // Mode change works with ArrowLeft/Right regardless of focus
      if (!readOnly) {
        const prevMode = this.config.mode;
        if (Input.wasPressed("ArrowLeft")) this.config.mode = Math.max(1, this.config.mode - 1);
        if (Input.wasPressed("ArrowRight")) this.config.mode = Math.min(3, this.config.mode + 1);
        if (this.config.mode !== prevMode) {
          Object.assign(this.config, MODES[this.config.mode - 1]);
          this._applyAsteroidFilter();
        }
      }

      // Open details: D key always, Enter when details are focused
      if (
        Input.wasPressed("KeyD") ||
        (Input.wasPressed("Enter") && this._configFocus === "details")
      ) {
        this._detailCursor = 0;
        this.state = STATE.CONFIG_DETAIL;
        Input.flush();
        return true;
      }

      if (Input.wasPressed("Escape")) {
        this.state = this._configPrevState;
        Input.flush();
        return true;
      }

      // Start game: Enter when mode tiles are focused, or C key
      if ((Input.wasPressed("Enter") && this._configFocus === "mode") || Input.config()) {
        if (readOnly) this.state = STATE.PLAYING;
        else this.start();
      }
      Input.flush();
      return true;
    }

    if (this.state === STATE.CONFIG_DETAIL) {
      const readOnly = this._configPrevState === STATE.PLAYING;
      const params = ["bulletRange", "powerupFreq", "rockCount", "pumiceCount", "asteroidBounce"];
      const paramMax = {
        bulletRange: 3,
        powerupFreq: 3,
        rockCount: 3,
        pumiceCount: 3,
        asteroidBounce: 2,
      };
      if (!readOnly) {
        if (Input.wasPressed("ArrowUp"))
          this._detailCursor = (this._detailCursor + params.length - 1) % params.length;
        if (Input.wasPressed("ArrowDown"))
          this._detailCursor = (this._detailCursor + 1) % params.length;
        const key = params[this._detailCursor];
        if (Input.wasPressed("ArrowLeft")) this.config[key] = Math.max(1, this.config[key] - 1);
        if (Input.wasPressed("ArrowRight"))
          this.config[key] = Math.min(paramMax[key], this.config[key] + 1);
        if (key === "asteroidBounce") this._applyAsteroidFilter();
      }
      if (Input.wasPressed("Escape") || Input.wasPressed("KeyD") || Input.wasPressed("Enter")) {
        this._configFocus = "mode";
        this.state = STATE.CONFIG;
        Input.flush();
        return true;
      }
      Input.flush();
      return true;
    }

    if (this.state === STATE.PLAYING && Input.wasPressed("Escape")) {
      this.state = STATE.QUIT_CONFIRM;
      Input.flush();
      return true;
    }

    if (this.state === STATE.QUIT_CONFIRM) {
      if (Input.wasPressed("KeyY") || Input.wasPressed("KeyZ")) {
        this.state = STATE.GAMEOVER;
      } else if (Input.wasPressed("KeyN") || Input.wasPressed("Escape")) {
        this.state = STATE.PLAYING;
      }
      Input.flush();
      return true;
    }

    if (this.state === STATE.PLAYING && Input.help()) {
      this.state = STATE.HELP;
      Input.flush();
      return true;
    }

    if (this.state === STATE.PLAYING && Input.config()) {
      this._configPrevState = STATE.PLAYING;
      this._configFocus = "mode";
      this.state = STATE.CONFIG;
      Input.flush();
      return true;
    }

    return false;
  }

  // STATE.DEAD: count down deadTimer, keep asteroids/UFOs running,
  // then respawn (PLAYING) or game over.
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
        this.state = STATE.PLAYING;
      } else {
        this.state = STATE.GAMEOVER;
      }
    }
    Input.flush();
  }

  // Ship update + thrust particles + teleport + shooting + bullets/asteroids/physics tick.
  _updateShipAndBullets(dt) {
    this.ship.update(dt);

    // Thrust trail particles
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

    // Sync ship position/velocity into Matter body before physics tick
    Matter.Body.setPosition(this.ship.body, { x: this.ship.x, y: this.ship.y });
    Matter.Body.setVelocity(this.ship.body, {
      x: this.ship.vx / 60,
      y: this.ship.vy / 60,
    });

    Matter.Engine.update(this.engine, dt * 1000);
    this._syncBodies();
    this._capAsteroidSpeeds();

    // When shield is active, read Matter's collision-resolved velocity/position back.
    // hull radius (9.8) < shield hitRadius (30.8), so the game-logic dist() check
    // still fires after Matter pushes the ship to the hull-surface distance.
    if (this.ship.shieldTimer > 0 && this.ship.invulnerable <= 0) {
      this.ship.vx = this.ship.body.velocity.x * 60;
      this.ship.vy = this.ship.body.velocity.y * 60;
      this.ship.x = wrap(this.ship.body.position.x, W);
      this.ship.y = wrap(this.ship.body.position.y, H);
    }
  }

  // UFO spawn timer + UFO update (sinusoidal movement, possibly firing).
  // UFOs persist across level transitions.
  _updateUFOs(dt) {
    this.ufoTimer -= dt;
    if (this.ufoTimer <= 0) {
      const size = this.score >= 5000 && Math.random() < 0.4 ? 1 : 0;
      this.ufos.push(this.mode.createUfo(size, (b) => this.ufoBullets.push(b)));
      this.ufoTimer = UFO_SPAWN_MIN + rand(0, UFO_SPAWN_JITTER);
    }
    this.ufos = this.ufos.filter((u) => u.update(dt, this.ship));
  }

  // All bullet × entity collisions.
  // Asteroid/Rock/Pumice use unified arrays — mode implicitly determines entity types.
  _updateBulletCollisions() {
    // Bullet × Asteroid (uniform via collisionRadius)
    outer: for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        if (dist(b, a) < a.collisionRadius + b.radius) {
          // #1 Off-center spin: cross product of hit-offset × bullet-direction
          const hitDx = b.x - a.x,
            hitDy = b.y - a.y;
          const bLen = Math.hypot(b.vx, b.vy) || 1;
          const cross = hitDx * (b.vy / bLen) - hitDy * (b.vx / bLen);

          this._addScore(a.score);
          this._boom(a.x, a.y, a.size);
          this._spawnDebris(a.x, a.y, b.vx, b.vy); // #10 debris
          if (a.parentSystem) a.parentSystem.onSatelliteDestroyed(this);
          if (Math.random() < this._powerupChance)
            this.powerups.push(new PowerUp(a.x, a.y, POWERUP_TYPES[randInt(0, 3)]));
          const children = a.split(Math.atan2(b.vy, b.vx));
          for (const c of children) c.rotSpeed += cross * ASTEROID_SPIN_FACTOR; // #1
          if (a.constraint) Matter.World.remove(this.engine.world, a.constraint);
          Matter.World.remove(this.engine.world, a.body);
          this._addAsteroidsToWorld(children);
          this.asteroids.splice(ai, 1, ...children);
          this.bullets.splice(bi, 1);
          continue outer;
        }
      }
    }

    // Bullet × UFO
    outerUfo: for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
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

    // Bullet × Rock (uniform via collisionRadius)
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      if (this.rocks.some((r) => dist(b, r) < r.collisionRadius + b.radius)) {
        this.bullets.splice(bi, 1);
      }
    }

    // Bullet × Pumice (uniform via handleBulletHit)
    outerPumice: for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const b = this.bullets[bi];
      for (const p of this.pumices) {
        if (!p.alive) continue;
        if (p.handleBulletHit(b, this.engine.world, this)) {
          this.bullets.splice(bi, 1);
          continue outerPumice;
        }
      }
    }
    this.pumices = this.pumices.filter((p) => p.alive);
  }

  // All ship × entity collisions + power-up pickup.
  // With shield: bounce + optionally split asteroid. Without shield: _killShip().
  _updateShipCollisions() {
    // Ship × Asteroid (uniform via collisionRadius + split)
    if (this.ship && this.ship.invulnerable <= 0) {
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const a = this.asteroids[ai];
        if (dist(this.ship, a) < a.collisionRadius + this.ship.hitRadius) {
          if (this.ship.shieldTimer > 0) {
            this._boom(a.x, a.y, a.size);
            // #1 Off-center spin via ship velocity direction
            const sLen = Math.hypot(this.ship.vx, this.ship.vy) || 1;
            const hitDx = a.x - this.ship.x,
              hitDy = a.y - this.ship.y;
            const cross = hitDx * (this.ship.vy / sLen) - hitDy * (this.ship.vx / sLen);
            const children = a.split();
            for (const c of children) c.rotSpeed += cross * ASTEROID_SPIN_FACTOR; // #1
            this._spawnDebris(a.x, a.y, this.ship.vx, this.ship.vy); // #10
            if (a.parentSystem) a.parentSystem.onSatelliteDestroyed(this);
            if (a.constraint) Matter.World.remove(this.engine.world, a.constraint);
            Matter.World.remove(this.engine.world, a.body);
            this._addAsteroidsToWorld(children);
            this.asteroids.splice(ai, 1, ...children);
            this._bounceShip(a.x, a.y); // explicit bounce (asteroid removed before Matter can apply it)
          } else {
            this._killShip();
          }
          break;
        }
      }
    }

    // Ship × Rock (uniform via collisionRadius)
    if (this.ship && this.ship.invulnerable <= 0) {
      for (const r of this.rocks) {
        if (dist(this.ship, r) < r.collisionRadius + this.ship.hitRadius) {
          if (this.ship.shieldTimer <= 0) {
            this._killShip();
          } else {
            this._bounceShip(r.x, r.y);
          }
          break;
        }
      }
    }

    // Ship × Pumice (uniform via handleShipHit)
    if (this.ship && this.ship.invulnerable <= 0) {
      for (const p of this.pumices) {
        if (!p.alive) continue;
        if (p.handleShipHit(this.ship)) {
          if (this.ship.shieldTimer <= 0) {
            this._killShip();
          } else {
            this._bounceShip(p.x, p.y);
          }
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
          if (pu.type === "shield") this.ship.shieldTimer = this._powerupDuration;
          else if (pu.type === "rapid") this.ship.rapidTimer = this._powerupDuration;
          else if (pu.type === "spread") this.ship.spreadTimer = this._powerupDuration;
          else this.ship.heavyTimer = this._powerupDuration;
          this.snd.powerUp(pu.type);
          this.powerups.splice(pi, 1);
        }
      }
    }
  }

  // Theoretical max collision checks per frame: bullets × entities + ship × entities.
  // Peak holds for 120 frames (~2 s), then resets to the current value.
  _updateDebugStats() {
    if (!this._debugCollision) return;
    // PumiceCluster: count of alive cells
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

  // ── Draw helpers ────────────────────────────────────────────────────────

  _drawRocks() {
    // Each RockCluster draws itself (pre-baked canvas + screen blend)
    this.rocks.forEach((r) => r.draw());
  }

  _drawHUD() {
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ccc";
    ctx.font = "18px monospace";
    ctx.textAlign = "left";
    ctx.fillText(String(this.score).padStart(6, "0"), 16, 28);
    ctx.textAlign = "right";
    ctx.fillText(`HI ${String(this.hiScore).padStart(6, "0")}`, W - 16, 28);
    ctx.textAlign = "center";
    ctx.fillText(`LVL ${this.level}`, W / 2, 28);

    // Life icons (bottom-left, below the power-up bars)
    for (let i = 0; i < this.lives; i++) {
      ctx.save();
      ctx.translate(14 + i * 21, H - 10);
      ctx.rotate(-Math.PI / 2);
      ctx.beginPath();
      const s = 7;
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.65, -s * 0.5);
      ctx.lineTo(-s * 0.35, 0);
      ctx.lineTo(-s * 0.65, s * 0.5);
      ctx.closePath();
      ctx.strokeStyle = "#8cf";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // Power-up status bars (bottom-left, above the life icons)
    if (this.ship) {
      const indicators = [];
      if (this.ship.shieldTimer > 0)
        indicators.push({ label: "SH", t: this.ship.shieldTimer, col: "#4cf" });
      if (this.ship.rapidTimer > 0)
        indicators.push({ label: "RF", t: this.ship.rapidTimer, col: "#f84" });
      if (this.ship.spreadTimer > 0)
        indicators.push({ label: "SP", t: this.ship.spreadTimer, col: "#ff4" });
      if (this.ship.heavyTimer > 0)
        indicators.push({ label: "HV", t: this.ship.heavyTimer, col: "#f64" });

      ctx.font = "13px monospace";
      ctx.textAlign = "left";
      const barW = 48,
        barH = 16,
        gap = 6;
      indicators.forEach((ind, i) => {
        const bx = 8 + i * (barW + gap);
        const by = H - 40; // above the life icons (H-10 ± 7px)
        const pct = ind.t / this._powerupDuration;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(bx, by, barW, barH);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = ind.col;
        ctx.fillRect(bx, by, barW * pct, barH);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.fillText(ind.label, bx + 8, by + barH - 4);
      });
    }
  }

  get _bulletLife() {
    return [0.35, 0.65, 1.0][this.config.bulletRange - 1];
  }
  get _powerupChance() {
    return [0.05, 0.12, 0.25][this.config.powerupFreq - 1];
  }
  get _powerupDuration() {
    return [5, 7, 10][this.config.powerupFreq - 1];
  }
  get _pumiceCountRange() {
    return [
      [0, 0],
      [1, 3],
      [3, 6],
    ][this.config.pumiceCount - 1];
  }
  get _asteroidCollisionFilter() {
    return this.config.asteroidBounce === 2
      ? { category: 0x0001, mask: 0xffffffff, group: 0 }
      : { group: -1 };
  }

  _bounceShip(ox, oy) {
    const dx = this.ship.x - ox,
      dy = this.ship.y - oy;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d,
      ny = dy / d;
    const dot = this.ship.vx * nx + this.ship.vy * ny;
    if (dot > 0) return; // already moving away — skip re-bounce
    this.ship.vx -= 2 * dot * nx;
    this.ship.vy -= 2 * dot * ny;
    const spd = Math.hypot(this.ship.vx, this.ship.vy);
    if (spd < 220) {
      this.ship.vx = nx * 220;
      this.ship.vy = ny * 220;
    }
  }

  _applyAsteroidFilter() {
    const f = this._asteroidCollisionFilter;
    for (const a of this.asteroids) Matter.Body.set(a.body, "collisionFilter", f);
  }

  // Adds asteroid children (split result) to the physics world and applies the collision filter.
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

  // Spawns 3–5 debris bodies at the explosion site with random direction + impulse share.
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

  // Update + cleanup of all debris bodies after the physics tick.
  _tickDebris(dt) {
    this.debris = this.debris.filter((d) => {
      if (!d.update(dt)) {
        Matter.World.remove(this.engine.world, d.body);
        return false;
      }
      return true;
    });
  }

  _drawConfig() {
    const cx = W / 2;
    const readOnly = this._configPrevState === STATE.PLAYING;

    ctx.fillStyle = "rgba(0,0,0,0.87)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px monospace";
    ctx.fillText("KONFIGURATION", cx, 52);
    ctx.shadowBlur = 0;

    if (readOnly) {
      ctx.fillStyle = "#f84";
      ctx.font = "bold 11px monospace";
      ctx.fillText("READ ONLY — Änderungen erst beim nächsten Spiel", cx, 70);
    }

    // ── Modus-Karten ─────────────────────────────────────────────────────────
    const cardW = 196,
      cardH = 118,
      cardGap = 16;
    const totalCardsW = 3 * cardW + 2 * cardGap;
    const cardStartX = cx - totalCardsW / 2;
    const cardY = 90;

    const modeInfo = [
      {
        name: "BEGINNER",
        lines: ["Weite Schüsse", "Viele Powerups", "Wenig Hindernisse"],
      },
      { name: "NOVICE", lines: ["Ausgewogen", "", ""] },
      {
        name: "EXPERT",
        lines: ["Kurze Schüsse", "Seltene Powerups", "Viele Hindernisse"],
      },
    ];

    modeInfo.forEach((m, i) => {
      const selected = this.config.mode === i + 1;
      const x = cardStartX + i * (cardW + cardGap);

      ctx.fillStyle = selected ? "rgba(68,170,255,0.16)" : "rgba(255,255,255,0.04)";
      ctx.strokeStyle = selected ? "#4af" : "rgba(255,255,255,0.13)";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, cardY, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();

      // Nummer
      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#4af" : "#444";
      ctx.font = "11px monospace";
      ctx.fillText(`${i + 1}`, x + 10, cardY + 16);

      // Name
      ctx.textAlign = "center";
      ctx.fillStyle = selected ? "#fff" : "#777";
      ctx.shadowColor = selected ? "#4af" : "transparent";
      ctx.shadowBlur = selected ? 10 : 0;
      ctx.font = (selected ? "bold " : "") + "15px monospace";
      ctx.fillText(m.name, x + cardW / 2, cardY + 40);
      ctx.shadowBlur = 0;

      // Beschreibung
      ctx.font = "11px monospace";
      ctx.fillStyle = selected ? "#9cf" : "#4a5060";
      m.lines.forEach((line, li) => {
        if (line) ctx.fillText(line, x + cardW / 2, cardY + 60 + li * 16);
      });
    });

    // ── Details-Button ────────────────────────────────────────────────────────
    const btnY = cardY + cardH + 28;
    const btnW = 160,
      btnH = 32;
    const detailsFocused = this._configFocus === "details";
    ctx.fillStyle = detailsFocused ? "rgba(68,170,255,0.16)" : "rgba(255,255,255,0.05)";
    ctx.strokeStyle = detailsFocused ? "#4af" : "rgba(255,255,255,0.22)";
    ctx.lineWidth = detailsFocused ? 2 : 1;
    ctx.shadowColor = detailsFocused ? "#4af" : "transparent";
    ctx.shadowBlur = detailsFocused ? 10 : 0;
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 7);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = detailsFocused ? "#fff" : "#999";
    ctx.font = (detailsFocused ? "bold " : "") + "13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Details  ▶", cx, btnY + 20);

    // ── Hinweise ──────────────────────────────────────────────────────────────
    ctx.fillStyle = "#444";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    const hint = readOnly
      ? "ESC  Zurück   ↓  Details"
      : detailsFocused
        ? "← →  Modus   ENTER  Details öffnen   ↑  Modus-Fokus   ESC  Abbrechen"
        : "← →  Modus   ↓  Details   ENTER  Spiel starten";
    ctx.fillText(hint, cx, H - 18);
  }

  _drawConfigDetail() {
    const cx = W / 2;
    const readOnly = this._configPrevState === STATE.PLAYING;

    ctx.fillStyle = "rgba(0,0,0,0.90)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px monospace";
    ctx.fillText("DETAILS", cx, 42);
    ctx.shadowBlur = 0;

    const params = [
      {
        key: "bulletRange",
        label: "Reichweite Schüsse",
        opts: ["kurz", "normal", "weit"],
      },
      {
        key: "powerupFreq",
        label: "Powerups",
        opts: ["selten / kurz", "normal", "häufig / lang"],
      },
      {
        key: "rockCount",
        label: "Anzahl Rocks",
        opts: ["wenige", "normal", "viele"],
      },
      {
        key: "pumiceCount",
        label: "Bimsstein",
        opts: ["keine", "wenige", "viele"],
      },
      {
        key: "asteroidBounce",
        label: "Asteroiden-Kollisionen",
        opts: ["aus", "ein"],
      },
    ];

    let y = 68;
    params.forEach((p, i) => {
      const active = !readOnly && i === this._detailCursor;
      const val = this.config[p.key];

      ctx.textAlign = "center";
      ctx.font = active ? "bold 13px monospace" : "12px monospace";
      ctx.fillStyle = active ? "#4af" : "#666";
      ctx.fillText(p.label, cx, y);
      y += 20;

      const count = p.opts.length;
      const slotW = 148,
        gap = 10;
      const totalW = count * slotW + (count - 1) * gap;
      const startX = cx - totalW / 2;

      for (let n = 1; n <= count; n++) {
        const selected = val === n;
        const bx = startX + (n - 1) * (slotW + gap);

        ctx.fillStyle = selected ? (active ? "#4af" : "#446") : "rgba(255,255,255,0.05)";
        ctx.strokeStyle = selected ? (active ? "#4af" : "#446") : "rgba(255,255,255,0.13)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, y, slotW, 24, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = selected ? "#fff" : "#555";
        ctx.font = (selected ? "bold " : "") + "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${n}  ${p.opts[n - 1]}`, bx + slotW / 2, y + 15);
      }
      y += 36;
    });

    ctx.fillStyle = "#444";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      readOnly ? "ESC / ENTER  Zurück" : "↑ ↓  Parameter   ← →  Wert   ENTER / ESC  Zurück",
      cx,
      H - 18,
    );
  }

  _drawStart() {
    const cx = W / 2;
    ctx.textAlign = "center";

    // Title
    ctx.shadowColor = "#fa6";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 52px monospace";
    ctx.fillText("ASTEROIDS", cx, 58);
    ctx.shadowBlur = 0;

    // Style comparison showcase
    if (!this._showcaseReady) this._initShowcase();

    const rot = (Date.now() / 1000) * 0.22;
    const lx = W / 4;
    const rx = (3 * W) / 4;
    const ay = 300;

    // Vertical divider
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 80);
    ctx.lineTo(W / 2, 555);
    ctx.stroke();
    ctx.restore();

    // Panel headers
    ctx.fillStyle = "rgba(120,200,255,0.90)";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("A — POLYGON", lx, 107);
    ctx.fillText("B — METABALL", rx, 107);

    ctx.fillStyle = "rgba(160,160,160,0.65)";
    ctx.font = "11px monospace";
    ctx.fillText("Canvas-Pfad · scharfe Kanten", lx, 123);
    ctx.fillText("Hex-Grid geclippt · weiches Leuchten", rx, 123);

    // Option A: polygon drawn live each frame
    this._drawPolyShowcase(lx, ay, rot);

    // Option B: pre-built metaball canvas
    ctx.save();
    ctx.translate(rx, ay);
    ctx.rotate(rot);
    ctx.globalCompositeOperation = "screen";
    const sw = this._showcaseCanvasB.width;
    ctx.drawImage(this._showcaseCanvasB, -sw / 2, -sw / 2);
    ctx.restore();

    // Captions
    ctx.fillStyle = "rgba(120,120,120,0.55)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Sehr unregelmäßig · klassisch", lx, 450);
    ctx.fillText("Organisch · Science-Fiction", rx, 450);

    // Blink "press enter"
    if (Math.floor(Date.now() / 520) % 2) {
      ctx.fillStyle = "#ccc";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PRESS ENTER OR SPACE TO START", cx, H - 16);
    }
  }

  _drawHelp() {
    const cx = W / 2,
      cy = H / 2;

    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px monospace";
    ctx.fillText("HILFE", cx, cy - 200);
    ctx.shadowBlur = 0;

    const _lm = new Date(document.lastModified);
    const _pad = (n) => String(n).padStart(2, "0");
    ctx.fillStyle = "#555";
    ctx.font = "12px monospace";
    ctx.fillText(
      `Stand: ${_pad(_lm.getDate())}.${_pad(_lm.getMonth() + 1)}.${_lm.getFullYear()}  ${_pad(_lm.getHours())}:${_pad(_lm.getMinutes())} Uhr`,
      cx,
      cy - 178,
    );

    const sections = [
      {
        head: "STEUERUNG",
        rows: [
          ["Pfeiltasten / WASD", "Drehen & Schub"],
          ["Shift + ← / →", "Seitwärts"],
          ["Space / Z", "Schießen"],
          ["Enter / Space", "Starten / Neustart"],
          ["H / ESC", "Hilfe ein/aus"],
          ["C", "Konfiguration"],
          ["S / Pfeil-unten", "Teleportieren"],
        ],
      },
      {
        head: "POWER-UPS",
        rows: [
          ["SH — Shield", "Absorbiert einen Treffer"],
          ["RF — Rapid", "Schnellfeuer"],
          ["SP — Spread", "Dreifachschuss (5 s)"],
        ],
      },
      {
        head: "PUNKTE",
        rows: [
          ["Großer Asteroid", "20"],
          ["Mittlerer Asteroid", "50"],
          ["Kleiner Asteroid", "100"],
          ["Großes UFO", "200"],
          ["Kleines UFO", "1 000"],
          ["Extra-Leben", "alle 10 000 Pkt."],
        ],
      },
    ];

    let y = cy - 148;
    ctx.font = "13px monospace";

    for (const sec of sections) {
      ctx.fillStyle = "#4af";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(sec.head, cx, y);
      y += 22;

      ctx.font = "13px monospace";
      ctx.fillStyle = "#ccc";
      for (const [left, right] of sec.rows) {
        ctx.textAlign = "right";
        ctx.fillText(left, cx - 12, y);
        ctx.fillStyle = "#888";
        ctx.fillText("—", cx, y);
        ctx.fillStyle = "#ccc";
        ctx.textAlign = "left";
        ctx.fillText(right, cx + 12, y);
        y += 19;
      }
      y += 10;
    }

    if (Math.floor(Date.now() / 520) % 2) {
      ctx.fillStyle = "#666";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("H oder ESC — Zurück zum Spiel", cx, cy + 222);
    }
  }

  _drawQuitConfirm() {
    const cx = W / 2,
      cy = H / 2;
    const bw = 340,
      bh = 110;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px monospace";
    ctx.fillText("Quit game?", cx, cy - 18);

    ctx.fillStyle = "#aaa";
    ctx.font = "16px monospace";
    ctx.fillText("[Y]  Yes     [N] / ESC  No", cx, cy + 22);
    ctx.restore();
  }

  _drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2,
      cy = H / 2;
    ctx.textAlign = "center";
    ctx.shadowColor = "#f33";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#f55";
    ctx.font = "bold 64px monospace";
    ctx.fillText("GAME OVER", cx, cy - 55);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ccc";
    ctx.font = "26px monospace";
    ctx.fillText(`SCORE  ${this.score}`, cx, cy + 15);

    if (this.score > 0 && this.score >= this.hiScore) {
      ctx.fillStyle = "#fc0";
      ctx.font = "20px monospace";
      ctx.fillText("NEW HIGH SCORE!", cx, cy + 52);
    }

    if (Math.floor(Date.now() / 520) % 2) {
      ctx.fillStyle = "#aaa";
      ctx.font = "18px monospace";
      ctx.fillText("PRESS ENTER OR SPACE TO PLAY AGAIN", cx, cy + 115);
    }
  }

  // ── Style showcase helpers ────────────────────────────────────────────────

  _initShowcase() {
    const sr = 80;
    this._showcaseSr = sr;
    // Fixed 6-vertex irregular shape — same polygon used for both style options
    const rawBumps = [
      { a: -1.47, d: 0.7 },
      { a: -0.48, d: 0.76 },
      { a: 0.72, d: 0.68 },
      { a: 1.8, d: 0.73 },
      { a: -2.45, d: 0.74 },
      { a: 3.0, d: 0.66 },
    ].map(({ a, d }) => ({ dx: Math.cos(a) * d * sr, dy: Math.sin(a) * d * sr }));

    this._showcaseSorted = rawBumps
      .slice()
      .sort((a, b) => Math.atan2(a.dy, a.dx) - Math.atan2(b.dy, b.dx));

    const verts = this._showcaseSorted.map((b) => ({ x: b.dx, y: b.dy }));
    const cellR = sr * 0.13;
    const cells = generatePolyCells(verts, cellR);
    this._showcaseCanvasB = buildMetaballCanvas(cells, "rgb(100, 140, 185)", sr, cellR, 14, 0.72);
    this._showcaseReady = true;
  }

  _drawPolyShowcase(x, y, rot) {
    const verts = this._showcaseSorted;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // Outer glow
    ctx.shadowColor = "rgb(120, 190, 255)";
    ctx.shadowBlur = 28;

    // Filled polygon with radial gradient
    const sr = this._showcaseSr;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
    grad.addColorStop(0, "rgb(190, 225, 255)");
    grad.addColorStop(0.45, "rgb(100, 155, 215)");
    grad.addColorStop(1, "rgb(28, 60, 120)");

    ctx.beginPath();
    ctx.moveTo(verts[0].dx, verts[0].dy);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].dx, verts[i].dy);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Edge stroke
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(180, 230, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { Game, STATE };
