"use strict";

// Entity factory for the metaball/cluster visual style.
// Game holds one instance of this and calls it to spawn all entities.
class MetaballMode {
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

if (typeof module !== "undefined") module.exports = { MetaballMode };
