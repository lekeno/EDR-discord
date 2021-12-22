'use strict';
const sparkline = require('./sparkline');

module.exports = class EDRLegal {
    constructor(legalStats) {
        this.last = this._emptyMonthlyBag();
        this.clean = [];
        this.wanted = [];
        this.bounties = [];
        this.max = this._emptyMonthlyBag();
        var currentYear = new Date().getUTCFullYear();
        var currentMonth = new Date().getUTCMonth();
        var orderly = this._orderlyMonthNo();
        orderly.forEach(m => {
            if (!(m in legalStats))  {
                this.clean.push(0);
                this.wanted.push(0);
                this.bounties.push(0);
                return;
            }

            var wayTooOld = parseInt(legalStats[m]["year"]) < currentYear-1;
            var tooOld = (parseInt(legalStats[m]["year"]) == currentYear-1) && m <= currentMonth;
            if (wayTooOld || tooOld) {
                this.clean.push(0);
                this.wanted.push(0);
                this.bounties.push(0);
                return;
            }

            this.clean.push(legalStats[m]["clean"]);
            this.wanted.push(legalStats[m]["wanted"]);
            this.last[m] = legalStats[m]["last"];
            this.max[m] = legalStats[m]["max"];
            this.bounties.push(legalStats[m]["max"]["value"]);
        });
    }

    visualization() {
        return sparkline.legalgraph(this.clean, this.wanted, this.bounties);
    }

    _orderlyMonthNo() {
        var currentMonth = new Date().getUTCMonth();
        var orderly = [];
        for(var i=11; i>=0; i-=1) {
            var month = currentMonth - i;
            month = ((month%12)+12)%12;
            orderly.push(month);
        }
        return orderly;
    }
    _emptyMonthlyBag() {
        return {
            '0': undefined,
            '1': undefined,
            '2': undefined,
            '3': undefined,
            '4': undefined,
            '5': undefined,
            '6': undefined,
            '7': undefined,
            '8': undefined,
            '9': undefined,
            '10': undefined,
            '11': undefined
        };
    }
}
