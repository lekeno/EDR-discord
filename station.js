"use strict";

module.exports = class Station {

    constructor (info) {
        this.info = info;
    }

    hasLargeLandingPads () {
        return ['coriolis starport', 'ocellus starport', 'orbis starport', 'planetary port', 'asteroid base', 'mega ship'].includes(this.info['type'].toLowerCase()); 
    }

    hasShipyard () {
        return this.info['haveShipyard'];
    }

    hasService(service) {
        if (!service) return false;
        return (!this.info['otherServices'] || !this.info['otherServices'].includes(service));
    }

    distanceToArrival() {
        return this.info['distanceToArrival'];
    }
}