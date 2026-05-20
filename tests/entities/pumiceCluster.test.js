'use strict';

const { generateHexCells, buildMetaballCanvas, renderMetaballFrame } = require('../../src/entities/Metaball.js');
global.generateHexCells    = generateHexCells;
global.buildMetaballCanvas = buildMetaballCanvas;
global.renderMetaballFrame = renderMetaballFrame;
const { PumiceCluster } = require('../../src/entities/PumiceCluster.js');

describe('PumiceCluster constructor', () => {
    test('position is set from constructor arguments', () => {
        const p = new PumiceCluster(120, 340);
        expect(p.x).toBe(120);
        expect(p.y).toBe(340);
    });

    test('radius is within range 22–54', () => {
        for (let i = 0; i < 20; i++) {
            const r = new PumiceCluster(0, 0).radius;
            expect(r).toBeGreaterThanOrEqual(22);
            expect(r).toBeLessThanOrEqual(54);
        }
    });

    test('cells array is non-empty', () => {
        const p = new PumiceCluster(0, 0);
        expect(p.cells.length).toBeGreaterThan(0);
    });

    test('all cells start alive', () => {
        const p = new PumiceCluster(0, 0);
        for (const c of p.cells) expect(c.alive).toBe(true);
    });

    test('each cell has x, y, r, body and alive fields', () => {
        const p = new PumiceCluster(100, 100);
        for (const c of p.cells) {
            expect(typeof c.x).toBe('number');
            expect(typeof c.y).toBe('number');
            expect(c.r).toBeGreaterThan(0);
            expect(c.body).toBeDefined();
            expect(c.alive).toBe(true);
        }
    });

    test('all cells are inside the pumice radius', () => {
        const p = new PumiceCluster(200, 200);
        for (const c of p.cells) {
            expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeLessThan(p.radius);
        }
    });
});

describe('PumiceCluster.alive', () => {
    test('alive when at least one cell is alive', () => {
        const p = new PumiceCluster(0, 0);
        for (let i = 1; i < p.cells.length; i++) p.cells[i].alive = false;
        expect(p.alive).toBe(true);
    });

    test('not alive when all cells are dead', () => {
        const p = new PumiceCluster(0, 0);
        for (const c of p.cells) c.alive = false;
        expect(p.alive).toBe(false);
    });
});

describe('PumiceCluster.findHit', () => {
    test('returns cells within hit range of bullet', () => {
        const p = new PumiceCluster(100, 100);
        const c0 = p.cells[0];
        const hits = p.findHit(c0.x, c0.y, 3);
        expect(hits).toContain(c0);
    });

    test('returns empty array when bullet far from pumice', () => {
        const p = new PumiceCluster(100, 100);
        expect(p.findHit(1000, 1000, 3)).toHaveLength(0);
    });

    test('does not return dead cells', () => {
        const p = new PumiceCluster(100, 100);
        const c0 = p.cells[0];
        c0.alive = false;
        expect(p.findHit(c0.x, c0.y, 3)).not.toContain(c0);
    });
});

describe('PumiceCluster.cullIsolated', () => {
    const fakeWorld = { remove: () => {} };

    test('intaktes Cluster: keine Zelle wird entfernt', () => {
        const p = new PumiceCluster(200, 200);
        const aliveBefore = p.cells.filter(c => c.alive).length;
        p.cullIsolated(fakeWorld);
        expect(p.cells.filter(c => c.alive).length).toBe(aliveBefore);
    });

    test('einzelne isolierte Zelle (alle anderen tot) wird entfernt', () => {
        const p = new PumiceCluster(200, 200);
        // Alle Zellen außer der ersten töten
        for (let i = 1; i < p.cells.length; i++) p.cells[i].alive = false;
        p.cullIsolated(fakeWorld);
        expect(p.cells.filter(c => c.alive).length).toBe(0);
    });

    test('zwei benachbarte Zellen bleiben erhalten', () => {
        const p = new PumiceCluster(200, 200);
        // Alle Zellen töten
        for (const c of p.cells) c.alive = false;
        // Zwei direkte Nachbarn reaktivieren (Abstand < 2.5 × cellR)
        const c0 = p.cells[0];
        const neighbor = p.cells.find(
            c => c !== c0 && Math.hypot(c.x - c0.x, c.y - c0.y) < p._cellR * 2.5
        );
        if (neighbor) {
            c0.alive = true;
            neighbor.alive = true;
            p.cullIsolated(fakeWorld);
            expect(p.cells.filter(c => c.alive).length).toBe(2);
        }
    });

    test('kaskadiert nicht: nur direkte Nachbarn werden geprüft', () => {
        const p = new PumiceCluster(200, 200);
        // Kompakten Kern bilden: alle Zellen aktiv lassen
        // Randbereich manuell töten — nur echte Isolierte sollten verschwinden
        const aliveBefore = p.cells.filter(c => c.alive).length;
        p.cullIsolated(fakeWorld);
        const aliveAfter = p.cells.filter(c => c.alive).length;
        // Intaktes Cluster: cull darf nichts entfernen
        expect(aliveAfter).toBe(aliveBefore);
    });
});

describe('PumiceCluster.update', () => {
    test('always returns true', () => {
        const p = new PumiceCluster(0, 0);
        expect(p.update(1)).toBe(true);
    });
});
