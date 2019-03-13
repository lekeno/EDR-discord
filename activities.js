'use strict';
const utils = require('./utils');

module.exports = {
    random: function () {
        return activities[utils.randomIntExcl(activities.length)];
    }
}

const activities = utils.requireIfExists(process.env.ACTIVITIES, [{"name": "Elite: Dangerous", "type": "PLAYING"}]);