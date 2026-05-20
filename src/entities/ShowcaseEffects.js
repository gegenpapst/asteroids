'use strict';

// ── Metaball Farbeffekte Showcase ────────────────────────────────────────────

const METABALL_EFFECTS = [
    // ── Behalten ──────────────────────────────────────────────────────────────
    { name: 'Glut',      rgb: [155, 140, 118], desc: 'Rot → Gelb → Weiß'       },
    { name: 'Eis',       rgb: [100, 140, 185], desc: 'Blau → Cyan → Weiß'      },
    { name: 'Gold',      rgb: [185, 165,  50], desc: 'Orange → Gelb'            },
    { name: 'Spektrum',  rgb: [235, 165, 100], desc: 'Rot → Orange → Weiß'     },
    // ── Neue Vorschläge ────────────────────────────────────────────────────────
    { name: 'Braun',     rgb: [190, 130,  70], desc: 'Rost → Ocker'             },
    { name: 'Steingrau', rgb: [148, 155, 172], desc: 'Kühles Blaugrau'          },
    { name: 'Mondstaub', rgb: [170, 165, 155], desc: 'Warmes Neutralgrau'       },
    { name: 'Krater',    rgb: [215, 180, 110], desc: 'Leuchtender Kraterrand', ring: true },
];

function _buildEffectCanvas(effect, radius) {
    const { rgb, ring } = effect;
    const cellR   = radius * 0.24;
    const spacing = cellR * 1.65;
    const rowH    = spacing * 0.866;
    const span    = Math.ceil(radius * 2 / rowH) + 1;
    const innerR  = radius * 0.46;   // hollow core for crater
    const cells   = [];

    for (let row = 0; row < span; row++) {
        const dy0  = -radius + row * rowH;
        const xOff = (row % 2) * spacing / 2;
        for (let col = 0; col < span; col++) {
            const dx0 = -radius + col * spacing + xOff;
            const d   = Math.hypot(dx0, dy0);
            if (d >= radius - cellR * 0.3) continue;
            if (ring && d < innerR) continue;   // skip interior → crater shape
            cells.push({ dx: dx0, dy: dy0, r: cellR });
        }
    }

    const blur = Math.round(cellR * 0.75);
    const pad  = blur * 3 + 4;
    const sz   = Math.ceil((radius + pad) * 2);
    const half = sz / 2;

    const blur_oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
    const blur_ctx = blur_oc.getContext('2d');
    blur_ctx.fillStyle = '#050210';
    blur_ctx.fillRect(0, 0, sz, sz);
    blur_ctx.filter    = `blur(${blur}px)`;
    blur_ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    for (const c of cells) {
        blur_ctx.beginPath();
        blur_ctx.arc(half + c.dx, half + c.dy, c.r * 1.25, 0, TAU);
        blur_ctx.fill();
    }
    blur_ctx.filter = 'none';

    const oc  = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
    const oct = oc.getContext('2d');
    oct.filter = 'contrast(14)';
    oct.drawImage(blur_oc, 0, 0);
    return oc;
}

// Pre-build once at load time
const _effectCanvases = METABALL_EFFECTS.map(e => ({
    ...e,
    oc: _buildEffectCanvas(e, 52),
}));

function drawMetaballShowcase() {
    const COLS   = 4;
    const startY = 80;
    const cellW  = W / COLS;
    const cellH  = (H - startY - 20) / 2;

    // Title
    ctx.textAlign   = 'center';
    ctx.shadowColor = '#4af';
    ctx.shadowBlur  = 22;
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 26px monospace';
    ctx.fillText('METABALL FARBEFFEKTE', W / 2, 44);
    ctx.shadowBlur  = 0;

    ctx.fillStyle = '#445';
    ctx.font      = '11px monospace';
    ctx.fillText('Derselbe Algorithmus — nur die Zellfarbe ändert sich  ·  Krater: Ring-Zellmuster', W / 2, 64);

    for (let i = 0; i < _effectCanvases.length; i++) {
        const e   = _effectCanvases[i];
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx  = cellW * col + cellW / 2;
        const cy  = startY + cellH * row + cellH * 0.44;
        const sz  = e.oc.width;

        // Subtle cell background
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(cellW * col + 4, startY + cellH * row + 4, cellW - 8, cellH - 8);

        // "NEU" badge for new proposals
        if (i >= 4) {
            ctx.fillStyle   = 'rgba(80,200,120,0.18)';
            ctx.strokeStyle = 'rgba(80,200,120,0.5)';
            ctx.lineWidth   = 1;
            ctx.fillRect(cellW * col + 8, startY + cellH * row + 8, 32, 14);
            ctx.strokeRect(cellW * col + 8, startY + cellH * row + 8, 32, 14);
            ctx.fillStyle = '#4d8';
            ctx.font      = 'bold 9px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('NEU', cellW * col + 13, startY + cellH * row + 18);
        }

        // Metaball blob
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(e.oc, cx - sz / 2, cy - sz / 2);
        ctx.restore();

        ctx.textAlign   = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur  = 4;

        // Name
        ctx.fillStyle = '#ddd';
        ctx.font      = 'bold 13px monospace';
        ctx.fillText(e.name, cx, cy + 62);

        // Description
        ctx.fillStyle = '#667';
        ctx.font      = '10px monospace';
        ctx.fillText(e.desc, cx, cy + 76);

        // RGB
        const [r, g, b] = e.rgb;
        ctx.fillStyle = '#445';
        ctx.font      = '10px monospace';
        ctx.fillText(`rgb(${r},${g},${b})`, cx, cy + 89);

        ctx.shadowBlur = 0;
    }

    // Separator between old/new
    ctx.strokeStyle = 'rgba(80,200,120,0.2)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, startY + 4);
    ctx.lineTo(W / 2, startY + cellH - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W / 2, startY + cellH + 4);
    ctx.lineTo(W / 2, H - 24);
    ctx.stroke();

    // Labels: Behalten / Neu
    ctx.font      = '10px monospace';
    ctx.fillStyle = '#334';
    ctx.textAlign = 'left';
    ctx.fillText('◀ Behalten', 8, startY + 18);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2a6';
    ctx.fillText('Neue Vorschläge ▶', W - 8, startY + 18);

    // Bottom prompt
    if (Math.floor(Date.now() / 520) % 2) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = '#fff';
        ctx.font        = '15px monospace';
        ctx.textAlign   = 'center';
        ctx.fillText('ENTER / SPACE — Spielen   ·   C — Konfiguration', W / 2, H - 10);
        ctx.shadowBlur  = 0;
    }
}

if (typeof module !== 'undefined') module.exports = { drawMetaballShowcase };
