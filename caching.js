'use strict';

const fs = require('fs');

module.exports = {
    read: function (cacheName, cache) {
        if (!sanityCheck(cacheName)) return;
        
        if(!fs.existsSync(__dirname+process.env.DATASTORE+cacheName)) {
            console.error(`File not found for ${cacheName}`);
            return
        }

        var data = fs.readFileSync(__dirname+process.env.DATASTORE+cacheName);
        if (data) {
            cache.load(JSON.parse(data));
            cache.prune();
        }
    },

    write: function (cacheName, cache) {
        if (!sanityCheck(cacheName)) return;
        
        let cachedump = cache.dump();      
        fs.writeFile(__dirname+process.env.DATASTORE+cacheName, JSON.stringify(cachedump), (err) => {
            if (err) { return console.error(err); }
            cache.prune();
        });
    }
}

function sanityCheck(cacheName) {
    return /^[a-z0-9]+$/i.test(cacheName);
}