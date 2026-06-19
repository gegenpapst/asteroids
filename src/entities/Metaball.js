import { rand, TAU } from "../utils.js";
import {
  METABALL_HEX_PACKING,
  METABALL_DEFAULT_CONTRAST,
  METABALL_DEFAULT_BLUR_RATIO,
  METABALL_DRAW_BLOAT,
  METABALL_SPACING_RATIO,
  METABALL_CELL_JITTER,
  METABALL_CELL_SIZE_JITTER,
} from "../Globals.js";

export function generateHexCells(
  radius,
  cellR,
  {
    spacingFactor = METABALL_SPACING_RATIO,
    jitter = METABALL_CELL_JITTER,
    sizeJitter = METABALL_CELL_SIZE_JITTER,
  } = {},
) {
  const spacing = cellR * spacingFactor;
  const rowH = spacing * METABALL_HEX_PACKING;
  const span = Math.ceil((radius * 2) / rowH) + 1;
  const cells = [];
  for (let row = 0; row < span; row++) {
    const dy0 = -radius + row * rowH;
    const xOff = ((row % 2) * spacing) / 2;
    for (let col = 0; col < span; col++) {
      const dx0 = -radius + col * spacing + xOff;
      if (Math.hypot(dx0, dy0) >= radius - cellR * 0.3) continue;
      cells.push({
        dx: dx0 + rand(-jitter, jitter),
        dy: dy0 + rand(-jitter, jitter),
        r: cellR * rand(1 - sizeJitter, 1 + sizeJitter),
      });
    }
  }
  return cells;
}

export function buildMetaballCanvas(
  cells,
  color,
  radius,
  cellR,
  contrast = METABALL_DEFAULT_CONTRAST,
  blurFactor = METABALL_DEFAULT_BLUR_RATIO,
) {
  const blur = Math.round(cellR * blurFactor);
  const pad = blur * 3 + 4;
  const sz = Math.ceil((radius + pad) * 2);
  const half = sz / 2;

  const blurCanvas = Object.assign(document.createElement("canvas"), { width: sz, height: sz });
  const blurCtx = blurCanvas.getContext("2d");
  blurCtx.fillStyle = "#050210";
  blurCtx.fillRect(0, 0, sz, sz);
  blurCtx.filter = `blur(${blur}px)`;
  blurCtx.fillStyle = color;
  for (const c of cells) {
    blurCtx.beginPath();
    blurCtx.arc(half + c.dx, half + c.dy, c.r * METABALL_DRAW_BLOAT, 0, TAU);
    blurCtx.fill();
  }
  blurCtx.filter = "none";

  const out = Object.assign(document.createElement("canvas"), { width: sz, height: sz });
  const outCtx = out.getContext("2d");
  outCtx.filter = `contrast(${contrast})`;
  outCtx.drawImage(blurCanvas, 0, 0);
  return out;
}

export function renderMetaballFrame(
  targetCtx,
  bufferCanvas,
  contrastCanvas,
  cells,
  worldX,
  worldY,
  color,
  blur,
  contrast,
) {
  if (!cells.length) return;
  const bufCtx = bufferCanvas.getContext("2d");
  const conCtx = contrastCanvas.getContext("2d");
  const size = bufferCanvas.width;
  const ox = worldX - size / 2;
  const oy = worldY - size / 2;

  bufCtx.fillStyle = "#050210";
  bufCtx.fillRect(0, 0, size, size);
  bufCtx.filter = `blur(${blur}px)`;
  bufCtx.fillStyle = color;
  for (const c of cells) {
    bufCtx.beginPath();
    bufCtx.arc(c.x - ox, c.y - oy, c.r * METABALL_DRAW_BLOAT, 0, TAU);
    bufCtx.fill();
  }
  bufCtx.filter = "none";

  conCtx.clearRect(0, 0, size, size);
  conCtx.filter = `contrast(${contrast})`;
  conCtx.drawImage(bufferCanvas, 0, 0);
  conCtx.filter = "none";

  targetCtx.save();
  targetCtx.globalCompositeOperation = "screen";
  targetCtx.drawImage(contrastCanvas, ox, oy);
  targetCtx.restore();
}

export function pointInPolygon(px, py, verts) {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].x,
      yi = verts[i].y;
    const xj = verts[j].x,
      yj = verts[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function generatePolyCells(verts, cellR) {
  const xs = verts.map((v) => v.x);
  const ys = verts.map((v) => v.y);
  const minX = Math.min(...xs) - cellR;
  const minY = Math.min(...ys) - cellR;
  const maxX = Math.max(...xs) + cellR;
  const maxY = Math.max(...ys) + cellR;

  const spacing = cellR * METABALL_SPACING_RATIO;
  const rowH = spacing * METABALL_HEX_PACKING;
  const cells = [];

  for (let row = 0; minY + row * rowH <= maxY + rowH; row++) {
    const dy = minY + row * rowH;
    const xOff = ((row % 2) * spacing) / 2;
    for (let col = 0; minX + col * spacing + xOff <= maxX + spacing; col++) {
      const dx = minX + col * spacing + xOff;
      if (!pointInPolygon(dx, dy, verts)) continue;
      cells.push({
        dx: dx + rand(-METABALL_CELL_JITTER, METABALL_CELL_JITTER),
        dy: dy + rand(-METABALL_CELL_JITTER, METABALL_CELL_JITTER),
        r: cellR * rand(1 - METABALL_CELL_SIZE_JITTER, 1 + METABALL_CELL_SIZE_JITTER),
      });
    }
  }
  return cells;
}
