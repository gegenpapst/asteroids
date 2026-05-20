'use strict';

// ─── Showcase: visual style comparison shown on the start screen ──────────────
// Six standalone draw functions — no state, no classes.
// Ships: _drawShipA/B/C(x, y, angle)   UFOs: _drawUfoA/B/C(x, y)

const _SS  = 3.2;   // ship scale factor relative to SHIP_SIZE
const _USR = 26;    // UFO showcase radius (px)

// ── Ship A: Neon Wireframe ────────────────────────────────────────────────────
function _drawShipA(x, y, angle) {
    const s = SHIP_SIZE * _SS;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.shadowColor = '#4af';
    ctx.shadowBlur  = 14;
    ctx.strokeStyle = '#4af';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.55);
    ctx.lineTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.7,  s * 0.55);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(80,190,255,0.5)';
    ctx.shadowBlur  = 5;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(s * 0.32, 0);
    ctx.lineTo(-s * 0.48, -s * 0.32);
    ctx.moveTo(s * 0.32, 0);
    ctx.lineTo(-s * 0.48,  s * 0.32);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(140,220,255,0.8)';
    ctx.shadowBlur  = 10;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(s * 0.22, 0, s * 0.18, -Math.PI * 0.55, Math.PI * 0.55);
    ctx.stroke();

    ctx.restore();
}

// ── Ship B: Filled + Glow ─────────────────────────────────────────────────────
function _drawShipB(x, y, angle) {
    const s = SHIP_SIZE * _SS;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.55);
    ctx.lineTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.7,  s * 0.55);
    ctx.closePath();
    ctx.fillStyle   = '#070e1e';
    ctx.shadowColor = '#4af';
    ctx.shadowBlur  = 20;
    ctx.fill();
    ctx.strokeStyle = '#4af';
    ctx.lineWidth   = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(s * 0.22, 0, s * 0.14, 0, TAU);
    ctx.fillStyle   = 'rgba(80,210,255,0.9)';
    ctx.shadowBlur  = 14;
    ctx.fill();

    ctx.shadowColor = '#f80';
    ctx.shadowBlur  = 12;
    ctx.strokeStyle = '#f80';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.36, -s * 0.18);
    ctx.lineTo(-s * 0.52,  0);
    ctx.lineTo(-s * 0.36,  s * 0.18);
    ctx.stroke();

    ctx.restore();
}

// ── Ship C: Gradient Sprite ───────────────────────────────────────────────────
function _drawShipC(x, y, angle) {
    const s = SHIP_SIZE * _SS;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const hg = ctx.createLinearGradient(-s * 0.7, 0, s, 0);
    hg.addColorStop(0,    '#05101e');
    hg.addColorStop(0.55, '#0c1f38');
    hg.addColorStop(1,    '#112a50');
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.55);
    ctx.lineTo(-s * 0.35, 0);
    ctx.lineTo(-s * 0.7,  s * 0.55);
    ctx.closePath();
    ctx.fillStyle   = hg;
    ctx.shadowColor = '#28c8ff';
    ctx.shadowBlur  = 22;
    ctx.fill();
    ctx.strokeStyle = '#5cf';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = '#8df';
    ctx.shadowBlur  = 0;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, 0);
    ctx.lineTo(-s * 0.58, -s * 0.44);
    ctx.moveTo(s * 0.1, 0);
    ctx.lineTo(-s * 0.58,  s * 0.44);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const cg = ctx.createRadialGradient(s * 0.14, -s * 0.04, 0, s * 0.22, 0, s * 0.16);
    cg.addColorStop(0, 'rgba(200,245,255,0.95)');
    cg.addColorStop(1, 'rgba(30,100,180,0.3)');
    ctx.beginPath();
    ctx.arc(s * 0.22, 0, s * 0.16, 0, TAU);
    ctx.fillStyle   = cg;
    ctx.shadowColor = '#9ef';
    ctx.shadowBlur  = 16;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-s * 0.35, 0, s * 0.16, Math.PI * 0.55, Math.PI * 1.45);
    ctx.strokeStyle = '#fa6';
    ctx.shadowColor = '#f90';
    ctx.shadowBlur  = 18;
    ctx.lineWidth   = 3;
    ctx.stroke();

    ctx.restore();
}

// ── UFO A: Neon Wireframe ─────────────────────────────────────────────────────
function _drawUfoA(x, y) {
    const r = _USR;
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = '#4f8';
    ctx.shadowBlur  = 14;
    ctx.strokeStyle = '#4f8';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.14, r, r * 0.34, 0, 0, TAU);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.5, r * 0.38, 0, Math.PI, TAU);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(80,255,140,0.3)';
    ctx.shadowBlur  = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, 0);
    ctx.lineTo( r * 0.5, 0);
    ctx.stroke();

    ctx.shadowBlur  = 10;
    ctx.strokeStyle = '#4f8';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * r * 0.42, r * 0.14, r * 0.065, 0, TAU);
        ctx.stroke();
    }

    ctx.restore();
}

// ── UFO B: Filled + Glow ──────────────────────────────────────────────────────
function _drawUfoB(x, y) {
    const r = _USR;
    ctx.save();
    ctx.translate(x, y);

    ctx.beginPath();
    ctx.ellipse(0, r * 0.14, r, r * 0.34, 0, 0, TAU);
    ctx.fillStyle   = '#07130d';
    ctx.shadowColor = '#4f8';
    ctx.shadowBlur  = 22;
    ctx.fill();
    ctx.strokeStyle = '#4f8';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.5, r * 0.38, 0, Math.PI, TAU);
    ctx.fillStyle   = '#0a1c12';
    ctx.shadowBlur  = 12;
    ctx.fill();
    ctx.stroke();

    const t = Date.now() / 300;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc((i - 1.5) * r * 0.56, r * 0.15, r * 0.08, 0, TAU);
        ctx.fillStyle   = Math.floor(t + i) % 2 ? '#4f8' : '#153020';
        ctx.shadowColor = '#4f8';
        ctx.shadowBlur  = Math.floor(t + i) % 2 ? 14 : 2;
        ctx.fill();
    }

    ctx.restore();
}

// ── UFO C: Gradient Sprite ────────────────────────────────────────────────────
function _drawUfoC(x, y) {
    const r = _USR;
    ctx.save();
    ctx.translate(x, y);

    const dg = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5);
    dg.addColorStop(0,    '#1a3a22');
    dg.addColorStop(0.45, '#0d2018');
    dg.addColorStop(1,    '#060e0a');
    ctx.beginPath();
    ctx.ellipse(0, r * 0.14, r, r * 0.34, 0, 0, TAU);
    ctx.fillStyle   = dg;
    ctx.shadowColor = '#5fa';
    ctx.shadowBlur  = 25;
    ctx.fill();
    ctx.strokeStyle = '#5fa';
    ctx.lineWidth   = 1.5;
    ctx.stroke();

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#4f8';
    ctx.lineWidth   = 0.8;
    ctx.shadowBlur  = 0;
    for (const rx of [r * 0.65, r * 0.32]) {
        ctx.beginPath();
        ctx.ellipse(0, r * 0.14, rx, rx * 0.34, 0, 0, TAU);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const dcg = ctx.createRadialGradient(-r * 0.1, -r * 0.14, 0, 0, 0, r * 0.52);
    dcg.addColorStop(0,   'rgba(100,255,160,0.65)');
    dcg.addColorStop(0.5, 'rgba(20,100,50,0.35)');
    dcg.addColorStop(1,   'rgba(5,25,12,0.08)');
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.5, r * 0.38, 0, Math.PI, TAU);
    ctx.fillStyle   = dcg;
    ctx.shadowColor = '#4f8';
    ctx.shadowBlur  = 16;
    ctx.fill();
    ctx.strokeStyle = '#6fb';
    ctx.lineWidth   = 1;
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
        const lit = Math.floor(Date.now() / 260 + i) % 3 === 0;
        ctx.beginPath();
        ctx.arc((i - 2) * r * 0.44, r * 0.15, r * 0.07, 0, TAU);
        ctx.fillStyle   = lit ? '#9ff' : '#1a4030';
        ctx.shadowColor = '#4f8';
        ctx.shadowBlur  = lit ? 12 : 0;
        ctx.fill();
    }

    ctx.restore();
}
