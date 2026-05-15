'use strict';

class Sound {
    constructor() {
        try {
            this.ac = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.ac = null;
        }
        this._ufoPhase = false;
    }

    _tone(freq, endFreq, dur, type = 'square', vol = 0.2) {
        if (!this.ac) return;
        try {
            if (this.ac.state === 'suspended') this.ac.resume();
            const now = this.ac.currentTime;
            const osc = this.ac.createOscillator();
            const g   = this.ac.createGain();
            osc.connect(g);
            g.connect(this.ac.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (endFreq !== freq)
                osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
            g.gain.setValueAtTime(vol, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + dur);
            osc.start(now);
            osc.stop(now + dur);
        } catch (e) { /* audio not critical */ }
    }

    shoot()        { this._tone(820, 180, 0.11, 'square',   0.1);  }
    explodeLarge() { this._tone(110,  35, 0.5,  'sawtooth', 0.28); }
    explodeMed()   { this._tone(170,  60, 0.3,  'sawtooth', 0.22); }
    explodeSmall() { this._tone(240, 110, 0.15, 'sawtooth', 0.17); }
    shipDie()      { this._tone(190,  28, 0.85, 'sawtooth', 0.32); }

    throb(phase) {
        this._tone(phase ? 112 : 98, phase ? 112 : 98, 0.05, 'sine', 0.1);
    }

    extraLife() {
        [523, 659, 784, 1047].forEach((f, i) =>
            setTimeout(() => this._tone(f, f, 0.16, 'sine', 0.18), i * 115)
        );
    }

    levelUp() {
        [392, 523, 659, 784, 1047].forEach((f, i) =>
            setTimeout(() => this._tone(f, f * 1.08, 0.18, 'sine', 0.17), i * 100)
        );
    }

    powerUp(type) {
        if (type === 'shield') {
            this._tone(440, 880, 0.2, 'sine', 0.15);
        } else if (type === 'rapid') {
            this._tone(660, 990, 0.09, 'square', 0.12);
            setTimeout(() => this._tone(880, 1100, 0.09, 'square', 0.12), 100);
        } else {
            this._tone(520, 780, 0.15, 'triangle', 0.13);
        }
    }

    ufoHum() {
        const f = this._ufoPhase ? 80 : 100;
        this._ufoPhase = !this._ufoPhase;
        this._tone(f, f, 0.12, 'sine', 0.05);
    }
}
