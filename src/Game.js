'use strict';

// ─── Game ────────────────────────────────────────────────────────────────────
const STATE = Object.freeze({ START: 0, PLAYING: 1, DEAD: 2, GAMEOVER: 3 });

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
        this.deadTimer   = 0;
        this.nextExtra   = EXTRA_LIFE_SCORE;
        this.ufoTimer    = 20;
        this.ufoHumTimer = 0;
        this.t           = 0;

        this.beatTimer    = 1.0;
        this.beatInterval = 1.0;
        this.beatPhase    = 0;
    }

    start() {
        this.score       = 0;
        this.lives       = 3;
        this.level       = 0;
        this.ship        = new Ship();
        this.bullets     = [];
        this.asteroids   = [];
        this.particles   = [];
        this.powerups    = [];
        this.ufos        = [];
        this.ufoBullets  = [];
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
            this.ufos = this.ufos.filter(u => u.update(dt, null));
            if (this.deadTimer <= 0) {
                if (this.lives > 0) {
                    this.ship  = new Ship();
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

        if (this.bullets.length < MAX_BULLETS && this.ship.canFire()) {
            this.bullets.push(...this.ship.fire());
            this.snd.shoot();
        }

        this.bullets   = this.bullets.filter(b => b.update(dt));
        this.asteroids.forEach(a => a.update(dt));

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

