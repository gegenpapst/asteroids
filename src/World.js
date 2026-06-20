import { rand, dist, clamp } from "./utils.js";
import {
  WW,
  WH,
  UFO_SPAWN_MIN,
  UFO_HUM_INTERVAL,
  BEAT_INTERVAL_MAX,
  BEAT_INTERVAL_MIN,
  BEAT_DENSITY_FACTOR,
  ASTEROID_SPEED,
  SHIP_SIZE,
  SHIP_HULL_FACTOR,
  MAX_BULLETS,
  UFO_SMALL_SCORE_THRESHOLD,
  UFO_SMALL_CHANCE,
  UFO_SPAWN_JITTER,
} from "./Globals.js";
import { Input } from "./input.js";
import { Matter, MatterWrap } from "./physics.js";
import { Sound } from "./entities/Sound.js";
import { Particle } from "./entities/Particle.js";

// Owns all live-game entity arrays, the physics engine, and audio.
// Game holds the state machine and scoring; World holds the mutable game world.
export class World {
  constructor() {
    Matter.use(MatterWrap);
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } });
    this.snd = new Sound();
    this.mode = null;
    this.saturn = null;

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
    this.ufoTimer = UFO_SPAWN_MIN;
    this.ufoHumTimer = 0;
    this.beatTimer = 1.0;
    this.beatInterval = 1.0;
    this.beatPhase = 0;
  }

  // ── Beat and UFO-hum timers ───────────────────────────────────────────────────
  tickAudio(dt) {
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

  // ── Entities that tick every non-START frame ──────────────────────────────────
  tickUniversal(dt) {
    if (this.saturn) this.saturn.update(dt);
    this.particles = this.particles.filter((p) => p.update(dt));
    this.powerups = this.powerups.filter((p) => p.update(dt));
    this.ufoBullets = this.ufoBullets.filter((b) => b.update(dt));
  }

  // ── Dead-state entity ticking — returns true when the respawn timer expires ───
  tickDead(dt) {
    this.deadTimer -= dt;
    this.asteroids.forEach((a) => a.update(dt));
    this.ufos = this.ufos.filter((u) => u.update(dt, null));
    this.solarSystems = this.solarSystems.filter((s) => s.update(dt));
    Matter.Engine.update(this.engine, dt * 1000);
    this._syncBodies();
    this._capAsteroidSpeeds();
    this._tickDebris(dt);
    return this.deadTimer <= 0;
  }

  // ── Playing-state entity ticking ─────────────────────────────────────────────
  tickPlaying(dt, { score, bulletLife }) {
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
      const [tx, ty] = this.safeShipPos();
      this.ship.teleport(tx, ty);
      this.snd.powerUp("shield");
    }

    if (this.bullets.length < MAX_BULLETS && this.ship.canFire()) {
      this.bullets.push(...this.ship.fire(bulletLife));
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

    this.ufoTimer -= dt;
    if (this.ufoTimer <= 0) {
      const size = score >= UFO_SMALL_SCORE_THRESHOLD && Math.random() < UFO_SMALL_CHANCE ? 1 : 0;
      this.ufos.push(this.mode.createUfo(size, (b) => this.ufoBullets.push(b)));
      this.ufoTimer = UFO_SPAWN_MIN + rand(0, UFO_SPAWN_JITTER);
    }
    this.ufos = this.ufos.filter((u) => u.update(dt, this.ship));
    this._tickDebris(dt);
  }

  // ── Create and position the player ship ──────────────────────────────────────
  spawnShip() {
    this.ship = this.mode.createShip();
    [this.ship.x, this.ship.y] = this.safeShipPos();
    Matter.Body.setPosition(this.ship.body, { x: this.ship.x, y: this.ship.y });
    Matter.World.add(this.engine.world, this.ship.body);
  }

  // ── Find a ship spawn position clear of rocks, asteroids, and pumice ─────────
  safeShipPos() {
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

  // ── Private physics/entity helpers ───────────────────────────────────────────

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
