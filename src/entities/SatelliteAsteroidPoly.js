"use strict";

// Polygon-Variante eines Satelliten-Asteroiden — erbt Geometrie + Draw von AsteroidPoly,
// ergänzt Spring-Constraint zum Systemzentrum.
// Unterschiede zu AsteroidPoly:
//   - kein matter-wrap (Constraint würde beim Teleport reißen)
//   - initiale Tangentialgeschwindigkeit statt zufälliger Richtung
//   - isSatellite = true (Level-Clear-Bedingung ignoriert Satelliten)
//   - parentSystem — Referenz auf die zugehörige SolarSystem-Instanz
//   - split() erzeugt freie AsteroidPoly-Kinder ohne Constraint
//   - draw() zeichnet Verbindungslinie zum Anker, dann das Polygon
class SatelliteAsteroidPoly extends AsteroidPoly {
  static _label = "satellite-asteroid";

  constructor(x, y, ax, ay, parentSystem, size = 1, maxBumps = 7) {
    super(x, y, size, null, maxBumps);

    this.isSatellite = true;
    this.parentSystem = parentSystem;
    this.anchorX = ax;
    this.anchorY = ay;

    // Override velocity: tangential to the radial Anchor→Satellite direction
    const dx = x - ax;
    const dy = y - ay;
    const len = Math.hypot(dx, dy) || 1;
    const sign = Math.random() < 0.5 ? 1 : -1;
    this.vx = (-dy / len) * sign * SOLAR_ORBIT_SPEED;
    this.vy = (dx / len) * sign * SOLAR_ORBIT_SPEED;
    Matter.Body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });

    this.constraint = Matter.Constraint.create({
      bodyA: this.body,
      pointA: { x: 0, y: 0 },
      pointB: { x: ax, y: ay },
      length: Math.hypot(dx, dy),
      stiffness: SOLAR_STIFFNESS,
      damping: SOLAR_DAMPING,
    });
  }

  // Override: kein plugin.wrap
  _makeBody() {
    const r = this.radius;
    this._coreR = r * (1.0 - (0.54 * Math.min(this.bumpCount, 7)) / 7);
    this._bumps = this._genBumps();
    const parts = [Matter.Bodies.circle(0, 0, this._coreR)];
    for (const b of this._bumps) {
      parts.push(Matter.Bodies.circle(b.dx, b.dy, b.br));
    }
    const body = Matter.Body.create({
      parts,
      friction: 0,
      frictionAir: 0,
      restitution: 1,
      label: SatelliteAsteroidPoly._label,
      // No plugin.wrap — constraint would break on screen wrap
    });
    Matter.Body.setPosition(body, { x: this.x, y: this.y });
    return body;
  }

  // Override: Kinder sind freie AsteroidPoly ohne Constraint
  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset;
    const oy = Math.sin(perp) * offset;
    return [
      new AsteroidPoly(
        this.x + ox,
        this.y + oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
        this.maxBumps,
      ),
      new AsteroidPoly(
        this.x - ox,
        this.y - oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
        this.maxBumps,
      ),
    ];
  }

  // Override: Verbindungslinie zum Anker zuerst, dann Polygon darüber
  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.anchorX, this.anchorY);
    ctx.strokeStyle = "rgba(255, 140, 60, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    super.draw();
  }
}

if (typeof module !== "undefined") module.exports = { SatelliteAsteroidPoly };
