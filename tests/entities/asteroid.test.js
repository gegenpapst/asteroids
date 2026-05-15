'use strict';

const { Asteroid } = require('../../src/entities/Asteroid.js');

afterEach(() => jest.restoreAllMocks());

describe('Asteroid constructor', () => {
    test('radius matches ASTEROID_RADIUS[size] for each size', () => {
        expect(new Asteroid(0, 0, 0).radius).toBe(ASTEROID_RADIUS[0]);
        expect(new Asteroid(0, 0, 1).radius).toBe(ASTEROID_RADIUS[1]);
        expect(new Asteroid(0, 0, 2).radius).toBe(ASTEROID_RADIUS[2]);
    });

    test('score matches ASTEROID_SCORE[size] for each size', () => {
        expect(new Asteroid(0, 0, 0).score).toBe(ASTEROID_SCORE[0]);
        expect(new Asteroid(0, 0, 1).score).toBe(ASTEROID_SCORE[1]);
        expect(new Asteroid(0, 0, 2).score).toBe(ASTEROID_SCORE[2]);
    });

    test('position is set from constructor arguments', () => {
        const a = new Asteroid(200, 300, 0);
        expect(a.x).toBe(200);
        expect(a.y).toBe(300);
    });

    test('vertices count is between 7 and 13', () => {
        const a = new Asteroid(0, 0, 0);
        expect(a.verts.length).toBeGreaterThanOrEqual(7);
        expect(a.verts.length).toBeLessThanOrEqual(13);
    });

    test('each vertex has angle and radius fields', () => {
        const a = new Asteroid(0, 0, 0);
        for (const v of a.verts) {
            expect(typeof v.a).toBe('number');
            expect(typeof v.r).toBe('number');
        }
    });

    test('explicit angle sets movement direction', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const a = new Asteroid(0, 0, 0, 0);
        expect(a.vy).toBeCloseTo(0, 5);
        expect(a.vx).toBeGreaterThan(0);
    });
});

describe('Asteroid body', () => {
    test('creates a Matter body at constructor position', () => {
        const a = new Asteroid(150, 250, 0);
        expect(a.body).toBeDefined();
        expect(a.body.position.x).toBe(150);
        expect(a.body.position.y).toBe(250);
    });

    test('body velocity is set to initial vx and vy', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const a = new Asteroid(0, 0, 0, 0);
        expect(a.body.velocity.x).toBeCloseTo(a.vx);
        expect(a.body.velocity.y).toBeCloseTo(a.vy);
    });
});

describe('Asteroid.update', () => {
    test('rotation advances by rotSpeed * dt', () => {
        const a = new Asteroid(0, 0, 0);
        const rotBefore = a.rot;
        const expected = rotBefore + a.rotSpeed * 0.016;
        a.update(0.016);
        expect(a.rot).toBeCloseTo(expected);
    });
});

describe('Asteroid.split', () => {
    test.each([[0, 1], [1, 2]])('size %i splits into 2 asteroids of size %i', (parent, child) => {
        const children = new Asteroid(100, 100, parent).split();
        expect(children).toHaveLength(2);
        expect(children[0].size).toBe(child);
        expect(children[1].size).toBe(child);
    });

    test('size 2 does not split', () => {
        expect(new Asteroid(100, 100, 2).split()).toHaveLength(0);
    });

    test('children spawn at parent position', () => {
        const [c1, c2] = new Asteroid(200, 300, 0).split();
        expect(c1.x).toBe(200);
        expect(c1.y).toBe(300);
        expect(c2.x).toBe(200);
        expect(c2.y).toBe(300);
    });

    test('children are valid Asteroid instances', () => {
        for (const c of new Asteroid(0, 0, 0).split()) {
            expect(c).toBeInstanceOf(Asteroid);
        }
    });
});
