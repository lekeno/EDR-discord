const activities = require("../activities");

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    client.edrbot.init(client.guilds || []);
    let activity = activities.random();
    client.user.setActivity(activity["name"], { type: activity["type"] });
  }
};