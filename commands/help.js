const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription(
      "Contact info and instructions to make the most out of EDR."
    ),
  async execute(interaction) {
    if (!interaction.client.edrbot.preflight(interaction)) {
      await interaction.reply("Nope.");
      return;
    }

    await interaction.client.edrbot.help(interaction);
  }
};
