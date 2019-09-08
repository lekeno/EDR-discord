'use strict';

module.exports = class Throttler {
    constructor(guilds) {
        this.attempts = 0;
        this.until = 0;
    }

    clear() {
        this.attempts = 0;
        this.until = 0;
    }

    backoff() {
        let base = 10;
        let cap = 1000 * 60 * 60 * 2;
        this.attempts += 1;
        this.until = Date.now() + Math.min(cap, base * 2 ** this.attempts)*1000 + Math.floor(Math.random()*1000);
        console.log(`Attempts ${this.attempts} -> Backing off until ${this.until}`);
        return this.until;
    }

    shouldHoldOff() {
        let hold = (new Date).getTime() < this.until;
        if (!hold) {
            this.until = 0;
        }
        return hold;
    }
}
