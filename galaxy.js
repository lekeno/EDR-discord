"use strict";
const LRU = require("lru-cache");
const request = require("request-promise");
const utils = require('./utils');
const caching = require("./caching");
const systems = require("./systems");

module.exports = class Galaxy {
    constructor () {
        this.systems = new systems();
        this.sysCache = new LRU({max: parseInt(process.env.CACHE_MAX_ITEMS), maxAge: parseInt(process.env.SYSTEM_MAX_AGE)});
        try {
            caching.read(process.env.SYSTEMS_CACHE, this.sysCache);
        } catch (error) {
            console.error(error);
        }

        this.sysRadCache = new LRU({max: parseInt(process.env.CACHE_MAX_ITEMS), maxAge: parseInt(process.env.SYSTEM_MAX_AGE)});
        try {
            caching.read(process.env.SYSTEMS_RADIUS_CACHE, this.sysRadCache);
        } catch (error) {
            console.error(error);
        }
    }

    async system (name) {
        let cached = this.sysCache.get(name);
        if (cached) {
            let delta = Date.now() - cached["timestamp"];
            if (delta < process.env.SYSTEM_MAX_AGE) {
                return cached['response'];
            }
        }
        
        let options = {
            url: process.env.EDSM_SYSTEMS,
            method: 'GET',
            json: true,
            resolveWithFullResponse: true,
            simple: false,
            qs: {"systemName": name, "showCoordinates": 1, "showInformation":1, "showId": 1}
        };
        
        let response = await request(options);
        
        if (response.statusCode != 200) {
            return false;
        }
        
        this.sysCache.set(name, {"date": new Date(), "response": response.body[0], "timestamp": Date.now()});
        caching.write(process.env.SYSTEMS_CACHE, this.sysCache);
        return response.body[0];
    }

    compareSystems (a,b) {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        return 0;
    }

    async materialTraders (systemName, radius, scDistance) {
        let sys = await this.system(systemName);
        let rawTrader = undefined;
        let encTrader = undefined;
        let manTrader = undefined;
        let rawTraderAlt = undefined;
        let encTraderAlt = undefined;
        let manTraderAlt = undefined;
      
        sys['distance'] = 0;
        let traders = await this.systems.matTradersInSystem(sys);
        if (traders['raw'] && traders['raw']['station']) {
            if (traders['raw']['station']['distanceToArrival'] <= scDistance) {
                rawTrader = traders['raw'];
            } else {
                rawTraderAlt = traders['raw'];
            }
        }
      
        if (traders['encoded'] && traders['encoded']['station']) {
            if (traders['encoded']['station']['distanceToArrival'] <= scDistance) {
                encTrader = traders['encoded'];
            } else {
                encTraderAlt = traders['encoded'];
            }
        }
      
        if (traders['manufactured'] && traders['manufactured']['station']) {
            if (traders['manufactured']['station']['distanceToArrival'] <= scDistance) {
                manTrader = traders['manufactured'];
            } else {
                manTraderAlt = traders['manufactured'];
            }
        }
        if (rawTrader != undefined && encTrader != undefined && manTrader != undefined) {
            return {'raw': rawTrader, 'encoded': encTrader, 'manufactured': manTrader};
        }
      
        let sortedSystems = await this.systemsWithinRadius(systemName, radius);
        
          for (var id in sortedSystems) {
              let system = sortedSystems[id];
              if (system['requirePermit']) {
                  continue;
              }
              let info = system['information'];
              let traders = await this.systems.matTradersInSystem(system);
              if (traders['raw']) {
                  let closest = this.systems.closestDestination(traders['raw'], rawTrader ? rawTrader : rawTraderAlt, scDistance);
                  if (closest['station']['distanceToArrival'] < scDistance) {
                     rawTrader = closest;
                  } else {
                      rawTraderAlt = closest;
                  }
              }
      
              if (traders['encoded']) {
                  let closest = this.systems.closestDestination(traders['encoded'], encTrader ? encTrader : encTraderAlt, scDistance);
                  if (closest['station']['distanceToArrival'] < scDistance) {
                      encTrader = closest;
                  } else {
                      encTraderAlt = closest;
                  }
              }
      
              if (traders['manufactured']) {
                  let closest = this.systems.closestDestination(traders['manufactured'], manTrader ? manTrader : manTraderAlt, scDistance);
                  if (closest['station']['distanceToArrival'] < scDistance) {
                      manTrader = closest;
                  } else {
                      manTraderAlt = closest;
                  }
              }
      
              if (rawTrader != undefined && encTrader != undefined && manTrader != undefined) {
                  break;
              }
          }
          let outcome = {'raw': rawTrader ? rawTrader : rawTraderAlt, 'encoded': encTrader ? encTrader : encTraderAlt, 'manufactured': manTrader ? manTrader : manTraderAlt}; 
          return outcome;
    }

    async interstellarFactors (systemName, radius, scDistance) {
        let sys = await this.system(systemName);
        let ifactorsPrime = undefined;
        let ifactorsAlt = undefined;
        let ifactorsLPPrime = undefined;
        let ifactorsLPAlt = undefined;
      
        if (sys == undefined) return undefined;
        
        sys['distance'] = 0;
        let ifactors = await this.systems.ifactorsInSystem(sys);
        if (ifactors && ifactors['overall'] && ifactors['overall']['station']) {
            if (ifactors['overall']['station']['distanceToArrival'] <= scDistance) {
              ifactorsPrime = ifactors['overall'];
            } else {
              ifactorsAlt = ifactors['overall'];
            }
        }
        
        if (ifactors && ifactors['withLargeLandingPads'] && ifactors['withLargeLandingPads']['station']) {
            if (ifactors['withLargeLandingPads']['station']['distanceToArrival'] <= scDistance) {
              ifactorsLPPrime = ifactors['withLargeLandingPads'];
            } else {
              ifactorsLPAlt = ifactors['withLargeLandingPads'];
            }
        }
      
        if (ifactorsPrime != undefined && ifactorsLPPrime != undefined) {
            return {'overall': ifactorsPrime, 'withLargeLandingPads': ifactorsLPPrime};
        }
      
        let sortedSystems = await this.systemsWithinRadius(systemName, radius);
        
          for (var id in sortedSystems) {
              let system = sortedSystems[id];
              if (system['requirePermit']) {
                  continue;
              }
              let info = system['information'];
              let ifactors = await this.systems.ifactorsInSystem(system);
              if (ifactors && ifactors['overall']) {
                  let closest = this.systems.closestDestination(ifactors['overall'], ifactorsPrime ? ifactorsPrime : ifactorsAlt, scDistance);
                  if (closest['station']['distanceToArrival'] < scDistance) {
                     ifactorsPrime = closest;
                  } else {
                     ifactorsAlt = closest;
                  }
              }
            
              if (ifactors && ifactors['withLargeLandingPads']) {
                  let closest = this.systems.closestDestination(ifactors['withLargeLandingPads'], ifactorsLPPrime ? ifactorsLPPrime : ifactorsLPAlt, scDistance);
                  if (closest['station']['distanceToArrival'] < scDistance) {
                     ifactorsLPPrime = closest;
                  } else {
                     ifactorsLPAlt = closest;
                  }
              }
      
              if (ifactorsPrime != undefined && ifactorsLPPrime != undefined) {
                  break;
              }
          }
          let outcome = {'overall': ifactorsPrime ? ifactorsPrime : ifactorsAlt, 'withLargeLandingPads': ifactorsLPPrime ? ifactorsLPPrime : ifactorsLPAlt};
          return outcome;
    }

    async systemsWithinRadius (systemName, radius) {
        let cached = this.sysRadCache.get(`${systemName}@${radius}`);
        if (cached) {
          let delta = Date.now() - cached["timestamp"];
          if (delta < process.env.SYSTEM_MAX_AGE) {
            return cached['response'];
          }
        }
      
        var options = {
          url: process.env.EDSM_SPHERE,
          method: 'GET',
          json: true,
          resolveWithFullResponse: true,
          simple: false,
          qs: {"systemName": systemName, 'radius': radius, 'showInformation': 1, 'showId': 1, 'showPermit': 1}
        };
      
        let response = await request(options);
      
        if (response.statusCode != 200) {
              return false;
        }
      
        let sortedSystems = response.body.sort(systems.compareSystems);
      
        this.sysRadCache.set(`${systemName}@${radius}`, {"date": new Date(), "response": sortedSystems, "timestamp": Date.now()});
        caching.write(process.env.SYSTEMS_RADIUS_CACHE, this.sysRadCache);
        return sortedSystems;
    }

    async distance(srcSys, dstSys) {
        let src = await this.system(srcSys);
        if (src == false) {
            return undefined;
        }
            
        let dst = await this.system(dstSys);
        if (dst == false) {
            return undefined;
        }
    
        return utils.distance(src["coords"], dst["coords"]);
    }
}