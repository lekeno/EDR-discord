const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with pong!"),
  async execute(interaction) {
    if (!interaction.client.edrbot.preflight(interaction)) {
      await interaction.reply("Nope.");
      return;
    }

    let d100 = Math.random() * 100;
    if (d100 > 95) {
      await interaction.reply(":purple_circle::snake:");
    } else if (d100 >= 90) {
      await interaction.reply(":ping_pong:");
    } else {
      await interaction.reply("pong!");
    }
  }
};