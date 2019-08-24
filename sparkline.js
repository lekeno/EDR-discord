'use strict';
const { createCanvas } = require('canvas');
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

        ctx.fillStyle = 'rgb(247, 247, 247)';
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
                h = clean[i]/ystep;
                y = height - h;
                ctx.beginPath();
                ctx.rect(x+dx, y+dy, w, h);
                console.log(`v:${clean[i]}, x:${x+dx}, y:${y+dy}, w: ${w}, h: ${h}`);
                ctx.fillStyle = 'rgb(52, 158, 129)';
                ctx.fill();
                ctx.closePath();
            }

            if (wanted[i] > 0) {
                var dx = 104, dy = 37;
                h = wanted[i]/ystep;
                y = 0;
                ctx.beginPath();
                ctx.rect(x+dx, y+dy, w, h);
                console.log(`v:${wanted[i]}, x:${x+dx}, y:${y+dy}, w: ${w}, h: ${h}`);
                ctx.fillStyle = 'rgb(31,38,42)';
                ctx.fill();
                ctx.closePath();
            }

            if (bounties[i] > 0) {
                var dx = 104, dy = 58;
                h = bounties[i]/ystepb;
                y = height - h;
                ctx.beginPath();
                ctx.rect(x+dx, y+dy, w, h);
                console.log(`v:${wanted[i]}, x:${x+dx}, y:${y+dy}, w: ${w}, h: ${h}`);
                ctx.fillStyle = self._wantedcolor(bounties[i]);
                ctx.fill();
                ctx.closePath();
            }
            x = x + xstep;
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
        return `rgb(155, 0, 250)`;
    }
};