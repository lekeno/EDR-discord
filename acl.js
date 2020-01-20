'use strict';
const utils = require('./utils');
const fs = require('fs');

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
    },

    authorizeGuild: function(guildID) {
        if (!guildID || !/^\d+$/.test(guildID) || module.exports.authorizedGuild(guildID)) return false;
        if (module.exports.blockedGuild(guildID)) {
            const index = BLOCKED_GUILDS.indexOf(guildID);
            if (index > -1) {
                BLOCKED_GUILDS.splice(index, 1);
                fs.writeFileSync(process.env.BLOCKED_GUILDS, JSON.stringify(BLOCKED_GUILDS), (err) => {
                    if (err) { console.error(err); return false; }
                });        
            }
        }
        AUTHORIZED_GUILDS.push(guildID);
        fs.writeFileSync(process.env.AUTHORIZED_GUILDS, JSON.stringify(AUTHORIZED_GUILDS), (err) => {
            if (err) { console.error(err); return false; }
        });
        return true;
    },

    blockGuild: function(guildID) {
        if (!guildID || !/^\d+$/.test(guildID) || module.exports.blockedGuild(guildID)) return false;
        if (module.exports.authorizedGuild(guildID)) {
            const index = AUTHORIZED_GUILDS.indexOf(guildID);
            if (index > -1) {
                AUTHORIZED_GUILDS.splice(index, 1);
                fs.writeFileSync(process.env.AUTHORIZED_GUILDS, JSON.stringify(AUTHORIZED_GUILDS), (err) => {
                    if (err) { console.error(err); return false; }
                });
            }
        }
        BLOCKED_GUILDS.push(guildID);
        fs.writeFileSync(process.env.BLOCKED_GUILDS, JSON.stringify(BLOCKED_GUILDS), (err) => {
            if (err) { console.error(err); return false; }
        });
        return true;
    },

    blockUser: function(userID) {
        if (!userID || !/^\d+$/.test(userID) || module.exports.blockedUser(userID)) return false;
        BLOCKED_USERS.push(userID);
        fs.writeFileSync(process.env.BLOCKED_USERS, JSON.stringify(BLOCKED_USERS), (err) => {
            if (err) { console.error(err); return false; }
        });
        return true;
    },
}

const BLOCKED_GUILDS = utils.requireIfExists(process.env.BLOCKED_GUILDS, []);
const AUTHORIZED_GUILDS = utils.requireIfExists(process.env.AUTHORIZED_GUILDS, []);
const BLOCKED_USERS = utils.requireIfExists(process.env.BLOCKED_USERS, []);