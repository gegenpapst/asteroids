'use strict';

const { PumicePoly } = require('../../src/entities/PumicePoly.js');

describe('PumicePoly constructor', () => {
    test('position is set from arguments', () => {
        const p = new PumicePoly(150, 250);
        expect(p.x).toBe(150);
        expect(p.y).toBe(250);
    });

    test('radius is in range 28–50', () => {
        for (let i = 0; i < 20; i++) {
            const r = new PumicePoly(0, 0).radius;
            expect(r).toBeGreaterThanOrEqual(28);
            expect(r).toBeLessThanOrEqual(50);
        }
    });

    test('starts alive with zero hits', () => {
        const p = new PumicePoly(0, 0);
        expect(p.alive).toBe(true);
        expect(p.hits).toBe(0);
    });

    test('verts count is between 11 and 17', () => {
        const p = new PumicePoly(0, 0);
        expect(p.verts.length).toBeGreaterThanOrEqual(11);
        expect(p.verts.length).toBeLessThanOrEqual(17);
    });

    test('has a Matter body', () => {
        expect(new PumicePoly(0, 0).body).toBeDefined();
    });
});

describe('PumicePoly.hit', () => {
    test('shrinks radius', () => {
        const p = new PumicePoly(100, 100);
        const before = p.radius;
        p.hit(150, 100);
        expect(p.radius).toBeLessThan(before);
    });

    test('increments hit counter', () => {
        const p = new PumicePoly(100, 100);
        p.hit(150, 100);
        expect(p.hits).toBe(1);
    });

    test('creates dent: verts at hit angle shrink more than overall scale', () => {
        const p = new PumicePoly(100, 100);
        p.rot = 0;
        const before = p.verts.map(v => v.r);
        p.hit(200, 100);  // local angle 0
        const scale = 0.86;
        for (let i = 0; i < p.verts.length; i++) {
            let da = ((p.verts[i].a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            da = Math.abs(da);
            if (da < 0.3) {
                expect(p.verts[i].r).toBeLessThan(before[i] * scale - 1);
            }
        }
    });

    test('returns destroyed=false before maxHits', () => {
        const p = new PumicePoly(0, 0);
        const { destroyed } = p.hit(50, 0);
        expect(destroyed).toBe(false);
    });

    test('returns destroyed=true and newBody=null at maxHits', () => {
        const p = new PumicePoly(0, 0);
        let last;
        for (let i = 0; i < p.maxHits; i++) last = p.hit(50, 0);
        expect(last.destroyed).toBe(true);
        expect(last.newBody).toBeNull();
        expect(p.alive).toBe(false);
    });

    test('returns oldBody and newBody references for body swap', () => {
        const p = new PumicePoly(0, 0);
        const originalBody = p.body;
        const { oldBody, newBody } = p.hit(50, 0);
        expect(oldBody).toBe(originalBody);
        expect(newBody).toBe(p.body);
        expect(newBody).not.toBe(oldBody);
    });
});

describe('PumicePoly.radiusAtAngle', () => {
    test('returns vertex radius when angle matches a vert exactly', () => {
        const p = new PumicePoly(0, 0);
        for (const v of p.verts) {
            expect(p.radiusAtAngle(v.a)).toBeCloseTo(v.r, 5);
        }
    });

    test('interpolates between adjacent verts', () => {
        const p = new PumicePoly(0, 0);
        const v1 = p.verts[0];
        const v2 = p.verts[1];
        const midAngle = (v1.a + v2.a) / 2;
        const midR     = (v1.r + v2.r) / 2;
        expect(p.radiusAtAngle(midAngle)).toBeCloseTo(midR, 5);
    });

    test('handles angle wrap-around (last to first vert)', () => {
        const p = new PumicePoly(0, 0);
        // angle just past last vert should interpolate to first vert
        const last  = p.verts[p.verts.length - 1];
        const result = p.radiusAtAngle(last.a + 0.01);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThan(p.radius * 1.5);
    });
});

describe('PumicePoly.collidesWithCircle (precise polygon hit)', () => {
    test('detects collision at center', () => {
        const p = new PumicePoly(100, 100);
        expect(p.collidesWithCircle(100, 100, 1)).toBe(true);
    });

    test('no collision far away', () => {
        const p = new PumicePoly(100, 100);
        expect(p.collidesWithCircle(500, 500, 5)).toBe(false);
    });

    test('dented direction: ship inside bounding circle but past dent does NOT collide', () => {
        const p = new PumicePoly(100, 100);
        p.rot = 0;
        // Hit at angle 0 several times to create a deep dent
        for (let i = 0; i < 3; i++) p.hit(200, 100);
        const polyR0 = p.radiusAtAngle(0);
        // place "ship" at distance between dent depth and pp.radius — should NOT collide
        const probeDist = (polyR0 + p.radius) / 2;
        expect(probeDist).toBeGreaterThan(polyR0);
        expect(p.collidesWithCircle(100 + probeDist, 100, 1)).toBe(false);
    });

    test('intact direction: ship just inside the outline DOES collide', () => {
        const p = new PumicePoly(100, 100);
        p.rot = 0;
        // pick an angle NOT hit: opposite side
        const probeAngle = Math.PI;
        const polyR = p.radiusAtAngle(probeAngle);
        const ship  = { x: 100 + Math.cos(probeAngle) * (polyR - 2), y: 100 + Math.sin(probeAngle) * (polyR - 2) };
        expect(p.collidesWithCircle(ship.x, ship.y, 1)).toBe(true);
    });
});

describe('PumicePoly.update', () => {
    test('returns true while alive', () => {
        expect(new PumicePoly(0, 0).update(0.1)).toBe(true);
    });

    test('returns false after destruction', () => {
        const p = new PumicePoly(0, 0);
        for (let i = 0; i < p.maxHits; i++) p.hit(50, 0);
        expect(p.update(0.1)).toBe(false);
    });
});
