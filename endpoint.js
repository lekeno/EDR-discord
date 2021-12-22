'use strict';
const request = require("request-promise");

module.exports = {
    send: function (message, endpoint) {
        let payload = {content: message.trunc(2000)};
        var options = {
            url: endpoint,
            method: 'POST',
            json: true,
            resolveWithFullResponse: true,
            body: payload,
            simple: false
        };

        request(options).then(response => {
            return true;
        });
    }
}

String.prototype.trunc = String.prototype.trunc || function(n){
    return (this.length > n) ? this.substr(0, n-1) + '…' : this;
};