'use strict';

// Gemeinsame Metaball-Render-Utilities.
// Verwendet von ClusterAsteroid, RockCluster, PumiceCluster.

/**
 * Erzeugt Zellen in einem Hex-Gitter innerhalb eines Kreises mit `radius`.
 * Standard für Cluster-Asteroids und RockCluster (statische Position relativ zum Zentrum).
 * @returns {Array<{dx, dy, r}>}
 */
function generateHexCells(radius, cellR, {
    spacingFactor = METABALL_SPACING_RATIO,
    jitter        = METABALL_CELL_JITTER,
    sizeJitter    = METABALL_CELL_SIZE_JITTER,
} = {}) {
    const spacing = cellR * spacingFactor;
    const rowH    = spacing * METABALL_HEX_PACKING;   // sqrt(3)/2 für Hex-Packing
    const span    = Math.ceil(radius * 2 / rowH) + 1;
    const cells   = [];
    for (let row = 0; row < span; row++) {
        const dy0  = -radius + row * rowH;
        const xOff = (row % 2) * spacing / 2;
        for (let col = 0; col < span; col++) {
            const dx0 = -radius + col * spacing + xOff;
            if (Math.hypot(dx0, dy0) >= radius - cellR * 0.3) continue;
            cells.push({
                dx: dx0 + rand(-jitter, jitter),
                dy: dy0 + rand(-jitter, jitter),
                r:  cellR * rand(1 - sizeJitter, 1 + sizeJitter),
            });
        }
    }
    return cells;
}

/**
 * Baut eine zweistufige Metaball-Textur:
 *   1. Blur-Canvas mit dunklem Hintergrund + farbigen, weichgezeichneten Zellen
 *   2. Contrast-Canvas, der die Blur-Quelle scharfzeichnet — fertig zum Zeichnen mit `screen`-Blend.
 *
 * Aufrufer zeichnet das Resultat mit `ctx.globalCompositeOperation = 'screen'`.
 *
 * @param {Array<{dx, dy, r}>} cells - Zellpositionen relativ zum Zentrum
 * @param {string} color - Cell-Farbe (z.B. 'rgb(100, 140, 185)')
 * @param {number} radius - Bounding-Radius des Clusters (für Canvas-Größe)
 * @param {number} cellR - Zell-Basisradius (für Blur-Stärke)
 * @param {number} [contrast=14] - Stärke des Contrast-Filters
 * @param {number} [blurFactor=0.75] - Blur als Faktor von cellR
 * @returns {HTMLCanvasElement}
 */
function buildMetaballCanvas(cells, color, radius, cellR,
    contrast   = METABALL_DEFAULT_CONTRAST,
    blurFactor = METABALL_DEFAULT_BLUR_RATIO,
) {
    const blur = Math.round(cellR * blurFactor);
    const pad  = blur * 3 + 4;
    const sz   = Math.ceil((radius + pad) * 2);
    const half = sz / 2;

    // Pass 1: Blur-Canvas mit dunklem Hintergrund + weichgezeichneten Zellen
    const blurCanvas = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
    const blurCtx    = blurCanvas.getContext('2d');
    blurCtx.fillStyle = '#050210';
    blurCtx.fillRect(0, 0, sz, sz);
    blurCtx.filter    = `blur(${blur}px)`;
    blurCtx.fillStyle = color;
    for (const c of cells) {
        blurCtx.beginPath();
        blurCtx.arc(half + c.dx, half + c.dy, c.r * METABALL_DRAW_BLOAT, 0, TAU);
        blurCtx.fill();
    }
    blurCtx.filter = 'none';

    // Pass 2: Contrast-Filter beim Übertragen einbacken — draw() braucht keinen Filter mehr
    const out    = Object.assign(document.createElement('canvas'), { width: sz, height: sz });
    const outCtx = out.getContext('2d');
    outCtx.filter = `contrast(${contrast})`;
    outCtx.drawImage(blurCanvas, 0, 0);
    return out;
}

/**
 * Pro-Frame Metaball-Render in vorhandene Canvas-Buffer.
 * Für dynamische Cluster (z.B. PumiceCluster), wo sich Zellen ändern können.
 * Aufrufer muss die Buffer (bufferCanvas, contrastCanvas) im Konstruktor anlegen.
 *
 * @param {CanvasRenderingContext2D} targetCtx - Haupt-Spielfeld-Context
 * @param {HTMLCanvasElement} bufferCanvas - persistenter Blur-Buffer
 * @param {HTMLCanvasElement} contrastCanvas - persistenter Contrast-Buffer
 * @param {Array<{x, y, r}>} cells - Zellen in WELT-Koordinaten (nur lebende)
 * @param {number} worldX - Cluster-Position X (Welt)
 * @param {number} worldY - Cluster-Position Y (Welt)
 * @param {string} color - Cell-Farbe
 * @param {number} blur - Blur-Stärke in Pixel
 * @param {number} contrast - Contrast-Filter-Stärke
 */
function renderMetaballFrame(targetCtx, bufferCanvas, contrastCanvas, cells, worldX, worldY, color, blur, contrast) {
    if (!cells.length) return;
    const bufCtx  = bufferCanvas.getContext('2d');
    const conCtx  = contrastCanvas.getContext('2d');
    const size    = bufferCanvas.width;
    const ox      = worldX - size / 2;
    const oy      = worldY - size / 2;

    bufCtx.fillStyle = '#050210';
    bufCtx.fillRect(0, 0, size, size);
    bufCtx.filter    = `blur(${blur}px)`;
    bufCtx.fillStyle = color;
    for (const c of cells) {
        bufCtx.beginPath();
        bufCtx.arc(c.x - ox, c.y - oy, c.r * METABALL_DRAW_BLOAT, 0, TAU);
        bufCtx.fill();
    }
    bufCtx.filter = 'none';

    conCtx.clearRect(0, 0, size, size);
    conCtx.filter = `contrast(${contrast})`;
    conCtx.drawImage(bufferCanvas, 0, 0);
    conCtx.filter = 'none';

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen';
    targetCtx.drawImage(contrastCanvas, ox, oy);
    targetCtx.restore();
}

if (typeof module !== 'undefined') module.exports = { generateHexCells, buildMetaballCanvas, renderMetaballFrame };
