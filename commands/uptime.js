const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("uptime")
    .setDescription(
      "Replies with how long the bot has been running uninterrupted."
    ),
  async execute(interaction) {
    if (!interaction.client.edrbot.preflight(interaction)) {
      await interaction.reply("Nope.");
      return;
    }

    await interaction.client.edrbot.uptime(interaction);
  }
};