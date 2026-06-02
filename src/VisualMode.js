"use strict";

// Strategy pattern for visualStyle (Polygon ↔ Metaball).
//
// `Game.mode` is set at game start based on the config and provides
// the appropriate entity classes without Game.js ever checking `visualStyle === 2`.

class VisualMode {
  createShip() {
    throw new Error("abstract");
  }
  createAsteroid(x, y, size, angle, maxBumps) {
    throw new Error("abstract");
  }
  createRock(x, y) {
    throw new Error("abstract");
  }
  createUfo(size, onBullet) {
    throw new Error("abstract");
  }
  createPumice(x, y) {
    throw new Error("abstract");
  }
  createSatellite(x, y, ax, ay, parentSystem, size, maxBumps) {
    throw new Error("abstract");
  }
}

class PolygonMode extends VisualMode {
  createShip() {
    return new ShipPoly();
  }
  createAsteroid(x, y, size, angle, maxBumps) {
    return new AsteroidPoly(x, y, size, angle, maxBumps);
  }
  createRock(x, y) {
    return new RockPoly(x, y);
  }
  createUfo(size, onBullet) {
    return new Ufo(size, onBullet);
  }
  createPumice(x, y) {
    return new PumicePoly(x, y);
  }
  createSatellite(x, y, ax, ay, parentSystem, size, maxBumps) {
    return new SatelliteAsteroidPoly(x, y, ax, ay, parentSystem, size, maxBumps);
  }
}

class MetaballMode extends VisualMode {
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
  createSatellite(x, y, ax, ay, parentSystem, size, maxBumps) {
    return new SatelliteClusterAsteroid(x, y, ax, ay, parentSystem, size, maxBumps);
  }
}

// Lookup table, indexed by config.visualStyle (1-based).
const VISUAL_MODES = [new PolygonMode(), new MetaballMode()];

if (typeof module !== "undefined")
  module.exports = { VisualMode, PolygonMode, MetaballMode, VISUAL_MODES };
