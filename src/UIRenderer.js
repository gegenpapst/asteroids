"use strict";

// Renders all HUD and screen overlays (start, help, config, game-over, HUD bars).
// Reads game state via this._g; never mutates game state directly.
class UIRenderer {
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

    // Life icons (bottom-left, below the power-up bars)
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

    // Power-up status bars (bottom-left, above the life icons)
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
    }
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

    if (!this._showcaseReady) this._initShowcase();

    const rot = (Date.now() / 1000) * 0.22;
    const lx = W / 4;
    const rx = (3 * W) / 4;
    const ay = 300;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 80);
    ctx.lineTo(W / 2, 555);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "rgba(120,200,255,0.90)";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText("A — POLYGON", lx, 107);
    ctx.fillText("B — METABALL", rx, 107);

    ctx.fillStyle = "rgba(160,160,160,0.65)";
    ctx.font = "11px monospace";
    ctx.fillText("Canvas-Pfad · scharfe Kanten", lx, 123);
    ctx.fillText("Hex-Grid geclippt · weiches Leuchten", rx, 123);

    this._drawPolyShowcase(ctx, lx, ay, rot);

    ctx.save();
    ctx.translate(rx, ay);
    ctx.rotate(rot);
    ctx.globalCompositeOperation = "screen";
    const sw = this._showcaseCanvasB.width;
    ctx.drawImage(this._showcaseCanvasB, -sw / 2, -sw / 2);
    ctx.restore();

    ctx.fillStyle = "rgba(120,120,120,0.55)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Sehr unregelmäßig · klassisch", lx, 450);
    ctx.fillText("Organisch · Science-Fiction", rx, 450);

    // --- TURRET SHOWCASE: pick a style (1–6) ---
    {
      const t = Date.now() / 1000;
      const tr = 22;
      const ty = 520;
      const positions = [1, 2, 3, 4, 5, 6].map((i) => (W / 7) * i);

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 463);
      ctx.lineTo(W - 40, 463);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(255,160,100,0.85)";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("TURRET — choose a style (1–6)", cx, 478);

      // 1: Simple radial gradient — hellrot outside, dunkelrot center
      {
        const [x, y] = [positions[0], ty];
        const grad = ctx.createRadialGradient(x, y, 0, x, y, tr);
        grad.addColorStop(0, "#6b0000");
        grad.addColorStop(1, "#ff7070");
        ctx.beginPath();
        ctx.arc(x, y, tr, 0, TAU);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // 2: Same gradient + pulsing outer glow
      {
        const [x, y] = [positions[1], ty];
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        ctx.save();
        ctx.shadowColor = "#ff4040";
        ctx.shadowBlur = 6 + pulse * 16;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, tr);
        grad.addColorStop(0, "#6b0000");
        grad.addColorStop(1, "#ff7070");
        ctx.beginPath();
        ctx.arc(x, y, tr, 0, TAU);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // 3: Core circle + 3 orbiting satellite dots
      {
        const [x, y] = [positions[2], ty];
        const grad = ctx.createRadialGradient(x, y, 0, x, y, tr * 0.68);
        grad.addColorStop(0, "#6b0000");
        grad.addColorStop(1, "#ff7070");
        ctx.beginPath();
        ctx.arc(x, y, tr * 0.68, 0, TAU);
        ctx.fillStyle = grad;
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          const a = t * 2 + (i * TAU) / 3;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * tr * 1.3, y + Math.sin(a) * tr * 1.3, 3.5, 0, TAU);
          ctx.fillStyle = "#ff8080";
          ctx.fill();
        }
      }

      // 4: Concentric rings, no fill
      {
        const [x, y] = [positions[3], ty];
        ctx.save();
        ctx.lineWidth = 2.5;
        for (let i = 3; i >= 1; i--) {
          ctx.globalAlpha = i / 3.5;
          ctx.strokeStyle = `hsl(0,80%,${20 + i * 15}%)`;
          ctx.beginPath();
          ctx.arc(x, y, (tr * i) / 3, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5: 6-point star polygon with red gradient
      {
        const [x, y] = [positions[4], ty];
        const spikes = 6;
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const a = (i * Math.PI) / spikes - Math.PI / 2;
          const r = i % 2 === 0 ? tr : tr * 0.48;
          i === 0
            ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
            : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        }
        ctx.closePath();
        const grad = ctx.createRadialGradient(x, y, 0, x, y, tr);
        grad.addColorStop(0, "#6b0000");
        grad.addColorStop(1, "#ff7070");
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      // 6: Dark center, bright red rim + rotating radar sweep
      {
        const [x, y] = [positions[5], ty];
        ctx.save();
        const grad = ctx.createRadialGradient(x, y, 0, x, y, tr);
        grad.addColorStop(0, "#1a0000");
        grad.addColorStop(0.55, "#aa1010");
        grad.addColorStop(1, "#ff5050");
        ctx.beginPath();
        ctx.arc(x, y, tr, 0, TAU);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,200,200,0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const sa = t * 1.8;
        ctx.lineTo(x + Math.cos(sa) * tr, y + Math.sin(sa) * tr);
        ctx.stroke();
        ctx.restore();
      }

      // Labels
      ctx.fillStyle = "rgba(200,200,200,0.7)";
      ctx.font = "11px monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < 6; i++) {
        ctx.fillText(`${i + 1}`, positions[i], ty + tr + 14);
      }
    }
    // --- END TURRET SHOWCASE ---

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

  _initShowcase() {
    const sr = 80;
    this._showcaseSr = sr;
    const rawBumps = [
      { a: -1.47, d: 0.7 },
      { a: -0.48, d: 0.76 },
      { a: 0.72, d: 0.68 },
      { a: 1.8, d: 0.73 },
      { a: -2.45, d: 0.74 },
      { a: 3.0, d: 0.66 },
    ].map(({ a, d }) => ({ dx: Math.cos(a) * d * sr, dy: Math.sin(a) * d * sr }));

    this._showcaseSorted = rawBumps
      .slice()
      .sort((a, b) => Math.atan2(a.dy, a.dx) - Math.atan2(b.dy, b.dx));

    const verts = this._showcaseSorted.map((b) => ({ x: b.dx, y: b.dy }));
    const cellR = sr * 0.13;
    const cells = generatePolyCells(verts, cellR);
    this._showcaseCanvasB = buildMetaballCanvas(cells, "rgb(100, 140, 185)", sr, cellR, 14, 0.72);
    this._showcaseReady = true;
  }

  _drawPolyShowcase(ctx, x, y, rot) {
    const verts = this._showcaseSorted;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    ctx.shadowColor = "rgb(120, 190, 255)";
    ctx.shadowBlur = 28;

    const sr = this._showcaseSr;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
    grad.addColorStop(0, "rgb(190, 225, 255)");
    grad.addColorStop(0.45, "rgb(100, 155, 215)");
    grad.addColorStop(1, "rgb(28, 60, 120)");

    ctx.beginPath();
    ctx.moveTo(verts[0].dx, verts[0].dy);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].dx, verts[i].dy);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(180, 230, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

if (typeof module !== "undefined") module.exports = { UIRenderer };
