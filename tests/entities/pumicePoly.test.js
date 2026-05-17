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
