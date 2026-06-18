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

// Derived from CONFIG_PARAMS — stable across all _handleConfigDetailInput calls.
const _CONFIG_PARAM_KEYS = Object.keys(CONFIG_PARAMS);

// Sound method names indexed by asteroid size — avoids allocating closures in _boom().
const _BOOM_SOUNDS = ["explodeLarge", "explodeMed", "explodeSmall"];

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
    this.turrets = [];
    this.deadTimer = 0;
    this.nextExtra = EXTRA_LIFE_SCORE;
    this.ufoTimer = UFO_SPAWN_MIN;
    this.ufoHumTimer = 0;
    this.t = 0;

    this.beatTimer = 1.0;
    this.beatInterval = 1.0;
    this.beatPhase = 0;

    this._camX = 0;
    this._camY = 0;

    this.saturn = null;
    this.collisions = new CollisionSystem(this);
    this.ui = new UIRenderer(this);

    this.config = {
      mode: 3,

      bulletRange: 1,
      powerupFreq: 1,
      rockCount: 3,
      pumiceCount: 3,
      asteroidBounce: 2,
      worldSize: 3, // Expert default matches mode: 3
    };
    this._configCursor = 0;
    this._detailCursor = 0;
    this._configFocus = "mode"; // "mode" | "details"
    this._configPrevState = STATE.START;
  }

  start() {
    WW = W * (this.config.worldSize || 1);
    WH = H * (this.config.worldSize || 1);
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
    if (this.saturn) this.saturn.update(dt);
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
    this.collisions.updateBullet();
    this.collisions.updateShip();
    this._tickDebris(dt);
    this.solarSystems = this.solarSystems.filter((s) => s.update(dt));
    this.turrets.forEach((t) => t.update(dt));
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

    // Update camera: center on ship, clamp to world bounds
    if (this.ship) {
      this._camX = Math.max(0, Math.min(this.ship.x - W / 2, WW - W));
      this._camY = Math.max(0, Math.min(this.ship.y - H / 2, WH - H));
    }

    Input.flush();
  }

  draw() {
    ctx.drawImage(bgCanvas, 0, 0);

    // Twinkling stars — parallax-scrolled relative to camera
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

    // World-space entities
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

    this.ui.drawHUD(ctx);
    if (this._debugCollision) this._drawDebugStats();
    if (this.state === STATE.QUIT_CONFIRM) this.ui.drawQuitConfirm(ctx);
    if (this.state === STATE.GAMEOVER) this.ui.drawGameOver(ctx);
  }

  // Collision debug circles in world space (already inside the camera transform when called).
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
    // Obstacles
    this.rocks.forEach((r) => drawC(r.x, r.y, r.collisionRadius, "#f44"));
    this.asteroids.forEach((a) => drawC(a.x, a.y, a.radius, "#f84"));
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
    ctx.restore();
  }

  // Performance and entity-count overlay in screen space (must be called after camera ctx.restore).
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
        x = rand(60, WW - 60);
        y = rand(60, WH - 60);
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

    // Solar systems: appear from level SOLAR_START_LEVEL, max SOLAR_MAX_COUNT at a time
    if (this.level >= SOLAR_START_LEVEL) {
      const solarCount = Math.min(
        Math.floor((this.level - SOLAR_START_LEVEL) / 2) + 1,
        SOLAR_MAX_COUNT,
      );
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

    // Turrets: appear from TURRET_START_LEVEL, one additional per level up to TURRET_MAX_COUNT
    if (this.level >= TURRET_START_LEVEL) {
      const count = Math.min(this.level - TURRET_START_LEVEL + 1, TURRET_MAX_COUNT);
      for (let i = 0; i < count; i++) {
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

  // Shared asteroid-destruction sequence used by both bullet and shield collisions.
  // Returns the split children (already added to the world).
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
    this.state = STATE.DEAD;
    this.deadTimer = RESPAWN_DELAY;
    this.bullets = [];
    this.ufoBullets = [];
  }

  // Handles all state transitions based on input (START, HELP, CONFIG, PLAYING keys).
  // Returns `true` if update() should abort (state needs no further processing).
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
      this.state = STATE.CONFIG;
    }
    Input.flush();
    return true;
  }

  _handleHelpInput() {
    if (Input.help() || Input.wasPressed("Escape")) this.state = STATE.PLAYING;
    Input.flush();
    return true;
  }

  _handleConfigInput() {
    const readOnly = this._configPrevState === STATE.PLAYING;

    // Switch focus between mode tiles and the details button
    if (Input.wasPressed("ArrowDown") && this._configFocus === "mode")
      this._configFocus = "details";
    if (Input.wasPressed("ArrowUp") && this._configFocus === "details") this._configFocus = "mode";

    // Mode change works with ArrowLeft/Right regardless of focus
    if (!readOnly) {
      const prevMode = this.config.mode;
      if (Input.wasPressed("ArrowLeft")) this.config.mode = Math.max(1, this.config.mode - 1);
      if (Input.wasPressed("ArrowRight")) this.config.mode = Math.min(3, this.config.mode + 1);
      if (this.config.mode !== prevMode) {
        Object.assign(this.config, GAME_MODES[this.config.mode - 1]);
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
      this.state = STATE.CONFIG;
    }
    Input.flush();
    return true;
  }

  _handleQuitConfirmInput() {
    if (Input.wasPressed("KeyY") || Input.wasPressed("KeyZ")) {
      this.state = STATE.GAMEOVER;
    } else if (Input.wasPressed("KeyN") || Input.wasPressed("Escape")) {
      this.state = STATE.PLAYING;
    }
    Input.flush();
    return true;
  }

  _handlePlayingInput() {
    if (Input.wasPressed("Escape")) {
      this.state = STATE.QUIT_CONFIRM;
      Input.flush();
      return true;
    }
    if (Input.help()) {
      this.state = STATE.HELP;
      Input.flush();
      return true;
    }
    if (Input.config()) {
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
  }

  // UFO spawn timer + UFO update (sinusoidal movement, possibly firing).
  // UFOs persist across level transitions.
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
    if (spd < SHIP_BOUNCE_MIN_SPEED) {
      this.ship.vx = nx * SHIP_BOUNCE_MIN_SPEED;
      this.ship.vy = ny * SHIP_BOUNCE_MIN_SPEED;
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
}

if (typeof module !== "undefined") module.exports = { Game, STATE };
