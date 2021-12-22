'use strict';
const { createCanvas, loadImage } = require('canvas');
const utils = require('./utils');

var self = module.exports = {

    legalgraph: function (clean, wanted, bounties) {
        var canvas = createCanvas(300, 100);
        var ctx = canvas.getContext('2d');

        var height = 16,
            width = 92,
            total = clean.length,
            maxBounty = Math.max.apply(Math, bounties),
            max = Math.max(Math.max.apply(Math, clean), Math.max.apply(Math, wanted)),
            xstep = width/total,
            barwidth = xstep*2/3,
            ystep = max/height,
            ystepb = maxBounty/height,
            x = 0,
            y = 0,
            w = barwidth,
            h = 0,
            i;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const d = new Date();
        const month = d.getUTCMonth();
        const year = d.getUTCFullYear();
        const startMonth = (month+1+12)%12;
        const startYear = (startMonth > month) ? year-1 : year; 

        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'end';
        ctx.fillStyle = 'rgb(132, 134, 137)';
        ctx.fillText('Clean', 95, 32);
        ctx.fillText('Wanted', 95, 44);
        ctx.fillText('Bounties', 95, 74);
        ctx.textAlign = 'start';
        ctx.fillText(`max: ${utils.prettyBounty(maxBounty)} cr`, 204, 74);

        ctx.textAlign = 'end';
        ctx.fillStyle = 'rgb(163, 165, 168)';
        ctx.fillText(monthNames[startMonth], 101, 86);
        ctx.fillText(startYear, 101, 96);
        ctx.textAlign = 'start';
        ctx.fillText(monthNames[month], 196, 86);
        ctx.fillText(year, 196, 96);
        ctx.beginPath();
        ctx.strokeStyle = 'rgb(163, 165, 168)';
        ctx.moveTo(104, 81);
        ctx.lineTo(104, 97);
        ctx.moveTo(193, 81);
        ctx.lineTo(193, 97);
        ctx.stroke();

        for (i = 0; i < total; i = i + 1) {
            if (clean[i] > 0) {
                var dx = 104, dy = 16;
                h = Math.max(clean[i]/ystep, 1);
                y = height - h;
                ctx.beginPath();
                ctx.rect(x+dx, y+dy, w, h);
                ctx.fillStyle = 'rgb(52, 158, 129)';
                ctx.fill();
                ctx.closePath();
            }

            if (wanted[i] > 0) {
                var dx = 104, dy = 37;
                h = Math.max(wanted[i]/ystep, 1);
                y = 0;
                ctx.beginPath();
                ctx.rect(x+dx, y+dy, w, h);
                ctx.fillStyle = 'rgb(31,38,42)';
                ctx.fill();
                ctx.closePath();
            }

            if (bounties[i] > 0) {
                var dx = 104, dy = 58;
                h = Math.max(bounties[i]/ystepb, 1);
                y = height - h;
                ctx.beginPath();
                ctx.rect(x+dx, y+dy, w, h);
                ctx.fillStyle = self._wantedcolor(bounties[i]);
                ctx.fill();
                ctx.closePath();
            }
            x = x + xstep;
        }

        return canvas;
    },

    shipsgraph: function (ships, totalShips) {
        var canvas = createCanvas(600, Math.max(16*Math.min(ships.length,10) + 30, 130));
        var ctx = canvas.getContext('2d');

        var height = 16,
            width = 92,
            total = ships.length,
            barwidth = 16,
            ystep = 16,
            x = 0,
            y = 0,
            w = 0,
            h = 12,
            i;

        ctx.fillStyle = 'rgb(255, 255, 255)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'end';
        ctx.fillStyle = 'rgb(132, 134, 137)';
        ctx.fillText('Sighted in', 95, 16);
        ctx.font = '9px sans-serif';
        y = 32;
        var rolesStats = {};
        var pvpStats = {"PvP": 0.0, "PvE": 0.0};

        for (i = 0; i < total; i = i + 1) {
            if (i < 10) {
                ctx.fillStyle = 'rgb(132, 134, 137)';
                ctx.fillText(utils.shipShortName(ships[i][0]), 95, y);
                var dx = 104, dy=5;
                w = ships[i][1]/totalShips * width;
                ctx.beginPath();
                ctx.rect(x+dx, y-ystep/2.0-h/2.0+dy, w, h);
                ctx.fillStyle = 'rgb(10, 139, 214)';
                ctx.fill();
                ctx.closePath();
                y = y + ystep;
            }
            
            var roles = utils.shipRolesWeight(ships[i][0]);
            for (var role in roles) {
                rolesStats[role] = (rolesStats[role] || 0) + roles[role] * ships[i][1];
            }

            var pvpWeight = utils.shipPvPWeight(ships[i][0]);
            pvpStats["PvP"] += pvpWeight["PvP"] * ships[i][1];
            pvpStats["PvE"] += pvpWeight["PvE"] * ships[i][1];
        }

        pvpStats["PvP"] /= totalShips;
        pvpStats["PvE"] /= totalShips;

        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'end';
        ctx.fillStyle = 'rgb(132, 134, 137)';
        ctx.fillText('Roles*', 279, 16);
        ctx.font = '9px sans-serif';
        y = 32;
        const roleOrdered = ["Combat", "Transport", "Exploration", "Passenger", "Multi-role", "Other"];
        for (var i in roleOrdered) {
            var role = roleOrdered[i];
            ctx.fillText(role, 279, y);
            var dx = 288, dy=5;
            if (role in rolesStats) {
                if (role == "Combat") {
                    ctx.fillStyle = 'rgb(0, 179, 247)';
                } else {
                    ctx.fillStyle = 'rgb(10, 139, 214)';
                }
                w = rolesStats[role]/totalShips * width;
                ctx.beginPath();
                ctx.rect(x+dx, y-ystep/2.0-h/2.0+dy, w, h);
                ctx.fill();
                ctx.closePath();
            }
            ctx.fillStyle = 'rgb(132, 134, 137)';
            y = y + ystep;
        }

        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'end';
        ctx.fillStyle = 'rgb(132, 134, 137)';
        ctx.fillText('Style*', 469, 16);
        ctx.font = '9px sans-serif';
        y = 32;
        ctx.fillStyle = 'rgb(132, 134, 137)';
        ctx.fillText('PvP', 469, y);
        ctx.fillStyle = 'rgb(132, 134, 137)';
        ctx.fillText('PvE', 469, y+ystep);
        ctx.fillStyle = 'rgb(132, 134, 137)';
        var dx = 478, dy=5;
        w = pvpStats["PvP"] * width;
        ctx.beginPath();
        ctx.rect(x+dx, y-ystep/2.0-h/2.0+dy, w, h);
        ctx.fillStyle = 'rgb(0, 179, 247)';
        ctx.fill();
        ctx.closePath();
        y = y + ystep;
        w = pvpStats["PvE"] * width;
        ctx.beginPath();
        ctx.rect(x+dx, y-ystep/2.0-h/2.0+dy, w, h);
        ctx.fillStyle = 'rgb(10, 139, 214)';
        ctx.fill();
        ctx.closePath();

        ctx.font = 'italic 9px sans-serif';
        ctx.fillStyle = 'rgb(132, 134, 137)';
        ctx.textAlign = 'end';
        ctx.fillText('*: speculative assessment solely based on ship types', canvas.width-12, canvas.height-12);
        return canvas;
    },

    drawImage: async function(path) {
        const localImage = await loadImage(path);
        return localImage;
    },

    presencegraph: async function (months, days, hours) {
        const localImage = await loadImage("./img/presence-template.png");
        
        var canvas = createCanvas(390, 560);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(localImage, 0, 0);
        
        var height = 9,
            width = 21,
            total = 12,
            startx = 110,
            starty = 53,
            xstep = width+1,
            ystep = 0,
            x = startx,
            y = starty,
            w = width,
            h = height,
            i;

        for (i = 0; i < total; i = i + 1) {
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.fillStyle = this._presencecolor(months["counts"][i], months["max"]);
            ctx.fill();
            ctx.closePath();
            x = x + xstep;
            y = y + ystep;
        }

        height = 20;
        width = 10;
        total = 7;
        startx = 99;
        starty = 63;
        xstep = 0;
        ystep = height+1;
        x = startx;
        y = starty;
        w = width;
        h = height;

        for (i = 0; i < total; i = i + 1) {
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.fillStyle = this._presencecolor(days["counts"][i], days["max"]);
            ctx.fill();
            ctx.closePath();
            x = x + xstep;
            y = y + ystep;
        }

        height = 20;
        width = 10;
        total = 12;
        startx = 99;
        starty = 283;
        xstep = 0;
        ystep = height+1;
        x = startx;
        y = starty;
        w = width;
        h = height;

        for (i = 0; i < total; i = i + 1) {
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.fillStyle = this._presencecolor(months["counts"][i], months["max"]);
            ctx.fill();
            ctx.closePath();
            x = x + xstep;
            y = y + ystep;
        }

        height = 9;
        width = 10;
        total = 24;
        startx = 110;
        starty = 273;
        xstep = width+1;
        ystep = 0;
        x = startx;
        y = starty;
        w = width;
        h = height;

        for (i = 0; i < total; i = i + 1) {
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.fillStyle = this._presencecolor(hours["counts"][i], hours["max"]);
            ctx.fill();
            ctx.closePath();
            x = x + xstep;
            y = y + ystep;
        }

        height = 20;
        width = 21;
        total = 12;
        startx = 110;
        starty = 63;
        xstep = width+1;
        ystep = height+1;
        x = startx;
        y = starty;
        w = width;
        h = height;

        for (i=0; i< total; i = i + 1) {
            var byday = months["byday"][i];
            var max = months["max"];
            for (var j=0; j<byday.length; j = j +1) {
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.fillStyle = this._presencecolor(byday[j], max);
                ctx.fill();
                ctx.closePath();
                y = y + ystep;
            }
            x = x + xstep;
            y = starty;
        }

        height = 20;
        width = 10;
        total = 12;
        startx = 110;
        starty = 283;
        xstep = width+1;
        ystep = height+1;
        x = startx;
        y = starty;
        w = width;
        h = height;

        for (i=0; i< total; i = i + 1) {
            var byhour = months["byhour"][i];
            var max = months["max"];
            for (var j=0; j<byhour.length; j = j +1) {
                ctx.beginPath();
                ctx.rect(x, y, w, h);
                ctx.fillStyle = this._presencecolor(byhour[j], max);
                ctx.fill();
                ctx.closePath();
                x = x + xstep;
            }
            y = y + ystep;
            x = startx;
        }

        return canvas;
    },

    _wantedcolor: function (bounty) {        
        if (bounty <= 1000) {
            return 'rgb(141, 130, 115)';
        } else if (bounty <= 10000) {
            return 'rgb(179, 138, 77)';
        } else if (bounty <= 100000) {
            return 'rgb(204, 142, 51)';
        } else if (bounty <= 1000000) {
            return 'rgb(230, 147, 26)';
        } else if (bounty <= 10000000) {
            return 'rgb(255, 152, 0)';
        } else if (bounty <= 100000000) {
            return 'rgb(255, 86, 7)';
        } else if (bounty <= 1000000000) {
            return 'rgb(246, 65, 45)';
        } else if (bounty <= 10000000000) {
            return 'rgb(255,0,0)';
        }
        return 'rgb(155, 0, 250)';
    },

    _presencecolor: function (count, maxcount) {
        if (maxcount <= 0 || count <= 0) return 'rgb(229, 229, 229)';
        var percent = count / maxcount;
        return `hsl(202, 91%, ${50+50*(1.0-percent)}%)`;
    }
};