'use strict';

const { Pumice } = require('../../src/entities/Pumice.js');

describe('Pumice constructor', () => {
    test('position is set from constructor arguments', () => {
        const p = new Pumice(120, 340);
        expect(p.x).toBe(120);
        expect(p.y).toBe(340);
    });

    test('radius is within range 22–54', () => {
        for (let i = 0; i < 20; i++) {
            const r = new Pumice(0, 0).radius;
            expect(r).toBeGreaterThanOrEqual(22);
            expect(r).toBeLessThanOrEqual(54);
        }
    });

    test('cells array is non-empty', () => {
        const p = new Pumice(0, 0);
        expect(p.cells.length).toBeGreaterThan(0);
    });

    test('all cells start alive', () => {
        const p = new Pumice(0, 0);
        for (const c of p.cells) expect(c.alive).toBe(true);
    });

    test('each cell has x, y, r, body and alive fields', () => {
        const p = new Pumice(100, 100);
        for (const c of p.cells) {
            expect(typeof c.x).toBe('number');
            expect(typeof c.y).toBe('number');
            expect(c.r).toBeGreaterThan(0);
            expect(c.body).toBeDefined();
            expect(c.alive).toBe(true);
        }
    });

    test('all cells are inside the pumice radius', () => {
        const p = new Pumice(200, 200);
        for (const c of p.cells) {
            expect(Math.hypot(c.x - p.x, c.y - p.y)).toBeLessThan(p.radius);
        }
    });
});

describe('Pumice.alive', () => {
    test('alive when at least one cell is alive', () => {
        const p = new Pumice(0, 0);
        for (let i = 1; i < p.cells.length; i++) p.cells[i].alive = false;
        expect(p.alive).toBe(true);
    });

    test('not alive when all cells are dead', () => {
        const p = new Pumice(0, 0);
        for (const c of p.cells) c.alive = false;
        expect(p.alive).toBe(false);
    });
});

describe('Pumice.findHit', () => {
    test('returns cells within hit range of bullet', () => {
        const p = new Pumice(100, 100);
        const c0 = p.cells[0];
        const hits = p.findHit(c0.x, c0.y, 3);
        expect(hits).toContain(c0);
    });

    test('returns empty array when bullet far from pumice', () => {
        const p = new Pumice(100, 100);
        expect(p.findHit(1000, 1000, 3)).toHaveLength(0);
    });

    test('does not return dead cells', () => {
        const p = new Pumice(100, 100);
        const c0 = p.cells[0];
        c0.alive = false;
        expect(p.findHit(c0.x, c0.y, 3)).not.toContain(c0);
    });
});

describe('Pumice.update', () => {
    test('always returns true', () => {
        const p = new Pumice(0, 0);
        expect(p.update(1)).toBe(true);
    });
});
