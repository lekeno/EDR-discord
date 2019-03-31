'use strict';

const utils = require('./utils');
module.exports = {
    gotOne: function (entity, shorthandCMD) {
        if (!entity || typeof entity != 'string') return false;
        if (!shorthandCMD || typeof shorthandCMD != 'string') return false;
        
        let c_entity = canonicalize(entity); 
        if (!Object.keys(JOKES).includes(c_entity)) return false;

        let options = JOKES[canonicalize(c_entity)];
        return Object.keys(options).includes(shorthandCMD);
    },

    randomIfAny: function (entity, shorthandCMD) {
        if (! this.gotOne(entity, shorthandCMD)) return;
        let options = JOKES[canonicalize(entity)][shorthandCMD];
        return options[utils.randomIntExcl(options.length)];
    },

    isItAprilFoolDay: function() {
        var now = new Date();
        return (now.getMonth() == 3 && now.getDate() == 1);
    }
}

function canonicalize(entity) {
    return entity.toLowerCase();
}

const JOKES = utils.requireIfExists(process.env.JOKES, {});