import { W, H, TAU } from "./utils.js";
import { WW, WH, HEAT_MAX, OVERHEAT_LOCKOUT, COMBO_WINDOW } from "./Globals.js";

// Radar / minimap layout (screen-space, bottom-right corner).
const RADAR_W = 140; // world is always 4:3 → height derives from uniform scale
const RADAR_MARGIN = 12;
const RADAR_DOT = 1.6; // asteroid dot radius
const RADAR_THREAT_DOT = 2.2; // UFO / turret dot radius
const RADAR_SHIP_SIZE = 4; // ship heading-arrow length

// Color scheme: green = shoots worth taking (darker = fewer points),
// red = active threat (UFO / turret), grey = no points / navigation hazard.
const RADAR_COLOR_THREAT = "#f44"; // UFO, turret
const RADAR_COLOR_OBSTACLE = "rgba(100,100,100,0.7)"; // rock, pumice — no points
// Asteroid green gradient indexed by size (0 = large/20pts … 2 = small/100pts).
const RADAR_COLOR_ASTEROID = [
  "hsl(120,100%,30%)", // size 0 — large, 20 pts
  "hsl(120,100%,45%)", // size 1 — medium, 50 pts
  "hsl(120,100%,60%)", // size 2 — small / satellite, 100 pts
];
const RADAR_COLOR_SOLAR = "hsl(120,100%,80%)"; // solar center, 500 pts

// Renders all HUD and screen overlays (start, help, config, game-over, HUD bars).
// Reads game state via this._g; never mutates game state directly.
export class UIRenderer {
  constructor(game) {
    this._g = game;
    this._showcaseReady = false;
  }

  drawHUD(ctx) {
    const g = this._g;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ccc";
    ctx.font = "18px monospace";
    ctx.textAlign = "left";
    ctx.fillText(String(g.score).padStart(6, "0"), 16, 28);
    ctx.textAlign = "right";
    ctx.fillText(`HI ${String(g.hiScore).padStart(6, "0")}`, W - 16, 28);
    ctx.textAlign = "center";
    ctx.fillText(`LVL ${g.level}`, W / 2, 28);

    if (g._comboCount >= 2) {
      const COMBO_COLORS = ["", "", "#ff4", "#f80", "#f44"];
      const color = COMBO_COLORS[g._comboCount] ?? "#f44";
      ctx.font = "bold 14px monospace";
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillText(`×${g._comboCount}`, W / 2, 48);
      ctx.shadowBlur = 0;
      const barW = 48;
      const frac = Math.max(0, g._comboTimer / COMBO_WINDOW);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(W / 2 - barW / 2, 52, barW, 3);
      ctx.fillStyle = color;
      ctx.fillRect(W / 2 - barW / 2, 52, barW * frac, 3);
    }

    for (let i = 0; i < g.lives; i++) {
      ctx.save();
      ctx.translate(14 + i * 21, H - 10);
      ctx.rotate(-Math.PI / 2);
      ctx.beginPath();
      const s = 7;
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.65, -s * 0.5);
      ctx.lineTo(-s * 0.35, 0);
      ctx.lineTo(-s * 0.65, s * 0.5);
      ctx.closePath();
      ctx.strokeStyle = "#8cf";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    if (g.ship) {
      const indicators = [];
      if (g.ship.shieldTimer > 0)
        indicators.push({ label: "SH", t: g.ship.shieldTimer, col: "#4cf" });
      if (g.ship.rapidTimer > 0)
        indicators.push({ label: "RF", t: g.ship.rapidTimer, col: "#f84" });
      if (g.ship.spreadTimer > 0)
        indicators.push({ label: "SP", t: g.ship.spreadTimer, col: "#ff4" });
      if (g.ship.heavyTimer > 0)
        indicators.push({ label: "HV", t: g.ship.heavyTimer, col: "#f64" });

      ctx.font = "13px monospace";
      ctx.textAlign = "left";
      const barW = 48,
        barH = 16,
        gap = 6;
      indicators.forEach((ind, i) => {
        const bx = 8 + i * (barW + gap);
        const by = H - 40;
        const pct = ind.t / g._powerupDuration;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(bx, by, barW, barH);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = ind.col;
        ctx.fillRect(bx, by, barW * pct, barH);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff";
        ctx.fillText(ind.label, bx + 8, by + barH - 4);
      });

      // Heat bar — bottom-left, same row as power-up bars
      const heatBarW = 60;
      const heatPct = g.ship.heat / HEAT_MAX;
      const overheated = g.ship.overheatTimer > 0;
      const hbx = 8 + indicators.length * (barW + gap);
      const hby = H - 40;
      // Flicker effect when overheated: alternate alpha 60 / 100 / 60 fps
      const flashAlpha = overheated ? 0.5 + 0.5 * Math.sin(Date.now() / 80) : 1;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(hbx, hby, heatBarW, barH);
      const r = Math.round(heatPct * 255);
      const g2 = Math.round((1 - heatPct) * 200);
      ctx.globalAlpha = 0.85 * flashAlpha;
      ctx.fillStyle = overheated ? "#f44" : `rgb(${r},${g2},0)`;
      ctx.fillRect(hbx, hby, heatBarW * (overheated ? 1 : heatPct), barH);
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = overheated ? "#faa" : "#fff";
      ctx.fillText(overheated ? "OH" : "HT", hbx + 8, hby + barH - 4);
      ctx.globalAlpha = 1;
    }

    this.drawRadar(ctx);
  }

  // Minimap in the bottom-right corner. Only useful when the world is larger
  // than the viewport (worldSize > 1) — otherwise world == view and it is
  // redundant. Shows what lurks off-screen: threats (red), obstacles (grey),
  // bounty centers (gold), neutral rocks (white) and the ship's heading.
  drawRadar(ctx) {
    const g = this._g;
    if (!(WW > W || WH > H)) return; // world fits on screen → no radar

    const scale = RADAR_W / WW;
    const radarH = WH * scale; // uniform scale, no distortion
    const ox = W - RADAR_MARGIN - RADAR_W; // origin x (top-left of the radar box)
    const oy = H - RADAR_MARGIN - radarH; // origin y
    const sx = (wx) => ox + wx * scale;
    const sy = (wy) => oy + wy * scale;

    ctx.save();

    // Panel background + frame.
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(ox, oy, RADAR_W, radarH);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, RADAR_W - 1, radarH - 1);

    // Clip so off-by-a-pixel positions never bleed outside the panel.
    ctx.beginPath();
    ctx.rect(ox, oy, RADAR_W, radarH);
    ctx.clip();

    const dot = (e, r, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx(e.x), sy(e.y), r, 0, TAU);
      ctx.fill();
    };

    // No-point hazards — drawn first (lowest layer).
    for (const e of g.rocks) dot(e, RADAR_DOT, RADAR_COLOR_OBSTACLE);
    for (const e of g.pumices) dot(e, RADAR_DOT, RADAR_COLOR_OBSTACLE);
    // Point targets — asteroids shaded by size (darker = fewer points).
    for (const e of g.asteroids)
      dot(e, RADAR_DOT, RADAR_COLOR_ASTEROID[e.size] ?? RADAR_COLOR_ASTEROID[2]);
    // Solar-system centers — highest-value stationary target.
    for (const e of g.solarSystems) dot(e, RADAR_THREAT_DOT, RADAR_COLOR_SOLAR);
    // Active threats — UFOs and turrets (red regardless of point value).
    for (const e of g.ufos) dot(e, RADAR_THREAT_DOT, RADAR_COLOR_THREAT);
    for (const e of g.turrets) dot(e, RADAR_THREAT_DOT, RADAR_COLOR_THREAT);

    // Viewport rectangle — the slice the player currently sees.
    ctx.strokeStyle = "rgba(120,200,255,0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx(g._camX), sy(g._camY), W * scale, H * scale);

    // Ship — bright heading arrow (north-up, world-aligned).
    if (g.ship) {
      const px = sx(g.ship.x),
        py = sy(g.ship.y),
        a = g.ship.angle;
      ctx.fillStyle = "#8cf";
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(a) * RADAR_SHIP_SIZE, py + Math.sin(a) * RADAR_SHIP_SIZE);
      ctx.lineTo(
        px + Math.cos(a + 2.5) * RADAR_SHIP_SIZE * 0.7,
        py + Math.sin(a + 2.5) * RADAR_SHIP_SIZE * 0.7,
      );
      ctx.lineTo(
        px + Math.cos(a - 2.5) * RADAR_SHIP_SIZE * 0.7,
        py + Math.sin(a - 2.5) * RADAR_SHIP_SIZE * 0.7,
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  drawConfig(ctx) {
    const g = this._g;
    const cx = W / 2;
    const readOnly = g.isConfigReadOnly;

    ctx.fillStyle = "rgba(0,0,0,0.87)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px monospace";
    ctx.fillText("KONFIGURATION", cx, 52);
    ctx.shadowBlur = 0;

    if (readOnly) {
      ctx.fillStyle = "#f84";
      ctx.font = "bold 11px monospace";
      ctx.fillText("READ ONLY — Änderungen erst beim nächsten Spiel", cx, 70);
    }

    const cardW = 196,
      cardH = 118,
      cardGap = 16;
    const totalCardsW = 3 * cardW + 2 * cardGap;
    const cardStartX = cx - totalCardsW / 2;
    const cardY = 90;

    const modeInfo = [
      { name: "BEGINNER", lines: ["Weite Schüsse", "Viele Powerups", "Wenig Hindernisse"] },
      { name: "NOVICE", lines: ["Ausgewogen", "", ""] },
      { name: "EXPERT", lines: ["Kurze Schüsse", "Seltene Powerups", "Viele Hindernisse"] },
    ];

    modeInfo.forEach((m, i) => {
      const selected = g.config.mode === i + 1;
      const x = cardStartX + i * (cardW + cardGap);

      ctx.fillStyle = selected ? "rgba(68,170,255,0.16)" : "rgba(255,255,255,0.04)";
      ctx.strokeStyle = selected ? "#4af" : "rgba(255,255,255,0.13)";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(x, cardY, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = selected ? "#4af" : "#444";
      ctx.font = "11px monospace";
      ctx.fillText(`${i + 1}`, x + 10, cardY + 16);

      ctx.textAlign = "center";
      ctx.fillStyle = selected ? "#fff" : "#777";
      ctx.shadowColor = selected ? "#4af" : "transparent";
      ctx.shadowBlur = selected ? 10 : 0;
      ctx.font = (selected ? "bold " : "") + "15px monospace";
      ctx.fillText(m.name, x + cardW / 2, cardY + 40);
      ctx.shadowBlur = 0;

      ctx.font = "11px monospace";
      ctx.fillStyle = selected ? "#9cf" : "#4a5060";
      m.lines.forEach((line, li) => {
        if (line) ctx.fillText(line, x + cardW / 2, cardY + 60 + li * 16);
      });
    });

    const btnY = cardY + cardH + 28;
    const btnW = 160,
      btnH = 32;
    const detailsFocused = g._configFocus === "details";
    ctx.fillStyle = detailsFocused ? "rgba(68,170,255,0.16)" : "rgba(255,255,255,0.05)";
    ctx.strokeStyle = detailsFocused ? "#4af" : "rgba(255,255,255,0.22)";
    ctx.lineWidth = detailsFocused ? 2 : 1;
    ctx.shadowColor = detailsFocused ? "#4af" : "transparent";
    ctx.shadowBlur = detailsFocused ? 10 : 0;
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 7);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = detailsFocused ? "#fff" : "#999";
    ctx.font = (detailsFocused ? "bold " : "") + "13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Details  ▶", cx, btnY + 20);

    ctx.fillStyle = "#444";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    const hint = readOnly
      ? "ESC  Zurück   ↓  Details"
      : detailsFocused
        ? "← →  Modus   ENTER  Details öffnen   ↑  Modus-Fokus   ESC  Abbrechen"
        : "← →  Modus   ↓  Details   ENTER  Spiel starten";
    ctx.fillText(hint, cx, H - 18);
  }

  drawConfigDetail(ctx) {
    const g = this._g;
    const cx = W / 2;
    const readOnly = g.isConfigReadOnly;

    ctx.fillStyle = "rgba(0,0,0,0.90)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px monospace";
    ctx.fillText("DETAILS", cx, 42);
    ctx.shadowBlur = 0;

    const params = [
      { key: "bulletRange", label: "Reichweite Schüsse", opts: ["kurz", "normal", "weit"] },
      { key: "powerupFreq", label: "Powerups", opts: ["selten / kurz", "normal", "häufig / lang"] },
      { key: "rockCount", label: "Anzahl Rocks", opts: ["wenige", "normal", "viele"] },
      { key: "pumiceCount", label: "Bimsstein", opts: ["keine", "wenige", "viele"] },
      { key: "asteroidBounce", label: "Asteroiden-Kollisionen", opts: ["aus", "ein"] },
      {
        key: "worldSize",
        label: "Weltgröße",
        opts: ["1× (Standard)", "2× (Größer)", "3× (Riesig)"],
      },
    ];

    let y = 68;
    params.forEach((p, i) => {
      const active = !readOnly && i === g._detailCursor;
      const val = g.config[p.key];

      ctx.textAlign = "center";
      ctx.font = active ? "bold 13px monospace" : "12px monospace";
      ctx.fillStyle = active ? "#4af" : "#666";
      ctx.fillText(p.label, cx, y);
      y += 20;

      const count = p.opts.length;
      const slotW = 148,
        gap = 10;
      const totalW = count * slotW + (count - 1) * gap;
      const startX = cx - totalW / 2;

      for (let n = 1; n <= count; n++) {
        const selected = val === n;
        const bx = startX + (n - 1) * (slotW + gap);

        ctx.fillStyle = selected ? (active ? "#4af" : "#446") : "rgba(255,255,255,0.05)";
        ctx.strokeStyle = selected ? (active ? "#4af" : "#446") : "rgba(255,255,255,0.13)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, y, slotW, 24, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = selected ? "#fff" : "#555";
        ctx.font = (selected ? "bold " : "") + "11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${n}  ${p.opts[n - 1]}`, bx + slotW / 2, y + 15);
      }
      y += 36;
    });

    ctx.fillStyle = "#444";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      readOnly ? "ESC / ENTER  Zurück" : "↑ ↓  Parameter   ← →  Wert   ENTER / ESC  Zurück",
      cx,
      H - 18,
    );
  }

  drawStart(ctx) {
    const cx = W / 2;
    ctx.textAlign = "center";

    ctx.shadowColor = "#fa6";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 52px monospace";
    ctx.fillText("ASTEROIDS", cx, 58);
    ctx.shadowBlur = 0;

    if (Math.floor(Date.now() / 520) % 2) {
      ctx.fillStyle = "#ccc";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PRESS ENTER OR SPACE TO START", cx, H - 16);
    }
  }

  drawHelp(ctx) {
    const cx = W / 2,
      cy = H / 2;

    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.shadowColor = "#4af";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px monospace";
    ctx.fillText("HILFE", cx, cy - 200);
    ctx.shadowBlur = 0;

    const _lm = new Date(document.lastModified);
    const _pad = (n) => String(n).padStart(2, "0");
    ctx.fillStyle = "#555";
    ctx.font = "12px monospace";
    ctx.fillText(
      `Stand: ${_pad(_lm.getDate())}.${_pad(_lm.getMonth() + 1)}.${_lm.getFullYear()}  ${_pad(_lm.getHours())}:${_pad(_lm.getMinutes())} Uhr`,
      cx,
      cy - 178,
    );

    const sections = [
      {
        head: "STEUERUNG",
        rows: [
          ["Pfeiltasten / WASD", "Drehen & Schub"],
          ["Shift + ← / →", "Seitwärts"],
          ["Space / Z", "Schießen"],
          ["Enter / Space", "Starten / Neustart"],
          ["H / ESC", "Hilfe ein/aus"],
          ["C", "Konfiguration"],
          ["S / Pfeil-unten", "Teleportieren"],
        ],
      },
      {
        head: "POWER-UPS",
        rows: [
          ["SH — Shield", "Absorbiert einen Treffer"],
          ["RF — Rapid", "Schnellfeuer"],
          ["SP — Spread", "Dreifachschuss (5 s)"],
        ],
      },
      {
        head: "PUNKTE",
        rows: [
          ["Großer Asteroid", "20"],
          ["Mittlerer Asteroid", "50"],
          ["Kleiner Asteroid", "100"],
          ["Großes UFO", "200"],
          ["Kleines UFO", "1 000"],
          ["Extra-Leben", "alle 10 000 Pkt."],
        ],
      },
    ];

    let y = cy - 148;
    ctx.font = "13px monospace";

    for (const sec of sections) {
      ctx.fillStyle = "#4af";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(sec.head, cx, y);
      y += 22;

      ctx.font = "13px monospace";
      ctx.fillStyle = "#ccc";
      for (const [left, right] of sec.rows) {
        ctx.textAlign = "right";
        ctx.fillText(left, cx - 12, y);
        ctx.fillStyle = "#888";
        ctx.fillText("—", cx, y);
        ctx.fillStyle = "#ccc";
        ctx.textAlign = "left";
        ctx.fillText(right, cx + 12, y);
        y += 19;
      }
      y += 10;
    }

    if (Math.floor(Date.now() / 520) % 2) {
      ctx.fillStyle = "#666";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("H oder ESC — Zurück zum Spiel", cx, cy + 222);
    }
  }

  drawQuitConfirm(ctx) {
    const cx = W / 2,
      cy = H / 2;
    const bw = 340,
      bh = 110;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px monospace";
    ctx.fillText("Quit game?", cx, cy - 18);

    ctx.fillStyle = "#aaa";
    ctx.font = "16px monospace";
    ctx.fillText("[Y]  Yes     [N] / ESC  No", cx, cy + 22);
    ctx.restore();
  }

  drawGameOver(ctx) {
    const g = this._g;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2,
      cy = H / 2;
    ctx.textAlign = "center";
    ctx.shadowColor = "#f33";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#f55";
    ctx.font = "bold 64px monospace";
    ctx.fillText("GAME OVER", cx, cy - 55);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ccc";
    ctx.font = "26px monospace";
    ctx.fillText(`SCORE  ${g.score}`, cx, cy + 15);

    if (g.score > 0 && g.score >= g.hiScore) {
      ctx.fillStyle = "#fc0";
      ctx.font = "20px monospace";
      ctx.fillText("NEW HIGH SCORE!", cx, cy + 52);
    }

    if (Math.floor(Date.now() / 520) % 2) {
      ctx.fillStyle = "#aaa";
      ctx.font = "18px monospace";
      ctx.fillText("PRESS ENTER OR SPACE TO PLAY AGAIN", cx, cy + 115);
    }
  }
}
