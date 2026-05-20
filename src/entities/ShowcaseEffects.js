'use strict';

// ── Metaball Farbeffekte Showcase ────────────────────────────────────────────

const METABALL_EFFECTS = [
    { name: 'Glut',     rgb: [155, 140, 118], desc: 'Rot → Gelb → Weiß'      },
    { name: 'Eis',      rgb: [100, 140, 185], desc: 'Blau → Cyan → Weiß'     },
    { name: 'Toxisch',  rgb: [120, 185, 100], desc: 'Grün → Gelbgrün → Weiß' },
    { name: 'Plasma',   rgb: [175, 100, 175], desc: 'Magenta → Pink → Weiß'  },
    { name: 'Gold',     rgb: [185, 165,  50], desc: 'Orange → Gelb'           },
    { name: 'Saphir',   rgb: [ 60,  60, 195], desc: 'Reines Blau'             },
    { name: 'Lava',     rgb: [200, 120,  50], desc: 'Tiefrot → Orange'        },
    { name: 'Spektrum', rgb: [235, 165, 100], desc: 'Rot → Orange → Weiß'    },
];

function _buildEffectCanvas(rgb, radius) {
    const cellR   = radius * 0.24;
    const spacing = cellR * 1.65;
    const rowH    = spacing * 0.866;
    const span    = Math.ceil(radius * 2 / rowH) + 1;
    const cells   = [];

    for (let row = 0; row < span; row++) {
        const dy0  = -radius + row * rowH;
        const xOff = (row % 2) * spacing / 2;
        for (let col = 0; col < span; col++) {
            const dx0 = -radius + col * spacing + xOff;
            if (Math.hypot(dx0, dy0) >= radius - cellR * 0.3) continue;
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

// Pre-build all effect canvases once
const _effectCanvases = METABALL_EFFECTS.map(e => ({
    ...e,
    oc: _buildEffectCanvas(e.rgb, 52),
}));

function drawMetaballShowcase() {
    const COLS   = 4;
    const ROWS   = 2;
    const cellW  = W / COLS;          // 200
    const startY = 80;
    const cellH  = (H - startY - 20) / ROWS;   // ~250

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
    ctx.fillText('Derselbe Algorithmus — nur die Zellfarbe ändert sich', W / 2, 64);

    for (let i = 0; i < _effectCanvases.length; i++) {
        const e    = _effectCanvases[i];
        const col  = i % COLS;
        const row  = Math.floor(i / COLS);
        const cx   = cellW * col + cellW / 2;
        const cy   = startY + cellH * row + cellH * 0.44;
        const sz   = e.oc.width;

        // Background cell
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(cellW * col + 4, startY + cellH * row + 4, cellW - 8, cellH - 8);

        // Metaball blob
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(e.oc, cx - sz / 2, cy - sz / 2);
        ctx.restore();

        // Name
        ctx.textAlign   = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur  = 4;
        ctx.fillStyle   = '#ddd';
        ctx.font        = 'bold 13px monospace';
        ctx.fillText(e.name, cx, cy + 62);

        // Desc
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

    // Bottom hint — blinking
    if (Math.floor(Date.now() / 520) % 2) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = '#fff';
        ctx.font        = '15px monospace';
        ctx.fillText('ENTER / SPACE — Spielen   ·   C — Konfiguration', W / 2, H - 10);
        ctx.shadowBlur  = 0;
    }
}

if (typeof module !== 'undefined') module.exports = { drawMetaballShowcase };
