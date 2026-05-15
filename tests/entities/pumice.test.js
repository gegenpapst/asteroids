'use strict';

const { Pumice } = require('../../src/entities/Pumice.js');

afterEach(() => jest.restoreAllMocks());

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

    test('starts alive with zero hits', () => {
        const p = new Pumice(0, 0);
        expect(p.alive).toBe(true);
        expect(p.hits).toBe(0);
    });

    test('maxHits is at least 6', () => {
        for (let i = 0; i < 20; i++) {
            expect(new Pumice(0, 0).maxHits).toBeGreaterThanOrEqual(6);
        }
    });

    test('has 14 vertices each with a and r fields', () => {
        const p = new Pumice(0, 0);
        expect(p.verts).toHaveLength(14);
        for (const v of p.verts) {
            expect(typeof v.a).toBe('number');
            expect(typeof v.r).toBe('number');
            expect(typeof v.r0).toBe('number');
        }
    });

    test('creates a Matter body at constructor position', () => {
        const p = new Pumice(200, 300);
        expect(p.body.position.x).toBe(200);
        expect(p.body.position.y).toBe(300);
    });
});

describe('Pumice.currentRadius', () => {
    test('equals full radius when unhit', () => {
        const p = new Pumice(0, 0);
        expect(p.currentRadius).toBeCloseTo(p.radius);
    });

    test('shrinks proportionally with hits', () => {
        const p = new Pumice(0, 0);
        const r0 = p.currentRadius;
        p.hit(p.x + 10, p.y);
        expect(p.currentRadius).toBeLessThan(r0);
    });

    test('does not reach zero before maxHits', () => {
        const p = new Pumice(0, 0);
        for (let i = 0; i < p.maxHits - 1; i++) p.hit(p.x + 10, p.y);
        expect(p.currentRadius).toBeGreaterThan(0);
    });
});

describe('Pumice.hit', () => {
    test('increments hits', () => {
        const p = new Pumice(0, 0);
        p.hit(10, 0);
        expect(p.hits).toBe(1);
    });

    test('adds a hole at the impact position', () => {
        const p = new Pumice(0, 0);
        p.hit(55, 77);
        expect(p.holes).toHaveLength(1);
        expect(p.holes[0]).toEqual({ x: 55, y: 77 });
    });

    test('erodes vertices near the impact direction', () => {
        const p = new Pumice(0, 0);
        const rsBefore = p.verts.map(v => v.r);
        p.hit(p.x + p.radius, p.y); // hit from the right
        const rsAfter = p.verts.map(v => v.r);
        expect(rsAfter.some((r, i) => r < rsBefore[i])).toBe(true);
    });

    test('sets alive=false after maxHits hits', () => {
        const p = new Pumice(0, 0);
        for (let i = 0; i < p.maxHits; i++) p.hit(p.x + 10, p.y);
        expect(p.alive).toBe(false);
    });

    test('stays alive before maxHits hits', () => {
        const p = new Pumice(0, 0);
        for (let i = 0; i < p.maxHits - 1; i++) p.hit(p.x + 10, p.y);
        expect(p.alive).toBe(true);
    });
});

describe('Pumice.update', () => {
    test('always returns true', () => {
        const p = new Pumice(0, 0);
        expect(p.update(1)).toBe(true);
    });
});
