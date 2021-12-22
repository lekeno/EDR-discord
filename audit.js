"use strict";
const request = require("request-promise");
const endpoint = require("./endpoint");

module.exports = {
  newguild: async function(guild) {
    if (!guild) return;
    let owner = await guild.fetchOwner();
    let info = `Owner: ${owner ? owner.displayName : "N/A"} @ ${guild.ownerId}`;
    let infoLong = `Owner: ${owner ? owner.displayName : "N/A"} @ ${
      guild.ownerId
    }`;

    let channels = (await guild.channels.fetch()) || [];
    info += "\nChannels: ";
    infoLong += "\nChannels: ";
    for (var [key, channel] of channels) {
      if (!channel.name) continue;
      info += `${channel.name} `;
      infoLong += `${channel.name} `;
    }

    info += `\nMembers: ${guild.memberCount}; `;
    infoLong += `\nMembers: ${guild.memberCount}; `;

    let message = `New Guild ${guild.name}/${guild.id}:\n${info}`;
    let messageLong = `New Guild ${guild.name}/${guild.id}:\n${infoLong}`;
    console.log(messageLong);
    endpoint.send(message, process.env.AUDIT_ENDPOINT);
  }
};
