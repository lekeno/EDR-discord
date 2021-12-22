module.exports = {
    name: "guildCreate",
    once: false,
    execute(guild) {
      console.log("guild create");
      guild.client.edrbot.join(guild);
    }
  };