'use strict';
const discord = require("discord.js");
const edrbot = require("./edrbot");
const keepalive = require("./keepalive.js");
const activities = require("./activities");

const client = new discord.Client();
const bot = new edrbot();
const app = new keepalive();

app.setup();

client.on("ready", () => {
  bot.init(client.guilds || []);
  let activity = activities.random();
  client.user.setActivity(activity["name"], { type: activity["type"]});
});

client.on("guildCreate", (guild) => {
  bot.join(guild);
});

client.on("message", (message) => {
  bot.process(message);
});

client.login(process.env.TOKEN).catch(console.err);