'use strict';
const sparkline = require('./sparkline');

module.exports = class EDRPresence {
    constructor(presenceStats) {
        this.topShips = [];
        this.totalShips = 0;
        var currentYear = new Date().getUTCFullYear();
        var currentMonth = new Date().getUTCMonth();
        var orderly = this._orderlyMonthNo();
        var ships = {};

        orderly.forEach(m => {
            if (!(m in presenceStats))  {
                return;
            }

            var wayTooOld = parseInt(presenceStats[m]["year"]) < currentYear-1;
            var tooOld = (parseInt(presenceStats[m]["year"]) == currentYear-1) && m <= currentMonth;
            if (wayTooOld || tooOld) {
                return;
            }

            ships = this._sumObjectsByKey(ships, presenceStats[m]["ships"]);
        });

        this.totalShips = Object.keys(ships).reduce((sum,key)=>sum+(ships[key]||0),0);
        this.topShips =  Object.keys(ships).map(function(key) {
            return [key, ships[key]];
        });

        this.topShips.sort(function(first, second) {
            return second[1] - first[1];
        });

        
    }

    visualization() {
        return sparkline.shipsgraph(this.topShips, this.totalShips);
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

    _sumObjectsByKey(...objs) {
        return objs.reduce((a, b) => {
            for (let k in b) {
            if (b.hasOwnProperty(k))
                a[k] = (a[k] || 0) + b[k];
            }
            return a;
        }, {});
    }
}
