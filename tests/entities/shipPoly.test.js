'use strict';

const { Bullet }  = require('../../src/entities/Bullet.js');
global.Bullet     = Bullet;   // ShipPoly.fire() references Bullet as a global
const { ShipBase } = require('../../src/entities/ShipBase.js');
global.ShipBase    = ShipBase;
const { ShipPoly } = require('../../src/entities/ShipPoly.js');

afterEach(() => jest.restoreAllMocks());

describe('ShipPoly constructor', () => {
    test('spawns at screen centre', () => {
        const s = new ShipPoly();
        expect(s.x).toBe(W / 2);
        expect(s.y).toBe(H / 2);
    });

    test('starts with zero velocity', () => {
        const s = new ShipPoly();
        expect(s.vx).toBe(0);
        expect(s.vy).toBe(0);
    });

    test('starts invulnerable', () => {
        const s = new ShipPoly();
        expect(s.invulnerable).toBeGreaterThan(0);
    });

    test('radius is positive', () => {
        expect(new ShipPoly().radius).toBeGreaterThan(0);
    });
});

describe('ShipPoly.canFire', () => {
    test('returns false while fireTimer > 0', () => {
        jest.spyOn(Input, 'fire').mockReturnValue(true);
        const s = new ShipPoly();
        s.fireTimer = 0.5;
        expect(s.canFire()).toBe(false);
    });

    test('returns true when fireTimer is 0 and fire is held', () => {
        jest.spyOn(Input, 'fire').mockReturnValue(true);
        const s = new ShipPoly();
        s.fireTimer = 0;
        expect(s.canFire()).toBe(true);
    });

    test('returns false when fire key is not held', () => {
        jest.spyOn(Input, 'fire').mockReturnValue(false);
        const s = new ShipPoly();
        s.fireTimer = 0;
        expect(s.canFire()).toBe(false);
    });
});

describe('ShipPoly.fire', () => {
    test('returns an array of Bullet instances', () => {
        const s = new ShipPoly();
        const bullets = s.fire();
        expect(bullets.length).toBeGreaterThan(0);
        for (const b of bullets) expect(b).toBeInstanceOf(Bullet);
    });

    test('sets fireTimer after firing', () => {
        const s = new ShipPoly();
        s.fireTimer = 0;
        s.fire();
        expect(s.fireTimer).toBeGreaterThan(0);
    });

    test('fires 1 bullet normally', () => {
        const s = new ShipPoly();
        s.spreadTimer = 0;
        expect(s.fire()).toHaveLength(1);
    });

    test('fires 3 bullets with spread power-up active', () => {
        const s = new ShipPoly();
        s.spreadTimer = 5;
        expect(s.fire()).toHaveLength(3);
    });

    test('halves fireTimer with rapid power-up active', () => {
        const s = new ShipPoly();
        s.rapidTimer  = 5;
        s.spreadTimer = 0;
        s.fire();
        expect(s.fireTimer).toBeCloseTo(FIRE_RATE / 2);
    });

    test('bullet speed equals BULLET_SPEED plus ship velocity', () => {
        const s = new ShipPoly();
        s.vx = 0; s.vy = 0;
        s.angle = 0; // pointing right
        const [b] = s.fire();
        expect(b.vx).toBeCloseTo(BULLET_SPEED);
        expect(b.vy).toBeCloseTo(0, 1);
    });
});

describe('ShipPoly strafe (lateral acceleration model)', () => {
    afterEach(() => jest.restoreAllMocks());

    test('forward velocity is preserved (not capped/scaled down)', () => {
        jest.spyOn(Input, 'strafeLeft').mockReturnValue(true);
        const s = new ShipPoly();
        s.angle = 0;             // facing right (+x)
        s.vx = 200; s.vy = 0;
        s.update(0.016);
        const friction = Math.pow(SHIP_FRICTION, 0.016 * 60);
        const expectedFwd = 200 * friction;
        // forward component along ship angle
        const fwd = s.vx * Math.cos(s.angle) + s.vy * Math.sin(s.angle);
        expect(fwd).toBeCloseTo(expectedFwd, 0);
    });

    test('lateral builds up gradually (not instant set to full strafe speed)', () => {
        jest.spyOn(Input, 'strafeLeft').mockReturnValue(true);
        const s = new ShipPoly();
        s.angle = 0;
        s.vx = 200; s.vy = 0;
        s.update(0.016);
        // After 1 frame at SHIP_STRAFE_ACCEL=500, lateral magnitude ≈ 500 * 0.016 = 8
        // (friction-reduced, so a bit less)
        const lat = -s.vx * Math.sin(s.angle) + s.vy * Math.cos(s.angle);
        expect(Math.abs(lat)).toBeGreaterThan(0);
        expect(Math.abs(lat)).toBeLessThan(SHIP_STRAFE_SPEED / 2);  // far from instant
    });

    test('strafe from rest does not accelerate (lateral capped to forward magnitude = 0)', () => {
        jest.spyOn(Input, 'strafeLeft').mockReturnValue(true);
        const s = new ShipPoly();
        s.vx = 0; s.vy = 0;
        s.update(0.016);
        expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(0, 5);
    });

    test('lateral never exceeds forward magnitude', () => {
        jest.spyOn(Input, 'strafeLeft').mockReturnValue(true);
        const s = new ShipPoly();
        s.angle = 0;
        s.vx = 30; s.vy = 0;
        // Run many frames - lateral should saturate at |fwd|, not at SHIP_STRAFE_SPEED
        for (let i = 0; i < 100; i++) s.update(0.016);
        const fwd = s.vx * Math.cos(s.angle) + s.vy * Math.sin(s.angle);
        const lat = -s.vx * Math.sin(s.angle) + s.vy * Math.cos(s.angle);
        expect(Math.abs(lat)).toBeLessThanOrEqual(Math.abs(fwd) + 0.01);
    });

    test('lateral saturates at SHIP_STRAFE_SPEED when forward is large', () => {
        jest.spyOn(Input, 'strafeLeft').mockReturnValue(true);
        const s = new ShipPoly();
        s.angle = 0;
        s.vx = 400; s.vy = 0;
        for (let i = 0; i < 100; i++) s.update(0.016);
        const lat = -s.vx * Math.sin(s.angle) + s.vy * Math.cos(s.angle);
        expect(Math.abs(lat)).toBeLessThanOrEqual(SHIP_STRAFE_SPEED + 0.01);
    });
});

describe('ShipPoly.teleport', () => {
    test('sets position to given coordinates', () => {
        const s = new ShipPoly();
        s.invulnerable = 0;
        s.teleport(123, 456);
        expect(s.x).toBe(123);
        expect(s.y).toBe(456);
    });

    test('preserves velocity after teleport', () => {
        const s = new ShipPoly();
        s.invulnerable = 0;
        s.vx = 42;
        s.vy = -17;
        s.teleport(0, 0);
        expect(s.vx).toBe(42);
        expect(s.vy).toBe(-17);
    });

    test('sets invulnerable to 1.5 s', () => {
        const s = new ShipPoly();
        s.invulnerable = 0;
        s.teleport(100, 100);
        expect(s.invulnerable).toBe(1.5);
    });
});
