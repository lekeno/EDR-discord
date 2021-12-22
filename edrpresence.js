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
        this.days = {"total": 0, "max": 0, "counts":[0,0,0,0,0,0,0]};
        this.hours = {"total": 0, "max": 0, "counts":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]};
        this.months = {"total": 0, "max": 0, "counts": [], "byday":[], "byhour": []};
        orderly.forEach(m => {
            var byday = [0,0,0,0,0,0,0];
            var byhour = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
            if (!(m in presenceStats))  {
                this.months["counts"].push(0);
                this.months["byday"].push(byday);
                this.months["byhour"].push(byhour);
                return;
            }

            var wayTooOld = parseInt(presenceStats[m]["year"]) < currentYear-1;
            var tooOld = (parseInt(presenceStats[m]["year"]) == currentYear-1) && m <= currentMonth;
            if (wayTooOld || tooOld) {
                this.months["counts"].push(0);
                this.months["byday"].push(byday);
                this.months["byhour"].push(byhour);
                return;
            }

            ships = this._sumObjectsByKey(ships, presenceStats[m]["ships"]);
            delete ships["Unknown"];
            for (var i = 0; i<12; i++) {
                if (presenceStats[m] == undefined || presenceStats[m]["days"] == undefined || presenceStats[m]["days"][i] == undefined) continue;
                var count = presenceStats[m]["days"][i] || presenceStats[m]["days"][i.toString()];
                if (count == undefined) { count = 0;}
                this.days["counts"][i] += count;
                this.days["total"] += count;
                this.days["max"] = Math.max(this.days["counts"][i], this.days["max"]);
                byday[i] += count;
            }
            this.months["byday"].push(byday);
            
            for (var i = 0; i<24; i++) {
                if (presenceStats[m] == undefined || presenceStats[m]["times"] == undefined || presenceStats[m]["times"][i] == undefined) continue;
                var count = presenceStats[m]["times"][i] || presenceStats[m]["times"][i.toString()];
                if (count == undefined) { count = 0;}
                this.hours["counts"][i] += count;
                this.hours["total"] += count;
                this.hours["max"] = Math.max(this.hours["counts"][i], this.hours["max"]);
                byhour[i] += count
            }
            this.months["byhour"].push(byhour);
            
            var count = presenceStats[m]["total"];
            if (count == undefined) {
                count= 0;
            }
            this.months["counts"].push(count);
            this.months["total"] += count;
            this.months["max"] = Math.max(count, this.months["max"]);
        });
        this.totalShips = Object.keys(ships).reduce((sum,key)=>sum+(ships[key]||0),0);
        this.topShips =  Object.keys(ships).map(function(key) {
            return [key, ships[key]];
        });

        this.topShips.sort(function(first, second) {
            return second[1] - first[1];
        });

        
    }

    async visualization() {
        return [sparkline.shipsgraph(this.topShips, this.totalShips), await sparkline.presencegraph(this.months, this.days, this.hours)]
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
