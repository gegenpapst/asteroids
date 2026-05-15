'use strict';

// ─── Game ────────────────────────────────────────────────────────────────────
const STATE = Object.freeze({ START: 0, PLAYING: 1, DEAD: 2, GAMEOVER: 3, HELP: 4 });

class Game {
    constructor() {
        this.snd     = new Sound();
        this.hiScore = parseInt(localStorage.getItem('ast_hi') || '0');
        this.state   = STATE.START;

        this.score       = 0;
        this.lives       = 3;
        this.level       = 0;
        this.ship        = null;
        this.bullets     = [];
        this.asteroids   = [];
        this.particles   = [];
        this.powerups    = [];
        this.ufos        = [];
        this.ufoBullets  = [];
        this.rocks       = [];
        this.deadTimer   = 0;
        this.nextExtra   = EXTRA_LIFE_SCORE;
        this.ufoTimer    = 20;
        this.ufoHumTimer = 0;
        this.t           = 0;

        this.beatTimer    = 1.0;
        this.beatInterval = 1.0;
        this.beatPhase    = 0;

        this._rockCanvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
    }

    start() {
        this.score       = 0;
        this.lives       = 3;
        this.level       = 0;
        this.bullets     = [];
        this.asteroids   = [];
        this.particles   = [];
        this.powerups    = [];
        this.ufos        = [];
        this.ufoBullets  = [];
        this.rocks       = Array.from({ length: randInt(1, 5) }, () => new Rock(rand(60, W - 60), rand(60, H - 60)));
        this.ship        = new Ship();
        [this.ship.x, this.ship.y] = this._safeShipPos();
        this.deadTimer   = 0;
        this.nextExtra   = EXTRA_LIFE_SCORE;
        this.ufoTimer    = 20;
        this.ufoHumTimer = 0;
        this.beatTimer   = 1.0;
        this.beatPhase   = 0;
        this._nextLevel();
        this.state = STATE.PLAYING;
    }

    update(dt) {
        dt = Math.min(dt, 1 / 20);
        this.t += dt;

        if (this.state === STATE.START || this.state === STATE.GAMEOVER) {
            if (Input.start()) this.start();
            Input.flush();
            return;
        }

        if (this.state === STATE.HELP) {
            if (Input.help() || Input.wasPressed('Escape')) this.state = STATE.PLAYING;
            Input.flush();
            return;
        }

        if (this.state === STATE.PLAYING && Input.help()) {
            this.state = STATE.HELP;
            Input.flush();
            return;
        }

        // Beat throb
        this.beatTimer -= dt;
        if (this.beatTimer <= 0) {
            this.beatInterval = clamp(1.0 - this.asteroids.length * 0.045, 0.12, 1.0);
            this.beatTimer     = this.beatInterval;
            this.beatPhase    ^= 1;
            this.snd.throb(this.beatPhase);
        }

        // UFO hum
        if (this.ufos.length > 0) {
            this.ufoHumTimer -= dt;
            if (this.ufoHumTimer <= 0) {
                this.snd.ufoHum();
                this.ufoHumTimer = 0.3;
            }
        }

        // Update universally (all non-START states)
        this.particles  = this.particles.filter(p => p.update(dt));
        this.powerups   = this.powerups.filter(p => p.update(dt));
        this.ufoBullets = this.ufoBullets.filter(b => b.update(dt));

        if (this.state === STATE.DEAD) {
            this.deadTimer -= dt;
            this.asteroids.forEach(a => a.update(dt));
            this._bounceAsteroidsOffRocks();
            this.ufos = this.ufos.filter(u => u.update(dt, null));
            if (this.deadTimer <= 0) {
                if (this.lives > 0) {
                    this.ship = new Ship();
                    [this.ship.x, this.ship.y] = this._safeShipPos();
                    this.state = STATE.PLAYING;
                } else {
                    this.state = STATE.GAMEOVER;
                }
            }
            Input.flush();
            return;
        }

        // ── PLAYING ──

        this.ship.update(dt);

        // Thrust trail particles
        if (this.ship.thrusting) {
            for (let i = 0; i < 2; i++) {
                const ex = this.ship.x - Math.cos(this.ship.angle) * SHIP_SIZE * 0.35;
                const ey = this.ship.y - Math.sin(this.ship.angle) * SHIP_SIZE * 0.35;
                const p  = new Particle(ex, ey, `hsl(${rand(20, 50)},100%,60%)`);
                p.vx      = -Math.cos(this.ship.angle) * rand(40, 100) + rand(-25, 25);
                p.vy      = -Math.sin(this.ship.angle) * rand(40, 100) + rand(-25, 25);
                p.life    = rand(0.1, 0.28);
                p.maxLife = p.life;
                p.size    = rand(0.8, 2.0);
                this.particles.push(p);
            }
        }

        if (Input.teleport() && this.ship.invulnerable <= 0) {
            this.ship.teleport(rand(50, W - 50), rand(50, H - 50));
            this.snd.powerUp('shield');
        }

        if (this.bullets.length < MAX_BULLETS && this.ship.canFire()) {
            this.bullets.push(...this.ship.fire());
            this.snd.shoot();
        }

        this.bullets   = this.bullets.filter(b => b.update(dt));
        this.asteroids.forEach(a => a.update(dt));
        this._bounceAsteroidsOffRocks();

        // UFO spawn
        this.ufoTimer -= dt;
        if (this.ufoTimer <= 0) {
            const size = (this.score >= 5000 && Math.random() < 0.4) ? 1 : 0;
            this.ufos.push(new Ufo(size, b => this.ufoBullets.push(b)));
            this.ufoTimer = 25 + rand(0, 15);
        }
        this.ufos = this.ufos.filter(u => u.update(dt, this.ship));

        // Bullet × Asteroid
        outer:
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                if (dist(b, a) < a.radius + b.radius) {
                    this._addScore(a.score);
                    this._boom(a.x, a.y, a.size);
                    if (Math.random() < POWERUP_SPAWN_CHANCE)
                        this.powerups.push(new PowerUp(a.x, a.y, POWERUP_TYPES[randInt(0, 2)]));
                    this.asteroids.splice(ai, 1, ...a.split());
                    this.bullets.splice(bi, 1);
                    continue outer;
                }
            }
        }

        // Bullet × UFO
        outerUfo:
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ui = this.ufos.length - 1; ui >= 0; ui--) {
                const u = this.ufos[ui];
                if (dist(b, u) < u.radius + b.radius) {
                    this._addScore(u.score);
                    this._boom(u.x, u.y, 1);
                    this.ufos.splice(ui, 1);
                    this.bullets.splice(bi, 1);
                    continue outerUfo;
                }
            }
        }

        // Bullet × Rock
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (this.rocks.some(r => dist(b, r) < r.radius + b.radius)) {
                this.bullets.splice(bi, 1);
            }
        }

        // Ship × Asteroid
        if (this.ship.invulnerable <= 0) {
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                if (dist(this.ship, a) < a.radius + this.ship.radius) {
                    if (this.ship.shieldTimer > 0) {
                        this.ship.shieldTimer = 0;
                        this._boom(a.x, a.y, a.size);
                        this.asteroids.splice(ai, 1, ...a.split());
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // Ship × Rock
        if (this.ship && this.ship.invulnerable <= 0) {
            for (const r of this.rocks) {
                if (dist(this.ship, r) < r.radius + this.ship.radius) {
                    if (this.ship.shieldTimer > 0) {
                        this.ship.shieldTimer = 0;
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // Ship × UFO
        if (this.ship && this.ship.invulnerable <= 0) {
            for (const u of this.ufos) {
                if (dist(this.ship, u) < u.radius + this.ship.radius) {
                    if (this.ship.shieldTimer > 0) {
                        this.ship.shieldTimer = 0;
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // UFO bullet × ship
        if (this.ship && this.ship.invulnerable <= 0) {
            for (let bi = this.ufoBullets.length - 1; bi >= 0; bi--) {
                const b = this.ufoBullets[bi];
                if (dist(b, this.ship) < b.radius + this.ship.radius) {
                    if (this.ship.shieldTimer > 0) {
                        this.ship.shieldTimer = 0;
                        this.ufoBullets.splice(bi, 1);
                    } else {
                        this._killShip();
                    }
                    break;
                }
            }
        }

        // Ship × PowerUp
        if (this.ship) {
            for (let pi = this.powerups.length - 1; pi >= 0; pi--) {
                const pu = this.powerups[pi];
                if (dist(this.ship, pu) < this.ship.radius + pu.radius) {
                    if (pu.type === 'shield')     this.ship.shieldTimer = POWERUP_DURATION;
                    else if (pu.type === 'rapid') this.ship.rapidTimer  = POWERUP_DURATION;
                    else                          this.ship.spreadTimer = POWERUP_DURATION;
                    this.snd.powerUp(pu.type);
                    this.powerups.splice(pi, 1);
                }
            }
        }

        // Level clear (UFOs persist between levels)
        if (this.asteroids.length === 0) {
            this.snd.levelUp();
            this._nextLevel();
            if (this.ship) this.ship.invulnerable = INVULNERABLE_TIME;
        }

        Input.flush();
    }

    draw() {
        ctx.drawImage(bgCanvas, 0, 0);

        // Twinkling stars
        ctx.shadowBlur = 0;
        for (const s of STARS) {
            const alpha = s.a * (0.55 + 0.45 * Math.sin(this.t * 1.4 + s.phase));
            ctx.globalAlpha = alpha;
            ctx.fillStyle   = '#fff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, TAU);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (this.state === STATE.START) { this._drawStart(); return; }
        if (this.state === STATE.HELP)  { this._drawHelp();  return; }

        this._drawRocks();
        this.asteroids.forEach(a => a.draw());
        this.powerups.forEach(p => p.draw());
        this.ufos.forEach(u => u.draw());
        this.ufoBullets.forEach(b => b.draw());
        this.bullets.forEach(b => b.draw());
        this.particles.forEach(p => p.draw());
        if (this.ship) this.ship.draw();

        this._drawHUD();

        if (this.state === STATE.GAMEOVER) this._drawGameOver();
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    _safeShipPos() {
        const margin = 60;
        let x, y, tries = 0;
        do {
            x = rand(60, W - 60);
            y = rand(60, H - 60);
            tries++;
        } while (tries < 200 && this.rocks.some(r => dist({ x, y }, r) < r.radius + margin));
        return [x, y];
    }

    _bounceAsteroidsOffRocks() {
        for (const a of this.asteroids) {
            for (const r of this.rocks) {
                const dx      = a.x - r.x;
                const dy      = a.y - r.y;
                const d       = Math.sqrt(dx * dx + dy * dy) || 1;
                const overlap = a.radius + r.radius - d;
                if (overlap <= 0) continue;

                const nx  = dx / d, ny = dy / d;
                const dot = a.vx * nx + a.vy * ny;
                if (dot >= 0) continue;             // already moving away

                a.vx -= 2 * dot * nx;
                a.vy -= 2 * dot * ny;
                a.x   = wrap(a.x + nx * (overlap + 0.5), W);
                a.y   = wrap(a.y + ny * (overlap + 0.5), H);
            }
        }
    }

    _nextLevel() {
        this.level++;
        const count = Math.min(INITIAL_ROCKS + this.level - 1, MAX_ROCKS_PER_LEVEL);
        const cx = W / 2, cy = H / 2;
        for (let i = 0; i < count; i++) {
            let x, y;
            do {
                x = rand(0, W);
                y = rand(0, H);
            } while (dist({ x, y }, { x: cx, y: cy }) < W * 0.22);
            this.asteroids.push(new Asteroid(x, y, 0));
        }
    }

    _addScore(pts) {
        this.score += pts;
        if (this.score > this.hiScore) {
            this.hiScore = this.score;
            localStorage.setItem('ast_hi', this.hiScore);
        }
        if (this.score >= this.nextExtra) {
            this.lives++;
            this.nextExtra += EXTRA_LIFE_SCORE;
            this.snd.extraLife();
        }
    }

    _boom(x, y, size) {
        const counts = [16, 10, 6];
        for (let i = 0; i < counts[size]; i++)
            this.particles.push(new Particle(x, y));
        [
            () => this.snd.explodeLarge(),
            () => this.snd.explodeMed(),
            () => this.snd.explodeSmall(),
        ][size]();
    }

    _killShip() {
        for (let i = 0; i < 22; i++)
            this.particles.push(new Particle(this.ship.x, this.ship.y, '#8ef'));
        this.snd.shipDie();
        this.lives--;
        this.ship       = null;
        this.state      = STATE.DEAD;
        this.deadTimer  = 2.2;
        this.bullets    = [];
        this.ufoBullets = [];
    }

    // ── Draw helpers ────────────────────────────────────────────────────────

    _drawRocks() {
        if (!this.rocks.length) return;

        const off    = this._rockCanvas;
        const offCtx = off.getContext('2d');
        offCtx.clearRect(0, 0, W, H);

        const buildPath = (rock, tctx) => {
            const cos = Math.cos(rock.rot), sin = Math.sin(rock.rot);
            tctx.beginPath();
            rock.verts.forEach(({ a, r }, i) => {
                const lx = Math.cos(a) * r, ly = Math.sin(a) * r;
                const wx = rock.x + cos * lx - sin * ly;
                const wy = rock.y + sin * lx + cos * ly;
                i === 0 ? tctx.moveTo(wx, wy) : tctx.lineTo(wx, wy);
            });
            tctx.closePath();
        };

        // Pass 1: stroke with glow — visible only where not covered by fill
        offCtx.strokeStyle = '#7a5c3a';
        offCtx.lineWidth   = 2.5;
        offCtx.shadowColor = '#4a3820';
        offCtx.shadowBlur  = 10;
        for (const rock of this.rocks) { buildPath(rock, offCtx); offCtx.stroke(); }
        offCtx.shadowBlur  = 0;

        // Pass 2: opaque fill erases internal strokes at overlaps
        offCtx.fillStyle = 'rgb(72, 54, 36)';
        for (const rock of this.rocks) { buildPath(rock, offCtx); offCtx.fill(); }

        ctx.globalAlpha = 0.45;
        ctx.drawImage(off, 0, 0);
        ctx.globalAlpha = 1;
    }

    _drawHUD() {
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = '#ccc';
        ctx.font        = '18px monospace';
        ctx.textAlign   = 'left';
        ctx.fillText(String(this.score).padStart(6, '0'), 16, 28);
        ctx.textAlign   = 'right';
        ctx.fillText(`HI ${String(this.hiScore).padStart(6, '0')}`, W - 16, 28);
        ctx.textAlign   = 'center';
        ctx.fillText(`LVL ${this.level}`, W / 2, 28);

        // Life icons
        for (let i = 0; i < this.lives; i++) {
            ctx.save();
            ctx.translate(14 + i * 21, H - 16);
            ctx.rotate(-Math.PI / 2);
            ctx.beginPath();
            const s = 7;
            ctx.moveTo( s,           0);
            ctx.lineTo(-s * 0.65,   -s * 0.5);
            ctx.lineTo(-s * 0.35,    0);
            ctx.lineTo(-s * 0.65,    s * 0.5);
            ctx.closePath();
            ctx.strokeStyle = '#8cf';
            ctx.lineWidth   = 1.2;
            ctx.stroke();
            ctx.restore();
        }

        // Power-up status bars (bottom-right)
        if (this.ship) {
            const indicators = [];
            if (this.ship.shieldTimer  > 0) indicators.push({ label: 'SH', t: this.ship.shieldTimer,  col: '#4cf' });
            if (this.ship.rapidTimer   > 0) indicators.push({ label: 'RF', t: this.ship.rapidTimer,   col: '#f84' });
            if (this.ship.spreadTimer  > 0) indicators.push({ label: 'SP', t: this.ship.spreadTimer,  col: '#ff4' });

            ctx.font      = '13px monospace';
            ctx.textAlign = 'left';
            const barW = 48, barH = 16, gap = 6;
            indicators.forEach((ind, i) => {
                const bx  = W - 16 - (indicators.length - i) * (barW + gap);
                const by  = H - 52;
                const pct = ind.t / POWERUP_DURATION;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(bx, by, barW, barH);
                ctx.globalAlpha = 0.8;
                ctx.fillStyle   = ind.col;
                ctx.fillRect(bx, by, barW * pct, barH);
                ctx.globalAlpha = 1;
                ctx.fillStyle   = '#fff';
                ctx.fillText(ind.label, bx + 8, by + barH - 4);
            });
        }
    }

    _drawStart() {
        const cx = W / 2, cy = H / 2;
        ctx.textAlign   = 'center';
        ctx.shadowColor = '#4af';
        ctx.shadowBlur  = 30;
        ctx.fillStyle   = '#fff';
        ctx.font        = 'bold 72px monospace';
        ctx.fillText('ASTEROIDS', cx, cy - 90);

        ctx.shadowBlur  = 0;
        ctx.fillStyle   = '#888';
        ctx.font        = '18px monospace';
        ctx.fillText('ARROWS / WASD  —  rotate & thrust', cx, cy + 10);
        ctx.fillText('SPACE / Z  —  fire', cx, cy + 42);

        if (this.hiScore > 0) {
            ctx.fillStyle = '#fc0';
            ctx.font      = '16px monospace';
            ctx.fillText(`HI-SCORE  ${this.hiScore}`, cx, cy + 88);
        }

        if (Math.floor(Date.now() / 520) % 2) {
            ctx.fillStyle = '#fff';
            ctx.font      = '22px monospace';
            ctx.fillText('PRESS ENTER OR SPACE TO START', cx, cy + 140);
        }
    }

    _drawHelp() {
        const cx = W / 2, cy = H / 2;

        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(0, 0, W, H);

        ctx.textAlign   = 'center';
        ctx.shadowColor = '#4af';
        ctx.shadowBlur  = 24;
        ctx.fillStyle   = '#fff';
        ctx.font        = 'bold 36px monospace';
        ctx.fillText('HILFE', cx, cy - 200);
        ctx.shadowBlur = 0;

        const _lm  = new Date(document.lastModified);
        const _pad = n => String(n).padStart(2, '0');
        ctx.fillStyle = '#555';
        ctx.font      = '12px monospace';
        ctx.fillText(
            `Stand: ${_pad(_lm.getDate())}.${_pad(_lm.getMonth()+1)}.${_lm.getFullYear()}  ${_pad(_lm.getHours())}:${_pad(_lm.getMinutes())} Uhr`,
            cx, cy - 178
        );

        const sections = [
            { head: 'STEUERUNG', rows: [
                ['Pfeiltasten / WASD', 'Drehen & Schub'],
                ['Space / Z',          'Schießen'],
                ['Enter / Space',      'Starten / Neustart'],
                ['H / ESC',            'Hilfe ein/aus'],
                ['S / Pfeil-unten',    'Teleportieren'],
            ]},
            { head: 'POWER-UPS', rows: [
                ['SH — Shield',  'Absorbiert einen Treffer'],
                ['RF — Rapid',   'Schnellfeuer'],
                ['SP — Spread',  'Dreifachschuss (5 s)'],
            ]},
            { head: 'PUNKTE', rows: [
                ['Großer Asteroid',   '20'],
                ['Mittlerer Asteroid','50'],
                ['Kleiner Asteroid',  '100'],
                ['Großes UFO',        '200'],
                ['Kleines UFO',       '1 000'],
                ['Extra-Leben',       'alle 10 000 Pkt.'],
            ]},
        ];

        let y = cy - 148;
        ctx.font = '13px monospace';

        for (const sec of sections) {
            ctx.fillStyle   = '#4af';
            ctx.font        = 'bold 14px monospace';
            ctx.textAlign   = 'center';
            ctx.fillText(sec.head, cx, y);
            y += 22;

            ctx.font      = '13px monospace';
            ctx.fillStyle = '#ccc';
            for (const [left, right] of sec.rows) {
                ctx.textAlign = 'right';
                ctx.fillText(left, cx - 12, y);
                ctx.fillStyle = '#888';
                ctx.fillText('—', cx, y);
                ctx.fillStyle = '#ccc';
                ctx.textAlign = 'left';
                ctx.fillText(right, cx + 12, y);
                y += 19;
            }
            y += 10;
        }

        if (Math.floor(Date.now() / 520) % 2) {
            ctx.fillStyle = '#666';
            ctx.font      = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('H oder ESC — Zurück zum Spiel', cx, cy + 222);
        }
    }

    _drawGameOver() {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);

        const cx = W / 2, cy = H / 2;
        ctx.textAlign   = 'center';
        ctx.shadowColor = '#f33';
        ctx.shadowBlur  = 28;
        ctx.fillStyle   = '#f55';
        ctx.font        = 'bold 64px monospace';
        ctx.fillText('GAME OVER', cx, cy - 55);

        ctx.shadowBlur = 0;
        ctx.fillStyle  = '#ccc';
        ctx.font       = '26px monospace';
        ctx.fillText(`SCORE  ${this.score}`, cx, cy + 15);

        if (this.score > 0 && this.score >= this.hiScore) {
            ctx.fillStyle = '#fc0';
            ctx.font      = '20px monospace';
            ctx.fillText('NEW HIGH SCORE!', cx, cy + 52);
        }

        if (Math.floor(Date.now() / 520) % 2) {
            ctx.fillStyle = '#aaa';
            ctx.font      = '18px monospace';
            ctx.fillText('PRESS ENTER OR SPACE TO PLAY AGAIN', cx, cy + 115);
        }
    }
}

