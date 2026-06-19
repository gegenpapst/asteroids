# Design-Ideen

Game-Designer-Analyse des aktuellen Stands (Arcade-„Shoot & Split" mit physikbasierten
Hindernissen). Kernbefund: Solides Fundament, aber dem Spieler fehlen **Entscheidungen** —
die optimale Strategie ist fast immer „alles zerballern". Die folgenden Vorschläge zielen
auf strategische Tiefe, neue Verhaltensweisen und mehr „Game Feel".

> Status: Brainstorming, noch nicht priorisiert für die Roadmap.

## 1. Mehr strategische Tiefe

### A) Risiko/Ertrag-Combo-System (empfohlen, Quick-Win)

Jeder Treffer startet/verlängert ein Multiplier-Fenster (z. B. 2 s). Schnelles Ketten →
×2, ×3, ×4. Der Multiplier sinkt beim reinen „Farmen", und ein eigener Tod setzt ihn auf 1
zurück. Erzeugt die Entscheidung „aggressiv pushen vs. sicher spielen".

- Andockpunkt: `_addScore` in `Game.js`, Combo-Timer im Game-State, HUD-Anzeige oben.
- Geringer Aufwand, große Wirkung.

### B) Energie-/Hitze-Budget statt unbegrenztem Dauerfeuer

Gemeinsame Ressource für Schießen **und** Boost. Dauerfeuer überhitzt → kurze Zwangspause;
sparsames Feuern lädt schneller. Macht Munitionsmanagement und Zielpriorisierung relevant.

- Interagiert mit `rapid`/`heavy` Power-ups (verändern die Hitzekurve).
- Neue Konstante in `Globals.js`, HUD-Bar analog zu den Power-up-Drain-Bars.

### C) Bedrohungsprioritäten / Bounty-Ziele

Pro Level wird ein zufälliges Ziel als „Bounty" markiert (z. B. ein Satellit oder das
`SolarSystem`-Zentrum). Zerstören gibt Bonus + sofortiges Power-up; ignorieren ist erlaubt.
Optional eskaliert eine ungelöste Bedrohung (Turret feuert schneller, je länger es lebt).

- Baut auf `Turret` / `SolarSystem` auf.

## 2. Neue Spielelemente (Kollision & Verhalten)

### A) Gravitationsbrunnen / Schwarzes Loch (empfohlen)

Statisches Objekt mit Anziehungsradius: Bullets krümmen sich, Asteroiden und Ship werden
angezogen. Kein direkter Schaden, aber lokal veränderte Bewegungsphysik → Slingshot-Manöver
als Skill.

- Nutzt Matter.js und die vorhandene `SOLAR_*`-Constraint-Infrastruktur (radiale Kraft auf
  nahe Bodies). Klein im Code, groß im Spielgefühl.
- Umsetzung über die `/new-game-entity`-Skill.

### B) Splitter-Asteroid mit Schockwelle

Objekt, das bei Zerstörung eine expandierende Ringschockwelle abgibt: stößt nahe Asteroiden
weg und schädigt das Ship (außer mit `shield`).

- Neue Kollisionsart: zeitlich wachsender Ring statt Kreis-gegen-Kreis. Belohnt
  Abstand-Timing.

### C) Ramm-Gegner / Jäger-Drohne

Gegner mit Seek-Verhalten, der das Ship aktiv verfolgt und rammt statt schießt; optional
ausweichend, wenn man auf ihn zielt. Erstmals echtes aktives Verhalten gegen den Spieler.

### D) Wurmlochpaar (empfohlen — bessere erste Wahl als der Gravitationsbrunnen)

Zwei verbundene Portale: Wer in das eine fliegt, kommt am anderen wieder heraus, und
umgekehrt. Ein lokales, freiwilliges Pendant zum bestehenden Screen-Wrapping (`wrap`).

**Warum stark:**

- Nutzt die vorhandene Wrap-Logik — geringer Implementierungsaufwand.
- Löst das Traversierungsproblem großer Welten (`worldSize` 2–3), wo Screen-Wrapping kaum
  noch greift: schnelle Fortbewegung, aber nur an festen Punkten → Skill statt geschenkt.
- Erzeugt echte taktische Entscheidungen (Flucht vor UFO vs. Falle, wenn der Ausgang in ein
  Asteroidenfeld führt).
- Lesbarer und leichter zu balancen als der Gravitationsbrunnen (2A).

**Mindest-Spielregeln (Spezifikation):**

- Paar aus zwei Portalen.
- Nur **Ship + Bullets** teleportieren (Asteroiden/UFOs nicht — sonst chaotisch/unfair).
  Bullets eröffnen „um die Ecke schießen" als Skill-Ceiling; ggf. erst als zweiter Schritt.
- **Velocity-Vektor bleibt erhalten** (man schießt mit Schwung raus, keine Vollbremsung).
- **Cooldown ~0,5 s** gegen erneutes Teleportieren nach jedem Sprung — verhindert den
  klassischen Re-Entry-Loop/Flackern, wenn der Ausgang im Trigger-Radius des Gegenstücks
  liegt.
- **Beidseitiges visuelles Feedback** (Flash an Ein- und Ausgang, kurzer Kamera-Snap statt
  hartem Sprung) gegen Desorientierung — synergiert mit „3C Hit-Flash".

**Risiken:** Desorientierung ohne klares Feedback; Bullet-Teleport visuell schwer lesbar.
Camping am Ausgang ist unkritisch, da nur Ship/Bullets durchgehen. Umsetzung über die
`/new-game-entity`-Skill.

## 3. Grafische Aufwertung bestehender Elemente

### A) Bullets & Ship-Thrust mit Glow/Trail-Layern

Additiver Glow (`globalCompositeOperation = "lighter"`) plus kurze Nachzieh-Spur für
Bullets; pulsierender Flammenkegel mit Farbverlauf beim Thrust. Reine `draw()`-Änderungen.

### B) Reaktiver Asteroiden-Schaden (Metaball)

Getroffene Cluster zeigen Risse/glühende Bruchkanten (Hitze-Tint, der über ~0,3 s ausklingt)
als Trefferfeedback.

- Achtung `_offCanvas`: als Overlay-Pass darüber rendern, nicht im Cache (Cache sonst
  invalidieren/neu bauen).

### C) Bildschirm-Feedback: Shake, Hit-Flash, Vignette (empfohlen, höchster Juice/Zeile)

Camera-Shake bei großen Explosionen / Ship-Tod (Kamera existiert in `Game.js`), roter
Vignette-Puls bei Ship-Treffer, heller Flash beim Zerstören von Solar-Zentrum/UFO.

## 4. HUD / UI: Radar (Minimap)

Verkleinertes Welt-Rechteck im HUD, das Position, sichtbaren Ausschnitt und Objekte zeigt.
**Kein Entity** (keine Kollision/Physik) — gehört in `UIRenderer.js`, nicht in
`/new-game-entity`. Reines Screen-Space-`draw()` nach dem Kamera-`ctx.restore()`
(vgl. `Game.js:332`), einmal pro Frame über die vorhandenen Entity-Arrays. Geringer Aufwand.

**Zentrale Bedingung:** Nur rendern, wenn die Welt scrollt (`WW > W || WH > H`, also
`worldSize > 1`). Bei `worldSize === 1` ist Welt = sichtbarer Ausschnitt → der Radar wäre
komplett redundant. Wertversprechen ist nicht „wo bin ich" (Ship ist immer in Bildmitte),
sondern **„was lauert außerhalb des Sichtfelds"** — stellt Fairness her, da Off-Screen-UFOs
und -Turrets sonst ungesehen feuern. Hilft auch beim Finden der letzten Level-Asteroiden und
synergiert mit dem Wurmlochpaar (2D).

**Spezifikation (entschieden):**

- **Seitenverhältnis:** Welt ist immer 4:3 (800×600, uniform skaliert) → `scale = radarW / WW`,
  keine Verzerrung.
- **Anzeige der Objekte** (farbcodiert, nicht einheitlich):
  - Asteroiden / Pumice — neutral (weiß); winzige Splitter ggf. weglassen gegen Clutter.
  - UFO / Turret — auffällig rot (aktive Bedrohung).
  - Solar-Zentren — Bounty-Farbe.
  - `rocks` (indestructible) — **dezent grau** mit anzeigen (Navigationshindernis, klar als
    „nicht Ziel" lesbar).
  - Ship — heller Pfeil mit Heading.
  - Power-ups (gelb) — optional, separate Opt-in-Entscheidung.
- **Viewport-Rechteck:** Kamera-Box `(camX, camY, W, H) × scale` als dünner Rahmen — der
  „Ausschnitt, den er gerade sieht".
- **Nicht mit-rotierend:** north-up / welt-ausgerichtet (Mit-Rotation desorientiert bei freier
  360°-Drehung).
- **Platzierung:** unten links (Power-up-Bars sind unten rechts, Score oben links).
  Halbtransparenter Hintergrund.
- Optional als Config-Schalter (`radar` in `CONFIG_PARAMS`) zum Abschalten.

**Risiken:** Spannungsverlust (gilt aber nur für die kleine Wrap-Welt — dort kein Radar);
Clutter in späten Levels (durch kleine Punkte / Splitter-Filter mildern).

## Empfohlene Reihenfolge (Quick-Wins zuerst)

1. **1A Combo-System** + **3C Camera-Shake/Hit-Flash** — minimaler Eingriff, sofort spürbar.
2. **2A Gravitationsbrunnen** — stärkstes neues Feature, über `/new-game-entity`.
3. **4 Radar** — reines HUD, geringer Aufwand, macht die großen Welten (`worldSize` 2–3) erst
   richtig spielbar.
