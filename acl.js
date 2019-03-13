'use strict';
const utils = require('./utils');

module.exports = {
    blockedGuild: function (guildID) {
        if (!guildID) return true;
        return BLOCKED_GUILDS.includes(guildID);
    },

    blockedUser: function (userID) {
        if (!userID) return true;
        return BLOCKED_USERS.includes(userID);
    },

    authorizedGuild: function (guildID) {
        if (!guildID) return false;
        return AUTHORIZED_GUILDS.includes(guildID);  
    }
}

const BLOCKED_GUILDS = utils.requireIfExists(process.env.BLOCKED_GUILDS, []);
const AUTHORIZED_GUILDS = utils.requireIfExists(process.env.AUTHORIZED_GUILDS, []);
const BLOCKED_USERS = utils.requireIfExists(process.env.BLOCKED_USERS, []);