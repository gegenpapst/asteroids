'use strict';

const { Bullet }  = require('../../src/entities/Bullet.js');
global.Bullet     = Bullet;   // Ship.fire() references Bullet as a global
const { Ship }    = require('../../src/entities/Ship.js');

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

describe('Ship.canFire', () => {
    test('returns false while fireTimer > 0', () => {
        jest.spyOn(Input, 'fire').mockReturnValue(true);
        const s = new Ship();
        s.fireTimer = 0.5;
        expect(s.canFire()).toBe(false);
    });

    test('returns true when fireTimer is 0 and fire is held', () => {
        jest.spyOn(Input, 'fire').mockReturnValue(true);
        const s = new Ship();
        s.fireTimer = 0;
        expect(s.canFire()).toBe(true);
    });

    test('returns false when fire key is not held', () => {
        jest.spyOn(Input, 'fire').mockReturnValue(false);
        const s = new Ship();
        s.fireTimer = 0;
        expect(s.canFire()).toBe(false);
    });
});

describe('Ship.fire', () => {
    test('returns an array of Bullet instances', () => {
        const s = new Ship();
        const bullets = s.fire();
        expect(bullets.length).toBeGreaterThan(0);
        for (const b of bullets) expect(b).toBeInstanceOf(Bullet);
    });

    test('sets fireTimer after firing', () => {
        const s = new Ship();
        s.fireTimer = 0;
        s.fire();
        expect(s.fireTimer).toBeGreaterThan(0);
    });

    test('fires 1 bullet normally', () => {
        const s = new Ship();
        s.spreadTimer = 0;
        expect(s.fire()).toHaveLength(1);
    });

    test('fires 3 bullets with spread power-up active', () => {
        const s = new Ship();
        s.spreadTimer = 5;
        expect(s.fire()).toHaveLength(3);
    });

    test('halves fireTimer with rapid power-up active', () => {
        const s = new Ship();
        s.rapidTimer  = 5;
        s.spreadTimer = 0;
        s.fire();
        expect(s.fireTimer).toBeCloseTo(FIRE_RATE / 2);
    });

    test('bullet speed equals BULLET_SPEED plus ship velocity', () => {
        const s = new Ship();
        s.vx = 0; s.vy = 0;
        s.angle = 0; // pointing right
        const [b] = s.fire();
        expect(b.vx).toBeCloseTo(BULLET_SPEED);
        expect(b.vy).toBeCloseTo(0, 1);
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
