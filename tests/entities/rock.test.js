'use strict';

const { Rock } = require('../../src/entities/Rock.js');

afterEach(() => jest.restoreAllMocks());

describe('Rock constructor', () => {
    test('position is set from constructor arguments', () => {
        const r = new Rock(150, 250);
        expect(r.x).toBe(150);
        expect(r.y).toBe(250);
    });

    test('radius is within expected range (22–54)', () => {
        for (let i = 0; i < 20; i++) {
            const r = new Rock(0, 0).radius;
            expect(r).toBeGreaterThanOrEqual(22);
            expect(r).toBeLessThanOrEqual(54);
        }
    });

    test('has exactly 16 vertices', () => {
        expect(new Rock(0, 0).verts).toHaveLength(16);
    });

    test('each vertex has angle and radius fields', () => {
        for (const v of new Rock(0, 0).verts) {
            expect(typeof v.a).toBe('number');
            expect(typeof v.r).toBe('number');
        }
    });

    test('vertex radii stay within shape bounds', () => {
        const rock = new Rock(0, 0);
        for (const v of rock.verts) {
            expect(v.r).toBeGreaterThan(rock.radius * 0.75);
            expect(v.r).toBeLessThan(rock.radius * 1.2);
        }
    });
});

describe('Rock.update', () => {
    test('always returns true (never removed)', () => {
        const r = new Rock(0, 0);
        expect(r.update(1)).toBe(true);
        expect(r.update(100)).toBe(true);
    });

    test('position does not change after update', () => {
        const r = new Rock(300, 400);
        r.update(5);
        expect(r.x).toBe(300);
        expect(r.y).toBe(400);
    });
});
