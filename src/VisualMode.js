"use strict";

// Visual mode strategy: provides the entity classes for rendering.
// MetaballMode is the only mode; `Game.mode` is set at game start.

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

const VISUAL_MODES = [new MetaballMode()];

if (typeof module !== "undefined") module.exports = { VisualMode, MetaballMode, VISUAL_MODES };
