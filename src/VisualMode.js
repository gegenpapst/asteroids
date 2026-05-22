'use strict';

// Strategy-Pattern für visualStyle (Polygon ↔ Metaball).
//
// `Game.mode` wird beim Spielstart anhand der Config gesetzt und liefert
// die passenden Entity-Klassen, ohne dass Game.js irgendwo `visualStyle === 2`
// prüfen muss.

class VisualMode {
    createShip()                            { throw new Error('abstract'); }
    createAsteroid(x, y, size, angle)       { throw new Error('abstract'); }
    createRock(x, y)                        { throw new Error('abstract'); }
    createUfo(size, onBullet)               { throw new Error('abstract'); }
    createPumice(x, y)                      { throw new Error('abstract'); }
}

class PolygonMode extends VisualMode {
    createShip()                            { return new ShipPoly(); }
    createAsteroid(x, y, size, angle)       { return new AsteroidPoly(x, y, size, angle); }
    createRock(x, y)                        { return new RockPoly(x, y); }
    createUfo(size, onBullet)               { return new Ufo(size, onBullet); }
    createPumice(x, y)                      { return new PumicePoly(x, y); }
}

class MetaballMode extends VisualMode {
    createShip()                            { return new ShipCluster(); }
    createAsteroid(x, y, size, angle)       { return new ClusterAsteroid(x, y, size, angle); }
    createRock(x, y)                        { return new RockCluster(x, y); }
    createUfo(size, onBullet)               { return new UfoCluster(size, onBullet); }
    createPumice(x, y)                      { return new PumiceCluster(x, y); }
}

// Lookup-Tabelle, indiziert nach config.visualStyle (1-basiert).
const VISUAL_MODES = [new PolygonMode(), new MetaballMode()];

if (typeof module !== 'undefined') module.exports = { VisualMode, PolygonMode, MetaballMode, VISUAL_MODES };
