import { rand } from "../utils.js";
import {
  ROCK_CLUSTER_RADIUS_MIN,
  ROCK_CLUSTER_RADIUS_MAX,
  CLUSTER_CELL_FACTOR,
  CLUSTER_COLLISION_FACTOR,
} from "../Globals.js";
import { generateHexCells, buildMetaballCanvas } from "./Metaball.js";
import { Matter } from "../physics.js";

// Metaball variant of the static rock — ember color.
export class RockCluster {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = rand(ROCK_CLUSTER_RADIUS_MIN, ROCK_CLUSTER_RADIUS_MAX);

    const cellR = this.radius * CLUSTER_CELL_FACTOR;
    const cells = generateHexCells(this.radius, cellR);
    this._offCanvas = buildMetaballCanvas(cells, "rgb(155, 140, 118)", this.radius, cellR);

    this.body = Matter.Bodies.circle(x, y, this.radius, {
      isStatic: true,
      friction: 0,
      frictionAir: 0,
      restitution: 1,
      label: "rock-cluster",
    });
  }

  get collisionRadius() {
    return this.radius * CLUSTER_COLLISION_FACTOR;
  }

  draw(ctx) {
    const sz = this._offCanvas.width;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.translate(this.x, this.y);
    ctx.drawImage(this._offCanvas, -sz / 2, -sz / 2);
    ctx.restore();
  }
}
