'use strict';

const { UfoBullet } = require('../../src/entities/UfoBullet.js');

describe('UfoBullet constructor', () => {
    test('stores position and velocity', () => {
        const b = new UfoBullet(50, 80, 200, -100);
        expect(b.x).toBe(50);
        expect(b.y).toBe(80);
        expect(b.vx).toBe(200);
        expect(b.vy).toBe(-100);
    });

    test('life and maxLife are both set to BULLET_LIFE', () => {
        const b = new UfoBullet(0, 0, 0, 0);
        expect(b.life).toBe(BULLET_LIFE);
        expect(b.maxLife).toBe(BULLET_LIFE);
    });

    test('radius getter returns 3', () => {
        expect(new UfoBullet(0, 0, 0, 0).radius).toBe(3);
    });
});

describe('UfoBullet.update', () => {
    test('advances position by velocity * dt', () => {
        const b = new UfoBullet(100, 100, 120, 60);
        b.update(0.5);
        expect(b.x).toBeCloseTo(160);
        expect(b.y).toBeCloseTo(130);
    });

    test('decrements life by dt', () => {
        const b = new UfoBullet(0, 0, 0, 0);
        b.update(0.1);
        expect(b.life).toBeCloseTo(BULLET_LIFE - 0.1);
    });

    test('returns false when expired', () => {
        const b = new UfoBullet(0, 0, 0, 0);
        expect(b.update(BULLET_LIFE + 0.1)).toBe(false);
    });
});
