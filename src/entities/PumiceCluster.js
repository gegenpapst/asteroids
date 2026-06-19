import { rand, dist } from "../utils.js";
import {
  PUMICE_RADIUS_MIN,
  PUMICE_RADIUS_MAX,
  PUMICE_CELL_FACTOR,
  PUMICE_SPACING_FACTOR,
  PUMICE_BLUR_FACTOR,
  PUMICE_CONTRAST,
  PUMICE_NEIGHBOR_FACTOR,
  PUMICE_COLLISION_FACTOR,
  METABALL_HEX_PACKING,
} from "../Globals.js";
import { renderMetaballFrame } from "./Metaball.js";
import { Particle } from "./Particle.js";
import { Matter } from "../physics.js";

// Pumice cluster: static obstacle built from individual Matter bodies per cell.
// Cells can be destroyed individually; metaball rendering is rebuilt each frame
// based on the living cells.
export class PumiceCluster {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = rand(PUMICE_RADIUS_MIN, PUMICE_RADIUS_MAX);
    this._cellR = this.radius * PUMICE_CELL_FACTOR;
    this._blur = Math.round(this._cellR * PUMICE_BLUR_FACTOR);
    this.cells = this._generateCells();
    const size = Math.ceil((this.radius + this._blur * 3 + 4) * 2);
    this._offCanvas = Object.assign(document.createElement("canvas"), {
      width: size,
      height: size,
    });
    this._contrastCanvas = Object.assign(document.createElement("canvas"), {
      width: size,
      height: size,
    });
  }

  _generateCells() {
    const cellR = this._cellR;
    const spacing = cellR * PUMICE_SPACING_FACTOR;
    const rowH = spacing * METABALL_HEX_PACKING;
    const span = Math.ceil((this.radius * 2) / rowH) + 1;
    const cells = [];
    for (let row = 0; row < span; row++) {
      const cy0 = this.y - this.radius + row * rowH;
      const xOff = ((row % 2) * spacing) / 2;
      for (let col = 0; col < span; col++) {
        const cx0 = this.x - this.radius + col * spacing + xOff;
        if (Math.hypot(cx0 - this.x, cy0 - this.y) >= this.radius - cellR * 0.3) continue;
        const x = cx0 + rand(-1.5, 1.5);
        const y = cy0 + rand(-1.5, 1.5);
        const r = cellR * rand(0.85, 1.15);
        const body = Matter.Bodies.circle(x, y, r, {
          isStatic: true,
          friction: 0,
          frictionAir: 0,
          restitution: 1,
          label: "pumice-cell",
        });
        cells.push({ x, y, r, body, alive: true });
      }
    }
    return cells;
  }

  get alive() {
    return this.cells.some((c) => c.alive);
  }

  cullIsolated(world) {
    const threshold = this._cellR * PUMICE_NEIGHBOR_FACTOR;
    for (const c of this.cells) {
      if (!c.alive) continue;
      const hasNeighbor = this.cells.some(
        (n) => n !== c && n.alive && Math.hypot(n.x - c.x, n.y - c.y) < threshold,
      );
      if (!hasNeighbor) {
        c.alive = false;
        Matter.World.remove(world, c.body);
      }
    }
  }

  get collisionRadius() {
    return this.radius * PUMICE_COLLISION_FACTOR;
  }

  findHit(wx, wy, br) {
    return this.cells.filter((c) => c.alive && dist({ x: wx, y: wy }, c) < c.r + br);
  }

  update() {
    return true;
  }

  pointInsideMargin(x, y, margin) {
    return this.cells.some((c) => c.alive && Math.hypot(x - c.x, y - c.y) < c.r + margin);
  }

  handleBulletHit(b, world, game) {
    const hits = this.findHit(b.x, b.y, b.radius);
    if (hits.length === 0) return false;
    for (const c of hits) {
      c.alive = false;
      Matter.World.remove(world, c.body);
      for (let k = 0; k < 3; k++)
        game.particles.push(new Particle(c.x, c.y, `hsl(${rand(25, 40)},18%,${rand(55, 72)}%)`));
    }
    this.cullIsolated(world);
    return true;
  }

  handleShipHit(ship) {
    return this.findHit(ship.x, ship.y, ship.hitRadius).length > 0;
  }

  draw(ctx) {
    const alive = this.cells.filter((c) => c.alive);
    renderMetaballFrame(
      ctx,
      this._offCanvas,
      this._contrastCanvas,
      alive,
      this.x,
      this.y,
      "rgb(146, 146, 150)",
      this._blur,
      PUMICE_CONTRAST,
    );
  }
}
