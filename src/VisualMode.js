import { ShipCluster } from "./entities/ShipCluster.js";
import { ClusterAsteroid } from "./entities/ClusterAsteroid.js";
import { RockCluster } from "./entities/RockCluster.js";
import { UfoCluster } from "./entities/UfoCluster.js";
import { PumiceCluster } from "./entities/PumiceCluster.js";
import { SatelliteClusterAsteroid } from "./entities/SatelliteClusterAsteroid.js";

// Entity factory for the metaball/cluster visual style.
// Game holds one instance of this and calls it to spawn all entities.
export class MetaballMode {
  createShip() {
    return new ShipCluster();
  }
  createAsteroid(x, y, size, angle, maxBumps) {
    return new ClusterAsteroid(x, y, size, angle, maxBumps);
  }
  createRock(x, y) {
    return new RockCluster(x, y);
  }
  createUfo(size, onBullet) {
    return new UfoCluster(size, onBullet);
  }
  createPumice(x, y) {
    return new PumiceCluster(x, y);
  }
  createSatellite(x, y, ax, ay, parentSystem, size, maxBumps, orbitSpeed) {
    return new SatelliteClusterAsteroid(x, y, ax, ay, parentSystem, size, maxBumps, orbitSpeed);
  }
}
