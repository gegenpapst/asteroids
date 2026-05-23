"use strict";

// Gemeinsame Basis für AsteroidPoly und ClusterAsteroid.
// Enthält Velocity-Init, Rotation, Matter-Body, Split-Logik.
// Subklassen liefern `_label` und `_rotBase` via static-Property und implementieren `draw()`.
class AsteroidBase {
  static _label = "asteroid"; // Matter-Body Label (subklassen-spezifisch)
  static _rotBase = 1.4; // Bereich der Rotationsgeschwindigkeit (±)

  constructor(x, y, size = 0, angle = null) {
    this.x = x;
    this.y = y;
    this.size = size;

    this.radius = ASTEROID_RADIUS[size];
    this.score = ASTEROID_SCORE[size];

    const a = angle ?? rand(0, TAU);
    const speed = ASTEROID_SPEED[size] * rand(0.7, 1.35);
    this.vx = Math.cos(a) * speed;
    this.vy = Math.sin(a) * speed;
    this.rot = rand(0, TAU);

    const rotBase = this.constructor._rotBase;
    this.rotSpeed = rand(-rotBase, rotBase) * (size + 1) * 0.38;

    this.body = this._makeBody();
    Matter.Body.setVelocity(this.body, { x: this.vx / 60, y: this.vy / 60 });
    Matter.Body.setMass(this.body, ASTEROID_MASS[size]);
  }

  // Erzeugt Bump-Daten: n Auswölbungen gleichmäßig um das Zentrum verteilt.
  // Wird von _makeBody() und _makeVerts() gemeinsam genutzt.
  _genBumps() {
    const r = this.radius;
    const n = randInt(5, 7);
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * TAU + rand(-0.25, 0.25);
      const d = r * rand(0.42, 0.65); // weiter vom Kern entfernt → sichtbar
      const br = r * rand(0.22, 0.32); // kleinere Klumpen
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, br };
    });
  }

  // Baut einen Compound-Body aus einem kleinen Kern + weit abstehenden Klumpen.
  // Setzt this._coreR und this._bumps, damit _makeVerts() darauf zugreifen kann.
  _makeBody() {
    const r = this.radius;
    this._coreR = r * 0.46; // kleinerer Kern → Klumpen ragen deutlich heraus
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
      label: this.constructor._label,
      plugin: { wrap: { min: { x: 0, y: 0 }, max: { x: W, y: H } } },
    });
    Matter.Body.setPosition(body, { x: this.x, y: this.y });
    return body;
  }

  // Leitet Polygon-Vertices aus der Compound-Body-Geometrie ab (Ray-Circle-Intersection
  // + Smooth-Shoulder).  Jeder Strahl findet den äußersten Schnittpunkt; knapp
  // vorbeigehende Strahlen erhalten eine quadratische Übergangszone, damit zwischen
  // den Klumpen keine tiefen Einbuchtungen entstehen (sieht sonst wie ein Stern aus).
  _makeVerts(n = 18) {
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * TAU;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let maxR = this._coreR;
      for (const b of this._bumps) {
        const proj = b.dx * cos + b.dy * sin;
        const bDistSq = b.dx * b.dx + b.dy * b.dy;
        const c = bDistSq - b.br * b.br;
        const disc = proj * proj - c;
        if (disc >= 0) {
          // Strahl trifft Klumpen — äußerer Schnittpunkt
          const t = proj + Math.sqrt(disc);
          if (t > maxR) maxR = t;
        } else if (proj > 0) {
          // Strahl verfehlt Klumpen knapp — Smooth-Shoulder füllt den Übergang.
          // perp = senkrechter Abstand Strahlursprung→Klumpenmitte
          const perp = Math.sqrt(bDistSq - proj * proj);
          const miss = perp - b.br; // wie weit der Strahl am Klumpen vorbeizieht
          if (miss < b.br) {
            const f = 1 - miss / b.br; // linearer Abfall 1→0 über eine Klumpen-Radius breite
            const bumpOuter = Math.sqrt(bDistSq) + b.br;
            const contrib = this._coreR + (bumpOuter - this._coreR) * f * f;
            if (contrib > maxR) maxR = contrib;
          }
        }
      }
      return { a: angle, r: maxR };
    });
  }

  // Default: collisionRadius = radius. Subklassen können überschreiben.
  get collisionRadius() {
    return this.radius;
  }

  update(dt) {
    this.rot += this.rotSpeed * dt;
    return true;
  }

  split(bulletAngle = null) {
    if (this.size >= 2) return [];
    const Cls = this.constructor; // korrekte Subklasse für Kinder
    const offset = ASTEROID_RADIUS[this.size + 1];
    const perp = rand(0, TAU);
    const ox = Math.cos(perp) * offset,
      oy = Math.sin(perp) * offset;
    return [
      new Cls(
        this.x + ox,
        this.y + oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
      ),
      new Cls(
        this.x - ox,
        this.y - oy,
        this.size + 1,
        safeSplitAngle(bulletAngle),
      ),
    ];
  }
}

if (typeof module !== "undefined") module.exports = { AsteroidBase };
