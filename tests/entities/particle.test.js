'use strict';

const { Particle } = require('../../src/entities/Particle.js');

describe('Particle constructor', () => {
    test('starts at given position', () => {
        const p = new Particle(123, 456);
        expect(p.x).toBe(123);
        expect(p.y).toBe(456);
    });

    test('life is between 0.3 and PARTICLE_LIFE', () => {
        for (let i = 0; i < 20; i++) {
            const p = new Particle(0, 0);
            expect(p.life).toBeGreaterThanOrEqual(0.3);
            expect(p.life).toBeLessThanOrEqual(PARTICLE_LIFE);
        }
    });

    test('life equals maxLife on construction', () => {
        const p = new Particle(0, 0);
        expect(p.life).toBe(p.maxLife);
    });

    test('size is between 1 and 3.5', () => {
        for (let i = 0; i < 20; i++) {
            const p = new Particle(0, 0);
            expect(p.size).toBeGreaterThanOrEqual(1);
            expect(p.size).toBeLessThanOrEqual(3.5);
        }
    });

    test('uses provided color', () => {
        expect(new Particle(0, 0, '#abc').color).toBe('#abc');
    });

    test('falls back to orange hsl when color omitted', () => {
        expect(new Particle(0, 0).color).toMatch(/^hsl\(/);
    });
});

describe('Particle.update', () => {
    test('decrements life by dt', () => {
        const p = new Particle(0, 0);
        const lifeBefore = p.life;
        p.update(0.1);
        expect(p.life).toBeCloseTo(lifeBefore - 0.1);
    });

    test('returns true while alive', () => {
        const p = new Particle(0, 0);
        expect(p.update(0.01)).toBe(true);
    });

    test('returns false when expired', () => {
        const p = new Particle(0, 0);
        expect(p.update(p.life + 0.1)).toBe(false);
    });

    test('drag is frame-rate independent: same speed loss regardless of dt', () => {
        // Two particles starting at identical speed, different dt (same total time 0.1s)
        const p1 = new Particle(0, 0); p1.vx = 100; p1.vy = 0;
        const p2 = new Particle(0, 0); p2.vx = 100; p2.vy = 0;
        p1.update(0.1);           // one big step
        p2.update(0.05); p2.update(0.05); // two half-steps
        expect(p1.vx).toBeCloseTo(p2.vx, 3);
    });
});
