"use strict";
const utils = require("./utils");

module.exports = {

    system: function(id, name) {
        if (isNaN(id)) return "";
        if (typeof name != 'string') return "";
        let URL = `${process.env.EDSM_SYSTEM_PREFIX}${id}/name/${encodeURIComponent(utils.sanitize(name))}`;
        return `[${utils.sanitize(name)}](${URL})`;
    },

    station: function(sysID, sysName, stationID, stationName) {
        if (isNaN(sysID) || isNaN(stationID)) return "";
        if (typeof name != 'string' || typeof stationName != 'string') return "";
        let URL = `${process.env.EDSM_STATION_PREFIX}${sysID}/name/${encodeURIComponent(utils.sanitize(sysName))}/details/idS/${stationID}/nameS/${encodeURIComponent(utils.sanitize(stationName))}`;
        return `[${utils.sanitize(stationName)}](${URL})`;
    },

}