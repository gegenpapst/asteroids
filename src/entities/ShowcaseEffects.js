'use strict';

// ── Metaball Effekte Showcase ─────────────────────────────────────────────────

const METABALL_EFFECTS = [
    // ── Reihe 1: Klassiker (Farbverläufe) ────────────────────────────────────
    { name: 'Glut',      rgb: [155, 140, 118], desc: 'Rot → Gelb → Weiß'         },
    { name: 'Eis',       rgb: [100, 140, 185], desc: 'Blau → Cyan → Weiß'        },
    { name: 'Gold',      rgb: [185, 165,  50], desc: 'Orange → Gelb'              },
    { name: 'Spektrum',  rgb: [235, 165, 100], desc: 'Rot → Orange → Weiß'       },
    // ── Reihe 2: Neue Farbvarianten ───────────────────────────────────────────
    { name: 'Braun',     rgb: [155, 125,  65], desc: 'Ocker → Hellbraun'          },
    { name: 'Steingrau', rgb: [145, 145, 158], desc: 'Kühles Grau',  contrast: 6 },
    { name: 'Violett',   rgb: [130,  80, 185], desc: 'Violett → Weiß'             },
    { name: 'Krater',    rgb: [200, 168, 108], desc: '5 Kratertäler', multiCrater: true },
    // ── Reihe 3: Kontrast-Techniken ───────────────────────────────────────────
    { name: 'Soft Glow', rgb: [120, 160, 220], desc: 'Weiches Leuchten', contrast: 2    },
    { name: 'Kristall',  rgb: [200, 230, 255], desc: 'Ultrascharf',      contrast: 100  },
    { name: 'Multi',     rgb: [200,  80,  80], desc: 'Zwei Farben',  multiColor: [80, 140, 220] },
    { name: 'Strahlen',  rgb: [255, 200,  60], desc: '6 Strahlen',   spokes: 6          },
    // ── Reihe 4: Form-Techniken ───────────────────────────────────────────────
    { name: 'Ringe',     rgb: [ 60, 200, 180], desc: 'Konzentr. Ringe', rings: 4        },
    { name: 'Punkte',    rgb: [180, 100, 220], desc: 'Einzelne Dots',  pixelDots: true  },
    { name: 'Negativ',   rgb: [ 60,  90, 160], desc: 'Dunkler Blob',   invert: true     },
    { name: 'Auge',      rgb: [220, 160,  80], desc: 'Augenform',      eyeShape: true   },
];

function _buildEffectCanvas(effect, radius) {
    const {
        rgb, ring, multiCrater, multiColor,
        spokes, rings: ringCount, pixelDots, invert, eyeShape,
        contrast: effectContrast = 14,
    } = effect;

    const cellR   = radius * 0.24;
    const spacing = pixelDots ? cellR * 4.8 : cellR * 1.65;
    const rowH    = spacing * 0.866;
    const span    = Math.ceil(radius * 2 / rowH) + 2;
    const innerR  = radius * 0.46;

    const craters = multiCrater ? [
        { dx: -radius * 0.30, dy: -radius * 0.26, r: radius * 0.26 },
        { dx:  radius * 0.28, dy:  radius * 0.22, r: radius * 0.22 },
        { dx: -radius * 0.08, dy:  radius * 0.32, r: radius * 0.20 },
        { dx:  radius * 0.10, dy: -radius * 0.10, r: radius * 0.18 },
        { dx: -radius * 0.30, dy:  radius * 0.10, r: radius * 0.16 },
    ] : [];

    const cells = [];
    for (let row = 0; row < span; row++) {
        const dy0  = -radius + row * rowH;
        const xOff = (row % 2) * spacing / 2;
        for (let col = 0; col < span; col++) {
            const dx0 = -radius + col * spacing + xOff;
            const d   = Math.hypot(dx0, dy0);

            if (d >= radius - cellR * 0.3) continue;
            if (ring && d < innerR) continue;
            if (craters.some(c => Math.hypot(dx0 - c.dx, dy0 - c.dy) < c.r * 0.58)) continue;

            // Spokes: cells only on N radial arms + small center hub
            if (spokes) {
                const a    = Math.atan2(dy0, dx0);
                const step = TAU / spokes;
                let ok     = d < radius * 0.22;
                for (let s = 0; s < spokes && !ok; s++) {
                    let diff = Math.abs(a - s * step);
                    if (diff > Math.PI) diff = TAU - diff;
                    if (diff < 0.26) ok = true;
                }
                if (!ok) continue;
            }

            // Concentric rings: cells only inside N ring bands
            if (ringCount) {
                let ok = false;
                for (let ri = 0; ri < ringCount && !ok; ri++) {
                    const rC = (ri + 0.5) * radius / (ringCount + 0.2);
                    if (Math.abs(d - rC) < radius / (ringCount * 2.8)) ok = true;
                }
                if (!ok) continue;
            }

            // Eye / almond shape: horizontal ellipse region
            if (eyeShape) {
                const ex = dx0 / (radius * 0.92);
                const ey = dy0 / (radius * 0.46);
                if (ex * ex + ey * ey > 1.0) continue;
            }

            cells.push({ dx: dx0, dy: dy0, r: cellR, d });
        }
    }

    const blur = Math.round(cellR * (pixelDots ? 0.35 : 0.75));
    const pad  = blur * 3 + 4;
    const sz   = Math.ceil((radius + pad) * 2);
    const half = sz / 2;

    // Invert: tinted light background, dark blob cells → dark shape on light ground
    const bgColor = invert
        ? `rgb(${170 + (rgb[0] / 6 | 0)},${165 + (rgb[1] / 6 | 0)},${178 + (rgb[2] / 5 | 0)})`
        : '#050210';

    const blur_oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
    const blur_ctx = blur_oc.getContext('2d');
    blur_ctx.fillStyle = bgColor;
    blur_ctx.fillRect(0, 0, sz, sz);
    blur_ctx.filter = `blur(${blur}px)`;

    if (multiColor) {
        // Two-pass: outer cells in secondary colour, inner cells in primary colour
        const [mr, mg, mb] = multiColor;
        blur_ctx.fillStyle = `rgb(${mr},${mg},${mb})`;
        for (const c of cells) {
            if (c.d > radius * 0.45) {
                blur_ctx.beginPath();
                blur_ctx.arc(half + c.dx, half + c.dy, c.r * 1.25, 0, TAU);
                blur_ctx.fill();
            }
        }
        blur_ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        for (const c of cells) {
            if (c.d <= radius * 0.45) {
                blur_ctx.beginPath();
                blur_ctx.arc(half + c.dx, half + c.dy, c.r * 1.25, 0, TAU);
                blur_ctx.fill();
            }
        }
    } else {
        blur_ctx.fillStyle = invert
            ? 'rgb(22, 18, 42)'                           // dark cells on light bg
            : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        for (const c of cells) {
            blur_ctx.beginPath();
            blur_ctx.arc(half + c.dx, half + c.dy, c.r * 1.25, 0, TAU);
            blur_ctx.fill();
        }
    }
    blur_ctx.filter = 'none';

    const oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
    const oct = oc.getContext('2d');
    oct.filter = `contrast(${effectContrast})`;
    oct.drawImage(blur_oc, 0, 0);
    return oc;
}

// Pre-build once at load time — radius 34 fits 4-row layout at W×H = 800×600
const _effectCanvases = METABALL_EFFECTS.map(e => ({
    ...e,
    oc: _buildEffectCanvas(e, 34),
}));

const _ROW_LABELS = ['Klassiker', 'Farbe', 'Kontrast', 'Formen'];

function drawMetaballShowcase() {
    const COLS   = 4;
    const startY = 80;
    const cellW  = W / COLS;
    const cellH  = (H - startY - 14) / 4;

    // ── Title ─────────────────────────────────────────────────────────────────
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#4af';
    ctx.shadowBlur  = 22;
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 22px monospace';
    ctx.fillText('METABALL EFFEKTE SHOWCASE', W / 2, 34);
    ctx.shadowBlur  = 0;

    ctx.fillStyle = '#445';
    ctx.font      = '10px monospace';
    ctx.fillText('Gleicher Algorithmus · blur → contrast · nur Parameter variieren', W / 2, 50);
    ctx.fillText('Farbe  ·  Kontrast  ·  Zellanordnung  ·  Gitterform', W / 2, 63);

    // ── Row section dividers + labels ─────────────────────────────────────────
    for (let row = 0; row < 4; row++) {
        const ry = startY + cellH * row;
        if (row > 0) {
            ctx.strokeStyle = 'rgba(80,120,200,0.15)';
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.moveTo(4, ry);
            ctx.lineTo(W - 4, ry);
            ctx.stroke();
        }
        ctx.fillStyle = '#334';
        ctx.font      = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(_ROW_LABELS[row], 5, ry + 9);
    }

    // ── Effect cells ──────────────────────────────────────────────────────────
    for (let i = 0; i < _effectCanvases.length; i++) {
        const e   = _effectCanvases[i];
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx  = cellW * col + cellW / 2;
        const cy  = startY + cellH * row + cellH * 0.475;
        const sz  = e.oc.width;

        // Subtle cell background
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(cellW * col + 2, startY + cellH * row + 2, cellW - 4, cellH - 4);

        // Blob
        ctx.save();
        if (e.invert) {
            ctx.drawImage(e.oc, cx - sz / 2, cy - sz / 2);
        } else {
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(e.oc, cx - sz / 2, cy - sz / 2);
        }
        ctx.restore();

        // ── Text labels ───────────────────────────────────────────────────────
        ctx.textAlign   = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur  = 4;

        ctx.fillStyle = '#ccc';
        ctx.font      = 'bold 11px monospace';
        ctx.fillText(e.name, cx, cy + 44);

        ctx.fillStyle = '#556';
        ctx.font      = '9px monospace';
        ctx.fillText(e.desc, cx, cy + 55);

        ctx.fillStyle = '#334';
        ctx.font      = '8px monospace';
        const techLabel = e.invert     ? 'invertiert'
                        : e.multiColor  ? '2-Farb-Pass'
                        : e.spokes      ? `spokes:${e.spokes}`
                        : e.rings       ? `rings:${e.rings}`
                        : e.pixelDots   ? 'pixelDots'
                        : e.eyeShape    ? 'eyeShape'
                        : e.multiCrater ? 'multiCrater'
                        : `rgb(${e.rgb.join(',')})`;
        ctx.fillText(techLabel, cx, cy + 63);

        ctx.shadowBlur = 0;
    }

    // ── Bottom prompt (blinking) ───────────────────────────────────────────────
    if (Math.floor(Date.now() / 520) % 2) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = '#fff';
        ctx.font        = '14px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText('ENTER / SPACE — Spielen   ·   C — Konfiguration', W / 2, H - 8);
        ctx.shadowBlur  = 0;
    }
}

if (typeof module !== 'undefined') module.exports = { drawMetaballShowcase };
