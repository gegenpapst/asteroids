import { UFO_SPAWN_MIN } from "./Globals.js";
import { Matter, MatterWrap } from "./physics.js";
import { Sound } from "./entities/Sound.js";

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
}
