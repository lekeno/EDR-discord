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
    const simpleNames = {
      "Adder": "Adder",
      "Alliance Challenger": "Challie",
      "Alliance Chieftain": "Chief",
      "Alliance Crusader": "Crusader",
      "Anaconda": "Conda",
      "Asp Explorer": "AspX",
      "Asp Scout": "AspS",
      "Beluga Liner": "beluga",
      "Cobra Mk III": "Cobra",
      "Cobra Mk IV": "Cobra 4",
      "Diamondback Explorer": "DBX",
      "Diamondback Scout": "DBS",
      "Dolphin": "Dolphin",
      "Eagle": "Eagle",
      "Federal Assault Ship": "FAS",
      "Federal Corvette": "Corvette",
      "Federal Dropship": "FDS",
      "Federal Gunship": "FGS",
      "Fer-de-Lance": "FDL",
      "Hauler": "Hauler",
      "Imperial Clipper": "Clipper",
      "Imperial Courier": "Courier",
      "Imperial Cutter": "Cutter",
      "Imperial Eagle": "IEagle",
      "Keelback": "Keelie",
      "Krait Mk II": "Krait",
      "Krait Phantom": "Phantom",
      "Mamba": "Mamba",
      "Orca": "Orca",
      "Python": "Python",
      "Sidewinder": "Sidey",
      "Type-10 Defender": "T10",
      "Type-6 Transporter": "T6",
      "Type-7 Transporter": "T7",
      "Type-9 Heavy": "T9",
      "Viper": "Viper",
      "Viper Mk IV": "Viper 4",
      "Vulture": "Vulture",
      'Taipan Fighter': 'Taipan',
      'Imperial Fighter': 'iSLF',
      'F63 Condor': 'Condor',
      'Trident': 'Trident',
      'Lance': 'Lance',
      'Javelin': 'Javelin',
      'Unknown': '???'
    };
    return simpleNames[name] || name;
  },

  shipRolesWeight: function (name) {
    var neutral = { "Combat": 0.0, "Exploration": 0.0, "Transport": 0.0, "Passenger": 0.0, "Other": 0.0, "Multi-role": 0.0};
    var purecombat = { "Combat": 1.0, "Exploration": 0.0, "Transport": 0.0, "Passenger": 0.0, "Other": 0.0, "Multi-role": 0.0};
    const rolesWeight = {
      'Adder': {'Combat': 0.0689655172413793, 'Transport': 0.206896551724138, 'Exploration': 0.0344827586206897, 'Passenger': 0, 'Multi-role': 0.517241379310345, 'Other': 0.172413793103448, },
      'Alliance Challenger': {'Combat': 0.827586206896552, 'Transport': 0.0344827586206897, 'Exploration': 0.0344827586206897, 'Passenger': 0, 'Multi-role': 0.0689655172413793, 'Other': 0.0344827586206897, },
      'Alliance Chieftain': {'Combat': 0.96551724137931, 'Transport': 0, 'Exploration': 0.0344827586206897, 'Passenger': 0, 'Multi-role': 0, 'Other': 0, },
      'Alliance Crusader': {'Combat': 0.827586206896552, 'Transport': 0.0344827586206897, 'Exploration': 0.0344827586206897, 'Passenger': 0, 'Multi-role': 0.0689655172413793, 'Other': 0.0344827586206897, },
      'Anaconda': {'Combat': 0.137931034482759, 'Transport': 0, 'Exploration': 0.0344827586206897, 'Passenger': 0.0344827586206897, 'Multi-role': 0.758620689655172, 'Other': 0.0344827586206897, },
      'Asp Explorer': {'Combat': 0.0689655172413793, 'Transport': 0, 'Exploration': 0.689655172413793, 'Passenger': 0, 'Multi-role': 0.241379310344828, 'Other': 0, },
      'Asp Scout': {'Combat': 0.206896551724138, 'Transport': 0, 'Exploration': 0.241379310344828, 'Passenger': 0, 'Multi-role': 0.275862068965517, 'Other': 0.275862068965517, },
      'Beluga Liner': {'Combat': 0.0689655172413793, 'Transport': 0.0689655172413793, 'Exploration': 0.0689655172413793, 'Passenger': 0.620689655172414, 'Multi-role': 0.172413793103448, 'Other': 0, },
      'Cobra Mk III': {'Combat': 0.241379310344828, 'Transport': 0.0344827586206897, 'Exploration': 0, 'Passenger': 0, 'Multi-role': 0.689655172413793, 'Other': 0.0344827586206897, },
      'Cobra Mk IV': {'Combat': 0.275862068965517, 'Transport': 0, 'Exploration': 0.0344827586206897, 'Passenger': 0, 'Multi-role': 0.620689655172414, 'Other': 0.0689655172413793, },
      'Diamondback Explorer': {'Combat': 0.0689655172413793, 'Transport': 0, 'Exploration': 0.758620689655172, 'Passenger': 0.0344827586206897, 'Multi-role': 0.137931034482759, 'Other': 0, },
      'Diamondback Scout': {'Combat': 0.482758620689655, 'Transport': 0, 'Exploration': 0.241379310344828, 'Passenger': 0, 'Multi-role': 0.206896551724138, 'Other': 0.0689655172413793, },
      'Dolphin': {'Combat': 0.0689655172413793, 'Transport': 0.0344827586206897, 'Exploration': 0.137931034482759, 'Passenger': 0.586206896551724, 'Multi-role': 0.172413793103448, 'Other': 0, },
      'Eagle': {'Combat': 0.827586206896552, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0, 'Other': 0.137931034482759, },
      'Federal Assault Ship': {'Combat': 0.96551724137931, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0, 'Other': 0, },
      'Federal Corvette': {'Combat': 0.896551724137931, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0.0689655172413793, 'Other': 0, },
      'Federal Dropship': {'Combat': 0.586206896551724, 'Transport': 0.0689655172413793, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0.275862068965517, 'Other': 0.0344827586206897, },
      'Federal Gunship': {'Combat': 0.931034482758621, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0.0344827586206897, 'Other': 0, },
      'Fer-de-Lance': {'Combat': 0.96551724137931, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0, 'Other': 0, },
      'Hauler': {'Combat': 0.0689655172413793, 'Transport': 0.551724137931035, 'Exploration': 0.0344827586206897, 'Passenger': 0, 'Multi-role': 0.103448275862069, 'Other': 0.241379310344828, },
      'Imperial Clipper': {'Combat': 0.413793103448276, 'Transport': 0.103448275862069, 'Exploration': 0, 'Passenger': 0, 'Multi-role': 0.413793103448276, 'Other': 0.0689655172413793, },
      'Imperial Courier': {'Combat': 0.689655172413793, 'Transport': 0.0689655172413793, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0.103448275862069, 'Other': 0.103448275862069, },
      'Imperial Cutter': {'Combat': 0.310344827586207, 'Transport': 0.275862068965517, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0.344827586206897, 'Other': 0.0344827586206897, },
      'Imperial Eagle': {'Combat': 0.689655172413793, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0, 'Other': 0.275862068965517, },
      'Keelback': {'Combat': 0.137931034482759, 'Transport': 0.344827586206897, 'Exploration': 0, 'Passenger': 0, 'Multi-role': 0.379310344827586, 'Other': 0.137931034482759, },
      'Krait Mk II': {'Combat': 0.379310344827586, 'Transport': 0, 'Exploration': 0.0344827586206897, 'Passenger': 0.0344827586206897, 'Multi-role': 0.517241379310345, 'Other': 0.0344827586206897, },
      'Krait Phantom': {'Combat': 0.310344827586207, 'Transport': 0, 'Exploration': 0.344827586206897, 'Passenger': 0.0344827586206897, 'Multi-role': 0.275862068965517, 'Other': 0.0344827586206897, },
      'Mamba': {'Combat': 0.931034482758621, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0.0344827586206897, 'Other': 0, },
      'Orca': {'Combat': 0.137931034482759, 'Transport': 0.0689655172413793, 'Exploration': 0.137931034482759, 'Passenger': 0.482758620689655, 'Multi-role': 0.172413793103448, 'Other': 0, },
      'Python': {'Combat': 0.172413793103448, 'Transport': 0.206896551724138, 'Exploration': 0, 'Passenger': 0, 'Multi-role': 0.586206896551724, 'Other': 0.0344827586206897, },
      'Sidewinder': {'Combat': 0.137931034482759, 'Transport': 0, 'Exploration': 0.0344827586206897, 'Passenger': 0.0344827586206897, 'Multi-role': 0.448275862068966, 'Other': 0.344827586206897, },
      'Type-10 Defender': {'Combat': 0.551724137931035, 'Transport': 0.206896551724138, 'Exploration': 0, 'Passenger': 0, 'Multi-role': 0.172413793103448, 'Other': 0.0689655172413793, },
      'Type-6 Transporter': {'Combat': 0.0689655172413793, 'Transport': 0.896551724137931, 'Exploration': 0.0344827586206897, 'Passenger': 0, 'Multi-role': 0, 'Other': 0, },
      'Type-7 Transporter': {'Combat': 0.0689655172413793, 'Transport': 0.862068965517241, 'Exploration': 0.0689655172413793, 'Passenger': 0, 'Multi-role': 0, 'Other': 0, },
      'Type-9 Heavy': {'Combat': 0.0689655172413793, 'Transport': 0.896551724137931, 'Exploration': 0.0344827586206897, 'Passenger': 0, 'Multi-role': 0, 'Other': 0, },
      'Viper': {'Combat': 0.862068965517241, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0.0344827586206897, 'Other': 0.0689655172413793, },
      'Viper Mk IV': {'Combat': 0.793103448275862, 'Transport': 0, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0.172413793103448, 'Other': 0, },
      'Vulture': {'Combat': 0.931034482758621, 'Transport': 0.0344827586206897, 'Exploration': 0, 'Passenger': 0.0344827586206897, 'Multi-role': 0, 'Other': 0, },
      'Taipan Fighter': purecombat,
      'Imperial Fighter': purecombat,
      'F63 Condor': purecombat,
      'Trident': purecombat,
      'Lance': purecombat,
      'Javelin': purecombat,
      'Unknown': neutral
    };

    return rolesWeight[name] || neutral;
  },

  shipPvPWeight: function(name) {
    var neutral = {"PvP": 0.0, "PvE": 0.0};
    var half = {"PvP": 0.5, "PvE": 0.5};
    var pvpWeight = {
      'Alliance Challenger': {'PvP': 0.642424242424243, 'PvE': 0.357575757575758, },
      'Alliance Chieftain': {'PvP': 0.718181818181818, 'PvE': 0.281818181818182, },
      'Alliance Crusader': {'PvP': 0.603030303030303, 'PvE': 0.396969696969697, },
      'Anaconda': {'PvP': 0.53030303030303, 'PvE': 0.46969696969697, },
      'Asp Explorer': {'PvP': 0.157575757575758, 'PvE': 0.842424242424242, },
      'Asp Scout': {'PvP': 0.163636363636364, 'PvE': 0.836363636363636, },
      'Beluga Liner': {'PvP': 0.193939393939394, 'PvE': 0.806060606060606, },
      'Cobra Mk III': {'PvP': 0.424242424242424, 'PvE': 0.575757575757576, },
      'Cobra Mk IV': {'PvP': 0.357575757575758, 'PvE': 0.642424242424243, },
      'Diamondback Explorer': {'PvP': 0.290909090909091, 'PvE': 0.709090909090909, },
      'Diamondback Scout': {'PvP': 0.43030303030303, 'PvE': 0.56969696969697, },
      'Dolphin': {'PvP': 0.136363636363636, 'PvE': 0.863636363636364, },
      'Eagle': {'PvP': 0.451515151515152, 'PvE': 0.548484848484849, },
      'Federal Assault Ship': {'PvP': 0.812121212121212, 'PvE': 0.187878787878788, },
      'Federal Corvette': {'PvP': 0.833333333333333, 'PvE': 0.166666666666667, },
      'Federal Dropship': {'PvP': 0.681818181818182, 'PvE': 0.318181818181818, },
      'Federal Gunship': {'PvP': 0.790909090909091, 'PvE': 0.209090909090909, },
      'Fer-de-Lance': {'PvP': 0.918181818181818, 'PvE': 0.0818181818181818, },
      'Hauler': {'PvP': 0.0848484848484849, 'PvE': 0.915151515151515, },
      'Imperial Clipper': {'PvP': 0.621212121212121, 'PvE': 0.378787878787879, },
      'Imperial Courier': {'PvP': 0.545454545454545, 'PvE': 0.454545454545455, },
      'Imperial Cutter': {'PvP': 0.709090909090909, 'PvE': 0.290909090909091, },
      'Imperial Eagle': {'PvP': 0.481818181818182, 'PvE': 0.518181818181818, },
      'Keelback': {'PvP': 0.178787878787879, 'PvE': 0.821212121212121, },
      'Krait Mk II': {'PvP': 0.712121212121212, 'PvE': 0.287878787878788, },
      'Krait Phantom': {'PvP': 0.572727272727273, 'PvE': 0.427272727272727, },
      'Mamba': {'PvP': 0.863636363636364, 'PvE': 0.136363636363636, },
      'Orca': {'PvP': 0.321212121212121, 'PvE': 0.678787878787879, },
      'Python': {'PvP': 0.524242424242424, 'PvE': 0.475757575757576, },
      'Sidewinder': {'PvP': 0.187878787878788, 'PvE': 0.812121212121212, },
      'Type-10 Defender': {'PvP': 0.436363636363636, 'PvE': 0.563636363636364, },
      'Type-6 Transporter': {'PvP': 0.0818181818181818, 'PvE': 0.918181818181818, },
      'Type-7 Transporter': {'PvP': 0.0848484848484848, 'PvE': 0.915151515151515, },
      'Type-9 Heavy': {'PvP': 0.106060606060606, 'PvE': 0.893939393939394, },
      'Viper': {'PvP': 0.615151515151515, 'PvE': 0.384848484848485, },
      'Viper Mk IV': {'PvP': 0.548484848484849, 'PvE': 0.451515151515152, },
      'Vulture': {'PvP': 0.763636363636364, 'PvE': 0.236363636363636, },
      'Taipan Fighter': half,
      'Imperial Fighter': half,
      'F63 Condor': half,
      'Trident': half,
      'Lance': half,
      'Javelin': half,
      'Unknown': neutral
    };

    return pvpWeight[name] || neutral;
  }
}
