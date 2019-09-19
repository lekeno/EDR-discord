'use strict';

module.exports = {
  prettyDuration: function (duration) {
    var days = Math.floor(duration / 86400);
    duration -= days * 86400;
    var hours = Math.floor(duration / 3600) % 24;
    duration -= hours * 3600;
    var minutes = Math.floor(duration / 60) % 60;
    duration -= minutes * 60;
    var seconds = Math.floor(duration % 60);
    if (days > 0) {
      let readable = days + " day";
      if (days > 1)
        readable += "s";
      if (hours > 0)
        readable += " " + hours + " hour";
      if (hours > 1)
        readable += "s";
      return readable;
    }
    if (hours > 0) {
      let readable = hours + " hour";
      if (hours > 1)
        readable += "s";
      if (minutes > 0)
        readable += " " + minutes + " minute";
      if (minutes > 1)
        readable += "s";
      return readable;
    }
    if (minutes > 0) {
      let readable = minutes + " minute";
      if (minutes > 1)
        readable += "s";
      return readable;
    }
    let readable = seconds + " second";
    if (seconds > 1)
      readable += "s";
    return readable;
  },

  prettyBounty: function (bounty) {
    let truncated = 0
    let suffix = ""
    if (bounty >= 1000000000) {
        truncated = Math.round(bounty / 1000000000, 0);
        suffix = "b";
    } else if (bounty >= 1000000) {
        truncated = Math.round(bounty / 1000000, 0);
        suffix = "m";
    } else if (bounty >= 1000) {
        truncated = Math.round(bounty / 1000, 0);
        suffix = "k";
    } else {
        truncated = bounty;
        suffix = "";
    }
    return truncated + suffix;
  },

  prettyDistance: function (distance) {
    return distance < 50.0 ? Math.round(distance*100)/100 : Math.round(distance); 
  },

  compactTimelapse: function (timestamp) {
    var present = Date.now();
    var qualifier = "T-";
    if (timestamp > present) qualifier = "T+"

    var delta = Math.abs(present - timestamp) / 1000;
    var days = Math.floor(delta / 86400);
    delta -= days * 86400;

    var hours = Math.floor(delta / 3600) % 24;
    delta -= hours * 3600;

    var minutes = Math.floor(delta / 60) % 60;
    delta -= minutes * 60;

    var seconds = Math.floor(delta % 60);

    if (days > 0) {
        let readable = String("  " + days).slice(-2) + "d";
        if (days > 99) {
            readable = days + "d";
        }
        if (hours > 0) {
            readable += ":" + String("00" + hours).slice(-2)  +"h"
        } else {
            readable += "    "
        }
        return qualifier + readable;
    }

    if (hours > 0) {
        let readable = String("00" + hours).slice(-2) + "h";
        if (minutes > 0) {
            readable += ":" + String("00" + minutes).slice(-2) +"m"
        } else {
            readable += "    "
        }
        return qualifier + readable;
    }

    if (minutes > 0) {
        let readable = "    " + String("00" + minutes).slice(-2) + "m"
        return qualifier + readable;
    }

    return qualifier + "    " +  String("00" + seconds).slice(-2) + "s";
  },

  distance: function (src, dst) {
    return Math.sqrt(Math.pow((dst["x"] - src["x"]), 2) + Math.pow((dst["y"] - src["y"]), 2) + Math.pow((dst["z"] - src["z"]), 2));
  },

  transferTime: function (distance) {
    return distance * 9.75 + 300;
  },

  taxiTime: function (distance) {
    return Math.ceil(distance / 50.0) * 55;
  },

  snailTime: function (distance) {
    return Math.ceil(distance / 15.0) * 75;
  },

  unexpectedCmdrName: function (cmdrName) {
    if (typeof cmdrName != 'string') return true;
    if (cmdrName.length > 255) return true; // random guess about limits for Elite cmdr name
    
    return false;
  },

  unexpectedSystemName: function (systemName) {
    if (typeof systemName != 'string') return true;
    if (systemName.length == 0 || systemName.length > 255) return true; // random guess about limits for Elite cmdr name
    return !/^[\x00-\x7F]+$/.test(systemName); // must be printable ASCII
  },

  unexpectedSCDistance: function (distance) {
    if (typeof distance != 'number') return true;

    return (distance <= 0);
  },

  randomIntExcl: function (max) {
    return Math.floor(Math.random() * Math.floor(max));
  },

  requireIfExists: function (name, fallback) {
    try {
      return require(name);
    } catch (error) {
      return fallback;
    }
  },
  
  sanitize: function(text) {
    return text.replace(/\\(\@|\#|\*|_|`|~|\\)/g, '$1').replace(/(\@|\#|\*|_|`|~|\\)/g, '\\$1');
  },

  shipShortName: function (name) {
    return SHIPSHORTNAMES[name] || name;
  },

  shipRolesWeight: function (name) {
    var neutral = { "Combat": 0.0, "Exploration": 0.0, "Transport": 0.0, "Passenger": 0.0, "Other": 0.0, "Multi-role": 0.0};
    return SHIPROLES[name] || neutral;
  },

  shipPvPWeight: function(name) {
    var neutral = {"PvP": 0.0, "PvE": 0.0};
    return SHIPSTYLES[name] || neutral;
  }
}

const SHIPROLES = module.exports.requireIfExists(process.env.SHIPROLES, {});
const SHIPSTYLES = module.exports.requireIfExists(process.env.SHIPSTYLES, {});
const SHIPSHORTNAMES = module.exports.requireIfExists(process.env.SHIPSHORTNAMES, {});