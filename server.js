"use strict";
const discord = require("discord.js");
const fs = require("fs");

const { Client, Collection, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const edrbot = require("./edrbot");
client.edrbot = new edrbot();

client.commands = new Collection();
const commandFiles = fs
  .readdirSync("./commands")
  .filter(file => file.endsWith(".js"));

const localCommandFiles = fs
  .readdirSync("./commands/local")
  .filter(file => file.endsWith(".js"));


for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

for (const file of localCommandFiles) {
  const command = require(`./commands/local/${file}`);
  client.commands.set(command.data.name, command);
}

const eventFiles = fs
  .readdirSync("./events")
  .filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

const keepalive = require("./keepalive.js");
const app = new keepalive();
app.setup();

client.login(process.env.TOKEN);