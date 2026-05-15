'use strict';

const { Bullet } = require('../../src/entities/Bullet.js');

describe('Bullet constructor', () => {
    test('stores position and velocity', () => {
        const b = new Bullet(10, 20, 300, -400, 0.5);
        expect(b.x).toBe(10);
        expect(b.y).toBe(20);
        expect(b.vx).toBe(300);
        expect(b.vy).toBe(-400);
    });

    test('life and maxLife are set from argument', () => {
        const b = new Bullet(0, 0, 0, 0, 0.65);
        expect(b.life).toBe(0.65);
        expect(b.maxLife).toBe(0.65);
    });

    test('life defaults to BULLET_LIFE', () => {
        const b = new Bullet(0, 0, 0, 0);
        expect(b.life).toBe(BULLET_LIFE);
        expect(b.maxLife).toBe(BULLET_LIFE);
    });

    test('radius getter returns 3', () => {
        expect(new Bullet(0, 0, 0, 0).radius).toBe(3);
    });
});

describe('Bullet.update', () => {
    test('advances position by velocity * dt', () => {
        const b = new Bullet(100, 200, 60, -30, 1);
        b.update(0.5);
        expect(b.x).toBeCloseTo(130);
        expect(b.y).toBeCloseTo(185);
    });

    test('decrements life by dt', () => {
        const b = new Bullet(0, 0, 0, 0, 1.0);
        b.update(0.25);
        expect(b.life).toBeCloseTo(0.75);
    });

    test('returns true while life > 0', () => {
        const b = new Bullet(0, 0, 0, 0, 1.0);
        expect(b.update(0.5)).toBe(true);
    });

    test('returns false when life reaches 0', () => {
        const b = new Bullet(0, 0, 0, 0, 0.1);
        expect(b.update(0.2)).toBe(false);
    });

    test('wraps x at canvas edge', () => {
        const b = new Bullet(W - 1, 0, 600, 0, 1);
        b.update(1 / 60);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x).toBeLessThan(W);
    });
});
