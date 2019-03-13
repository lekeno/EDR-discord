'use strict';

module.exports = {
    newguild: function (guild) {
        if (!guild) return;
        let info = `Owner: ${guild.owner? guild.owner.displayName : 'N/A'}`;
        
        let channels = guild.channels || [];
        info += "\nChannels: ";
        for (var [key, channel] of channels) {
            if (!channel.name) continue;
            info += `${channel.name} `;
        }
        
        info += `\nMembers: ${guild.memberCount}; `;
        let members = guild.members || [];
        for (var [key, member] of members) {
            info += `${member.displayName} `;
        }

        let message = `New Guild ${guild.name}/${guild.id}:\n${info}`;
        let payload = {content: message.trunc(2000)};
        var options = {
            url: process.env.AUDIT_ENDPOINT,
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