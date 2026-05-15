'use strict';

const { Ship } = require('../../src/entities/Ship.js');

afterEach(() => jest.restoreAllMocks());

describe('Ship constructor', () => {
    test('spawns at screen centre', () => {
        const s = new Ship();
        expect(s.x).toBe(W / 2);
        expect(s.y).toBe(H / 2);
    });

    test('starts with zero velocity', () => {
        const s = new Ship();
        expect(s.vx).toBe(0);
        expect(s.vy).toBe(0);
    });

    test('starts invulnerable', () => {
        const s = new Ship();
        expect(s.invulnerable).toBeGreaterThan(0);
    });

    test('radius is positive', () => {
        expect(new Ship().radius).toBeGreaterThan(0);
    });
});

describe('Ship.teleport', () => {
    test('sets position to given coordinates', () => {
        const s = new Ship();
        s.invulnerable = 0;
        s.teleport(123, 456);
        expect(s.x).toBe(123);
        expect(s.y).toBe(456);
    });

    test('preserves velocity after teleport', () => {
        const s = new Ship();
        s.invulnerable = 0;
        s.vx = 42;
        s.vy = -17;
        s.teleport(0, 0);
        expect(s.vx).toBe(42);
        expect(s.vy).toBe(-17);
    });

    test('sets invulnerable to 1.5 s', () => {
        const s = new Ship();
        s.invulnerable = 0;
        s.teleport(100, 100);
        expect(s.invulnerable).toBe(1.5);
    });
});
