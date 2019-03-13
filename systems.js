'use strict';
const LRU = require("lru-cache");
const statioport = require("./station");
const caching = require("./caching");
const request = require("request-promise");

module.exports = class Systems {
  constructor () {
    this.staCache = LRU({ max: process.env.CACHE_MAX_ITEMS, maxAge: process.env.STATION_MAX_AGE });
    try {
      caching.read(process.env.STATIONS_CACHE, this.staCache);
    } catch (error) {
      console.error(error);
    }
  }
  
  async stations (systemName) {
    let cached = this.staCache.get(systemName);
    if (cached) {
      let delta = Date.now() - cached["timestamp"];
      if (delta < process.env.SYSTEM_MAX_AGE) {
        return cached['response'];
      }
    }
    
    var options = {
      url: process.env.EDSM_STATIONS,
      method: 'GET',
      json: true,
      resolveWithFullResponse: true,
      simple: false,
      qs: {"systemName": systemName}
    };
    
    let response = await request(options);
    if (response.statusCode != 200) {
      return false;
    }

    this.staCache.set(systemName, {"date": new Date(), "response": response.body['stations'], "timestamp": Date.now()});
    caching.write(process.env.STATIONS_CACHE, this.staCache);
    return response.body['stations'];
  }

  closestStation (stations, service) {
    let overall = undefined;
    let withShipyard = undefined;
    let withLargeLandingPads = undefined;
    for (var station in stations) {
      let sta = new statioport(stations[station]);
      if (service && !sta.hasService(service)) continue;
  
      if (overall == undefined) {
        overall = stations[station]; // TODO replace with a proper station object
      } else if (stations[station]['distanceToArrival'] < overall['distanceToArrival']) {
        overall = stations[station];
      }
      if (sta.hasLargeLandingPads()) {
        withLargeLandingPads = stations[station];
      }
      
      if (!sta.hasShipyard()) continue;
      if (withShipyard == undefined) {
        withShipyard = stations[station];
      } else if (sta.distanceToArrival() < overall['distanceToArrival']) {
        withShipyard = stations[station];
      }
    }
    return {'overall': overall, 'withShipyard': withShipyard, 'withLargeLandingPads': withLargeLandingPads};
  }

  closestDestination (sysAndSta1, sysAndSta2, scDistance) {
    if (sysAndSta1 == undefined) {
      return sysAndSta2;
    }

    if (sysAndSta2 == undefined) {
      return sysAndSta1;
    }

    if (sysAndSta1['station']['distanceToArrival'] > scDistance && sysAndSta2['station']['distanceToArrival'] > scDistance) {
      if (Math.abs(sysAndSta1['distance'] - sysAndSta2['distance']) < 5) {
          return sysAndSta1['station']['distanceToArrival'] < sysAndSta2['station']['distanceToArrival'] ? sysAndSta1 : sysAndSta2;
      } else {
          return sysAndSta1['distance'] < sysAndSta2['distance'] ? sysAndSta1 : sysAndSta2;
      }
    }
  
    if (sysAndSta1['station']['distanceToArrival'] > scDistance) {
      return sysAndSta2;
    }
  
    if (sysAndSta2['station']['distanceToArrival'] > scDistance) {
      return sysAndSta1;
    }
        
    return sysAndSta1['distance'] < sysAndSta2['distance'] ? sysAndSta1 : sysAndSta2;
  }

  async ifactorsInSystem (system) {
    let ifactors = undefined;
    
    if (!system || system['requirePermit']) {
      return new Promise((resolve, reject) => {
          resolve(ifactors);
      });
    }
     
    let sta = await this.stations(system['name']);
    if (!sta || sta.length == 0) {
      return undefined; 
    }
  
    let closest = this.closestStation(sta, 'Interstellar Factors Contact');
    if (closest['overall']) {
        ifactors = {'overall': system};
        ifactors['overall']['station'] = closest['overall'];
      if (closest['withLargeLandingPads']) {
        ifactors = {'withLargeLandingPads': system};
        ifactors['withLargeLandingPads']['station'] = closest['withLargeLandingPads'];
      }
    }
  
    return ifactors;
  }

  async matTradersInSystem (system) {
    let rawTrader = undefined;
    let manTrader = undefined;
    let encTrader = undefined;

    if (!system || system['requirePermit']) {
        return {'raw': rawTrader, 'encoded': encTrader, 'manufactured': manTrader};
        // TODO promise probably not needed
        /*return new Promise((resolve, reject) => {
            resolve({'raw': rawTrader, 'encoded': encTrader, 'manufactured': manTrader});
        });*/ 
    }
    
    let info = system['information'];
    info['security'] = info['security'] || 'N/A';
    info['economy'] = info['economy'] || 'N/A';
    if (info['government'] == 'Anarchy' || !['high', 'medium'].includes(info['security'].toLowerCase()) || info['population'] < 1000000 || info['population'] > 22000000 || !['extraction', 'refinery', 'industrial', 'high tech', 'military'].includes(info['economy'].toLowerCase())) {
        return {'raw': rawTrader, 'encoded': encTrader, 'manufactured': manTrader}  
      /*return new Promise((resolve, reject) => {
            resolve({'raw': rawTrader, 'encoded': encTrader, 'manufactured': manTrader});
        });*/ 
    }
        
    let sta = await this.stations(system['name']);
    if (!sta || sta.length == 0) {
        return {'raw': undefined, 'encoded': undefined, 'manufactured': undefined}; 
    }

    if (['extraction', 'refinery'].includes(info['economy'].toLowerCase())) {
    let closest = this.closestStation(sta, 'Material Trader');
        if (closest['overall']) {
            rawTrader = system;
            rawTrader['station'] = closest['overall'];
        }
    }

    if (info['economy'].toLowerCase() == 'industrial') {
    let closest = this.closestStation(sta, 'Material Trader');
        if (closest['overall']) {
            manTrader = system;
            manTrader['station'] = closest['overall'];
        }
    }

    if (['high tech', 'military'].includes(info['economy'].toLowerCase())) {
    let closest = this.closestStation(sta, 'Material Trader');
        if (closest['overall']) {
            encTrader = system;
            encTrader['station'] = closest['overall'];
        }
    }

    return {'raw': rawTrader, 'encoded': encTrader, 'manufactured': manTrader};
  }
}